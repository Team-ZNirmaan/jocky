/*
 * Custom ELF64 emitter (Implementation Plan §1.6 — companion to the PE emitter).
 *
 * Emits a structurally valid static ELF64 executable by hand. The layout keeps
 * code (R+X), read-only data (R), and writable data (R+W) in separate segments
 * so no page is ever simultaneously writable and executable (invariant 4), and
 * stamps a per-build .note.gnu.build-id derived from the build seed (S8/S2).
 */

#include "emitter/elf_emitter.h"
#include <cstring>

namespace {

uint64_t alignUp64(uint64_t v, uint64_t a) { return (v + a - 1) & ~(a - 1); }

void appendBytes(std::vector<uint8_t>& out, const void* p, size_t n) {
    const uint8_t* b = static_cast<const uint8_t*>(p);
    out.insert(out.end(), b, b + n);
}

// splitmix64 — deterministic build-id bytes from the seed.
void deriveBuildId(uint64_t seed, uint8_t out[20]) {
    uint64_t x = seed + 0x9E3779B97F4A7C15ULL;
    for (int i = 0; i < 20; i += 8) {
        x += 0x9E3779B97F4A7C15ULL;
        uint64_t z = x;
        z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
        z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
        z = z ^ (z >> 31);
        std::memcpy(out + i, &z, (20 - i) < 8 ? (20 - i) : 8);
    }
}

constexpr uint32_t SHT_NULL = 0, SHT_PROGBITS = 1, SHT_STRTAB = 3, SHT_NOTE = 7;
constexpr uint64_t SHF_WRITE = 1, SHF_ALLOC = 2, SHF_EXECINSTR = 4;

} // namespace

ELFEmitter::ELFEmitter(uint64_t seed) : seed_(seed) {}

void ELFEmitter::setTextSection(const std::vector<uint8_t>& code)   { text_ = code; }
void ELFEmitter::setRdataSection(const std::vector<uint8_t>& rodata) { rdata_ = rodata; }
void ELFEmitter::setDataSection(const std::vector<uint8_t>& data)   { data_ = data; }
void ELFEmitter::setEntryPoint(uint64_t text_offset)                { entry_off_ = text_offset; }

