/*
 * jrt-core: Minimal NT type definitions.
 *
 * These mirror the small subset of <winternl.h>/<ntddk.h> that the indirect
 * syscall layer needs, so the runtime compiles on Linux hosts without
 * pulling in any Windows SDK headers.
 */
#ifndef JRT_SYSCALL_DEFS_H
#define JRT_SYSCALL_DEFS_H

#include <stdint.h>
#include <stddef.h>

typedef int32_t   NTSTATUS;
typedef uint32_t  ULONG;
typedef uint16_t  USHORT;
typedef uint8_t   UCHAR;
typedef uint8_t   BOOLEAN;
typedef void*     HANDLE;
typedef void*     PVOID;
typedef const void* PCVOID;
typedef uint64_t  ULONG_PTR;
typedef int64_t   LONG_PTR;
typedef size_t    SIZE_T;

#define NT_SUCCESS(s)        ((NTSTATUS)(s) >= 0)
#define STATUS_SUCCESS       0x00000000L
#define STATUS_UNSUCCESSFUL  0xC0000001L

/* ── Essential NT structures (raw offsets are used by the syscall layer) ── */
typedef struct _UNICODE_STRING {
    USHORT Length;
    USHORT MaximumLength;
    uint16_t* Buffer;
} UNICODE_STRING, *PUNICODE_STRING;

typedef struct _STRING {
    USHORT Length;
    USHORT MaximumLength;
    char*  Buffer;
} STRING, *PSTRING;

typedef struct _LIST_ENTRY {
    struct _LIST_ENTRY* Flink;
    struct _LIST_ENTRY* Blink;
} LIST_ENTRY, *PLIST_ENTRY;

typedef struct _LDR_DATA_TABLE_ENTRY {
    LIST_ENTRY InLoadOrderLinks;        /* +0x00 */
    LIST_ENTRY InMemoryOrderLinks;      /* +0x10 */
    LIST_ENTRY InInitializationOrderLinks;
    PVOID      DllBase;                 /* +0x30 on x64 from entry start */
    PVOID      EntryPoint;
    ULONG      SizeOfImage;
    UNICODE_STRING FullDllName;
    UNICODE_STRING BaseDllName;
} LDR_DATA_TABLE_ENTRY, *PLDR_DATA_TABLE_ENTRY;

typedef struct _PEB_LDR_DATA {
    ULONG      Length;
    BOOLEAN    Initialized;
    PVOID      SsHandle;
    LIST_ENTRY InLoadOrderModuleList;       /* +0x10 */
    LIST_ENTRY InMemoryOrderModuleList;     /* +0x20 */
    LIST_ENTRY InInitializationOrderModuleList;
} PEB_LDR_DATA, *PPEB_LDR_DATA;

typedef struct _PEB {
    BOOLEAN         InheritedAddressSpace;      /* +0x000 */
    BOOLEAN         ReadImageFileExecOptions;   /* +0x001 */
    BOOLEAN         BeingDebugged;              /* +0x002 */
    BOOLEAN         SpareBool;                  /* +0x003 */
    uint32_t        Padding0;                   /* +0x004 */
    HANDLE          Mutant;                     /* +0x008 */
    PVOID           ImageBaseAddress;           /* +0x010 */
    PPEB_LDR_DATA   Ldr;                        /* +0x018 */
    PVOID           ProcessParameters;          /* +0x020 */
    /* ... remaining fields not needed by the syscall layer ... */
} PEB, *PPEB;

/* ── Memory protection / allocation constants ─────────────────────── */
#define JRT_MEM_COMMIT            0x00001000
#define JRT_MEM_RESERVE           0x00002000
#define JRT_MEM_RELEASE           0x00008000
#define JRT_PAGE_NOACCESS         0x01
#define JRT_PAGE_READONLY         0x02
#define JRT_PAGE_READWRITE        0x04
#define JRT_PAGE_EXECUTE          0x10
#define JRT_PAGE_EXECUTE_READ     0x20
#define JRT_PAGE_EXECUTE_READWRITE 0x40

#endif /* JRT_SYSCALL_DEFS_H */
