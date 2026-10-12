#pragma once
#include <cstdint>
#include <vector>
#include <string>

// ── ELF64 structures (x86-64) ──────────────────────────────────────
// Defined manually so no <elf.h> is required; mirrors the PE emitter shape.

#pragma pack(push, 1)

struct Elf64_Ehdr {
    uint8_t  e_ident[16];
    uint16_t e_type;       // ET_EXEC = 2
    uint16_t e_machine;    // EM_X86_64 = 0x3E
    uint32_t e_version;    // 1
    uint64_t e_entry;
    uint64_t e_phoff;
    uint64_t e_shoff;
    uint32_t e_flags;
    uint16_t e_ehsize;     // 64
    uint16_t e_phentsize;  // 56
    uint16_t e_phnum;
    uint16_t e_shentsize;  // 64
    uint16_t e_shnum;
    uint16_t e_shstrndx;
};

struct Elf64_Phdr {
    uint32_t p_type;       // PT_LOAD = 1, PT_GNU_STACK = 0x6474E551
    uint32_t p_flags;      // PF_X = 1, PF_W = 2, PF_R = 4
    uint64_t p_offset;
    uint64_t p_vaddr;
    uint64_t p_paddr;
    uint64_t p_filesz;
    uint64_t p_memsz;
    uint64_t p_align;
};

struct Elf64_Shdr {
    uint32_t sh_name;
    uint32_t sh_type;      // SHT_PROGBITS = 1, SHT_STRTAB = 3, SHT_NOTE = 7
    uint64_t sh_flags;     // SHF_ALLOC = 2, SHF_EXECINSTR = 4, SHF_WRITE = 1
    uint64_t sh_addr;
    uint64_t sh_offset;
    uint64_t sh_size;
    uint32_t sh_link;
    uint32_t sh_info;
    uint64_t sh_addralign;
    uint64_t sh_entsize;
};

struct Elf64_Nhdr {
    uint32_t n_namesz;
    uint32_t n_descsz;
    uint32_t n_type;       // NT_GNU_BUILD_ID = 3
};

#pragma pack(pop)

// ── ELF Emitter ────────────────────────────────────────────────────
// Emits a static ELF64 executable: separate R+X, R, and R+W segments
// (no page is ever W+X) and a per-build .note.gnu.build-id.
class ELFEmitter {
public:
    explicit ELFEmitter(uint64_t seed);

    // Set section data
    void setTextSection(const std::vector<uint8_t>& code);
    void setRdataSection(const std::vector<uint8_t>& rodata);
    void setDataSection(const std::vector<uint8_t>& data);
    void setEntryPoint(uint64_t text_offset);   // offset within .text

    // Emit the complete ELF file
    std::vector<uint8_t> emit();

private:
    uint64_t seed_;

    // Section data
    std::vector<uint8_t> text_;
    std::vector<uint8_t> rdata_;
    std::vector<uint8_t> data_;
    uint64_t entry_off_ = 0;

    static constexpr uint64_t BASE_VADDR = 0x400000;
    static constexpr uint64_t PAGE       = 0x1000;
};