std::vector<uint8_t> ELFEmitter::emit() {
    // ── Build the build-id note ────────────────────────────────────
    uint8_t bid[20];
    deriveBuildId(seed_, bid);
    const uint32_t namesz = 4;    // "GNU\0"
    const uint32_t descsz = 20;
    Elf64_Nhdr nhdr{namesz, descsz, 3 /*NT_GNU_BUILD_ID*/};
    std::vector<uint8_t> note;
    appendBytes(note, &nhdr, sizeof(nhdr));
    appendBytes(note, "GNU\0", 4);
    appendBytes(note, bid, 20);
    while (note.size() % 4) note.push_back(0);   // 4-byte align

    // ── Compute the file layout ────────────────────────────────────
    const uint16_t phnum = 4;                      // 3x PT_LOAD + PT_GNU_STACK
    const uint64_t ehdr_size = sizeof(Elf64_Ehdr);
    const uint64_t phdr_size = sizeof(Elf64_Phdr);
    const uint64_t shdr_size = sizeof(Elf64_Shdr);

    const uint64_t text_off  = PAGE;               // headers occupy [0, PAGE)
    const uint64_t text_addr = BASE_VADDR + text_off;
    const uint64_t rdata_off = alignUp64(text_off + text_.size(), PAGE);
    const uint64_t rdata_addr = BASE_VADDR + rdata_off;
    const uint64_t data_off  = alignUp64(rdata_off + note.size() + rdata_.size(), PAGE);
    const uint64_t data_addr = BASE_VADDR + data_off;

    const uint64_t rodata_note_off = rdata_off;
    const uint64_t rodata_off = alignUp64(rdata_off + note.size(), 8);
    const uint64_t rodata_size = rdata_.size();

    const uint64_t shstr_off = data_off + data_.size();
    const char shstr[] = "\0.text\0.note.gnu.build-id\0.rodata\0.data\0.shstrtab\0";
    const uint32_t shstr_size = sizeof(shstr);
    const uint64_t shoff = alignUp64(shstr_off + shstr_size, 8);

    // Section name offsets within shstrtab
    const uint32_t name_text  = 1;
    const uint32_t name_note  = 1 + 6;    // after ".text\0"
    const uint32_t name_rodata = name_note + 19; // strlen(".note.gnu.build-id")+1
    const uint32_t name_data  = name_rodata + 8; // after ".rodata\0"
    const uint32_t name_shstr = name_data + 6;   // after ".data\0"

    const uint16_t shnum = 6;
    const uint16_t shstrndx = 5;

    std::vector<uint8_t> out;
    out.reserve(shoff + shnum * shdr_size);

    // ── ELF header ─────────────────────────────────────────────────
    Elf64_Ehdr eh{};
    eh.e_ident[0] = 0x7F; eh.e_ident[1] = 'E'; eh.e_ident[2] = 'L'; eh.e_ident[3] = 'F';
    eh.e_ident[4] = 2;   // ELFCLASS64
    eh.e_ident[5] = 1;   // ELFDATA2LSB
    eh.e_ident[6] = 1;   // EV_CURRENT
    eh.e_ident[7] = 0;   // ELFOSABI_SYSV
    eh.e_type = 2;       // ET_EXEC
    eh.e_machine = 0x3E; // EM_X86_64
    eh.e_version = 1;
    eh.e_entry = text_addr + entry_off_;
    eh.e_phoff = ehdr_size;
    eh.e_shoff = shoff;
    eh.e_flags = 0;
    eh.e_ehsize = ehdr_size;
    eh.e_phentsize = phdr_size;
    eh.e_phnum = phnum;
    eh.e_shentsize = shdr_size;
    eh.e_shnum = shnum;
    eh.e_shstrndx = shstrndx;
    appendBytes(out, &eh, sizeof(eh));

    // ── Program headers ────────────────────────────────────────────
    auto putPhdr = [&](uint32_t type, uint32_t flags, uint64_t off,
                       uint64_t vaddr, uint64_t filesz, uint64_t memsz) {
        Elf64_Phdr ph{};
        ph.p_type = type;
        ph.p_flags = flags;
        ph.p_offset = off;
        ph.p_vaddr = vaddr;
        ph.p_paddr = vaddr;
        ph.p_filesz = filesz;
        ph.p_memsz = memsz;
        ph.p_align = PAGE;
        appendBytes(out, &ph, sizeof(ph));
    };

    const uint64_t text_seg_end = text_off + text_.size();      // headers + text
    putPhdr(1, 4 | 1, 0, BASE_VADDR, text_seg_end, text_seg_end);          // R+X
    putPhdr(1, 4, rdata_off, rdata_addr,                                // R
            note.size() + rdata_.size(), note.size() + rdata_.size());
    putPhdr(1, 4 | 2, data_off, data_addr, data_.size(), data_.size());    // R+W
    putPhdr(0x6474E551, 4 | 2, 0, 0, 0, 0);                                // GNU_STACK RW

    // ── Section data ───────────────────────────────────────────────
    while (out.size() < text_off) out.push_back(0);
    appendBytes(out, text_.data(), text_.size());

    while (out.size() < rodata_note_off) out.push_back(0);
    out.insert(out.end(), note.begin(), note.end());
    while (out.size() < rodata_off) out.push_back(0);
    appendBytes(out, rdata_.data(), rdata_.size());

    while (out.size() < data_off) out.push_back(0);
    appendBytes(out, data_.data(), data_.size());

    while (out.size() < shstr_off) out.push_back(0);
    appendBytes(out, shstr, shstr_size);

    while (out.size() < shoff) out.push_back(0);

    // ── Section headers ────────────────────────────────────────────
    auto putShdr = [&](uint32_t name, uint32_t type, uint64_t flags,
                       uint64_t addr, uint64_t off, uint64_t size,
                       uint64_t addralign) {
        Elf64_Shdr sh{};
        sh.sh_name = name;
        sh.sh_type = type;
        sh.sh_flags = flags;
        sh.sh_addr = addr;
        sh.sh_offset = off;
        sh.sh_size = size;
        sh.sh_link = 0;
        sh.sh_info = 0;
        sh.sh_addralign = addralign;
        sh.sh_entsize = 0;
        appendBytes(out, &sh, sizeof(sh));
    };

    putShdr(0, SHT_NULL, 0, 0, 0, 0, 0);                                        // NULL
    putShdr(name_text, SHT_PROGBITS, SHF_ALLOC | SHF_EXECINSTR,
            text_addr, text_off, text_.size(), 16);
    putShdr(name_note, SHT_NOTE, SHF_ALLOC,
            rdata_addr, rodata_note_off, note.size(), 4);
    putShdr(name_rodata, SHT_PROGBITS, SHF_ALLOC,
            rdata_addr + (rodata_off - rdata_off), rodata_off, rodata_size, 1);
    putShdr(name_data, SHT_PROGBITS, SHF_ALLOC | SHF_WRITE,
            data_addr, data_off, data_.size(), 16);
    putShdr(name_shstr, SHT_STRTAB, 0, 0, shstr_off, shstr_size, 1);

    return out;
}
