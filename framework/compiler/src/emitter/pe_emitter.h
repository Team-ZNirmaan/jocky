#pragma once
#include <cstdint>
#include <vector>
#include <string>

// ── PE32+ structures (x86-64) ──────────────────────────────────────
// These are defined manually to avoid Windows.h dependency on Linux.

#pragma pack(push, 1)

struct DosHeader {
    uint16_t e_magic;      // 'MZ' = 0x5A4D
    uint16_t e_cblp;
    uint16_t e_cp;
    uint16_t e_crlc;
    uint16_t e_cparhdr;
    uint16_t e_minalloc;
    uint16_t e_maxalloc;
    uint16_t e_ss;
    uint16_t e_sp;
    uint16_t e_csum;
    uint16_t e_ip;
    uint16_t e_cs;
    uint16_t e_lfarlc;
    uint16_t e_ovno;
    uint16_t e_res[4];
    uint16_t e_oemid;
    uint16_t e_oeminfo;
    uint16_t e_res2[10];
    int32_t  e_lfanew;     // Offset to PE signature
};

struct CoffHeader {
    uint16_t machine;              // 0x8664 for x86-64
    uint16_t numberOfSections;
    uint32_t timeDateStamp;
    uint32_t pointerToSymbolTable;
    uint32_t numberOfSymbols;
    uint16_t sizeOfOptionalHeader;
    uint16_t characteristics;
};

struct OptionalHeader64 {
    uint16_t magic;                // 0x20B for PE32+
    uint8_t  majorLinkerVersion;
    uint8_t  minorLinkerVersion;
    uint32_t sizeOfCode;
    uint32_t sizeOfInitializedData;
    uint32_t sizeOfUninitializedData;
    uint32_t addressOfEntryPoint;
    uint32_t baseOfCode;
    uint64_t imageBase;
    uint32_t sectionAlignment;
    uint32_t fileAlignment;
    uint16_t majorOperatingSystemVersion;
    uint16_t minorOperatingSystemVersion;
    uint16_t majorImageVersion;
    uint16_t minorImageVersion;
    uint16_t majorSubsystemVersion;
    uint16_t minorSubsystemVersion;
    uint32_t win32VersionValue;
    uint32_t sizeOfImage;
    uint32_t sizeOfHeaders;
    uint32_t checkSum;
    uint16_t subsystem;
    uint16_t dllCharacteristics;
    uint64_t sizeOfStackReserve;
    uint64_t sizeOfStackCommit;
    uint64_t sizeOfHeapReserve;
    uint64_t sizeOfHeapCommit;
    uint32_t loaderFlags;
    uint32_t numberOfRvaAndSizes;
    // Data directories follow...
};

struct DataDirectory {
    uint32_t virtualAddress;
    uint32_t size;
};

struct SectionHeader {
    char     name[8];
    uint32_t virtualSize;
    uint32_t virtualAddress;
    uint32_t sizeOfRawData;
    uint32_t pointerToRawData;
    uint32_t pointerToRelocations;
    uint32_t pointerToLinenumbers;
    uint16_t numberOfRelocations;
    uint16_t numberOfLinenumbers;
    uint32_t characteristics;
};

// ── Rich header structures ─────────────────────────────────────────
struct RichEntry {
    uint16_t build_id;   // comp.id minor version
    uint16_t prod_id;    // comp.id major (product type)
    uint32_t count;      // number of objects compiled with this tool
};

#pragma pack(pop)

// ── Toolchain profile ──────────────────────────────────────────────
// Defines what the PE should look like for a given "pretend" toolchain.
struct ToolchainProfile {
    const char* name;                  // e.g., "msvc-14.38"
    uint8_t  majorLinkerVersion;       // e.g., 14
    uint8_t  minorLinkerVersion;       // e.g., 38
    uint32_t timestampBase;            // Base timestamp for range
    uint32_t timestampRange;           // Random offset up to this value
    std::vector<RichEntry> rich_entries;
};

// ── PE Emitter ─────────────────────────────────────────────────────
class PEEmitter {
public:
    PEEmitter(const ToolchainProfile& profile, uint64_t seed);

    // Set section data
    void setTextSection(const std::vector<uint8_t>& code);
    void setRdataSection(const std::vector<uint8_t>& rodata);
    void setDataSection(const std::vector<uint8_t>& data);
    void setEntryPoint(uint32_t rva);

    // Emit the complete PE file
    std::vector<uint8_t> emit();

private:
    void buildDosHeader(std::vector<uint8_t>& out);
    void buildRichHeader(std::vector<uint8_t>& out);
    void buildPEHeaders(std::vector<uint8_t>& out);
    void buildSections(std::vector<uint8_t>& out);

    uint32_t align(uint32_t val, uint32_t alignment);

    ToolchainProfile profile_;
    uint64_t seed_;

    // Section data
    std::vector<uint8_t> text_;
    std::vector<uint8_t> rdata_;
    std::vector<uint8_t> data_;
    uint32_t entry_rva_ = 0;

    // Computed layout
    static constexpr uint32_t FILE_ALIGNMENT    = 0x200;
    static constexpr uint32_t SECTION_ALIGNMENT = 0x1000;
    static constexpr uint64_t IMAGE_BASE        = 0x140000000ULL;
};
