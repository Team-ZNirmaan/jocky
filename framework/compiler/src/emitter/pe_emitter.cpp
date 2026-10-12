/*
 * Custom PE32+ emitter (Implementation Plan §1.6).
 *
 * Builds a structurally valid PE64 image by hand — no lld, no Windows.h.
 * The import directory is left empty (all imports resolve at runtime via the
 * PEB walk), and a forged Rich header + linker version are stamped from the
 * selected ToolchainProfile so the artifact resembles a given toolchain.
 */

#include "emitter/pe_emitter.h"
#include <cstring>

// ── Layout helper ──────────────────────────────────────────────────
namespace {

struct SecLayout {
    uint32_t vsize;
    uint32_t vaddr;
    uint32_t rawsize;
    uint32_t rawoff;
};

struct Layout {
    uint32_t pe_off;
    uint32_t size_of_headers;
    SecLayout text, rdata, data;
    uint32_t size_of_image;
    uint32_t entry_point;
};

uint32_t alignUp(uint32_t val, uint32_t a) { return (val + a - 1) & ~(a - 1); }

uint32_t richSize(const ToolchainProfile& p) {
    // "DanS" + 3 zero dwords + 8*N entries + "Rich" + 4-byte key
    return 16 + static_cast<uint32_t>(p.rich_entries.size()) * 8 + 8;
}

uint32_t peOffset(const ToolchainProfile& p) {
    // DOS header (64) + DOS stub (64) + Rich header, 8-byte aligned
    return alignUp(64 + 64 + richSize(p), 8);
}

Layout computeLayout(const PEEmitter& /*unused*/, const ToolchainProfile& p,
                     uint32_t text_size, uint32_t rdata_size, uint32_t data_size,
                     uint32_t entry_rva, uint32_t file_align, uint32_t sec_align) {
    Layout L{};
    L.pe_off = peOffset(p);

    const uint32_t num_sections = 3;
    const uint32_t opt_hdr_size = sizeof(OptionalHeader64) + 16 * sizeof(DataDirectory);
    L.size_of_headers = alignUp(L.pe_off + 4 + sizeof(CoffHeader) + opt_hdr_size
                                + num_sections * sizeof(SectionHeader), file_align);

    auto vsize   = [&](uint32_t raw) { return raw ? raw : 1; };
    auto rawsize = [&](uint32_t raw) { return alignUp(vsize(raw), file_align); };

    L.text.vsize = vsize(text_size);
    L.text.rawsize = rawsize(text_size);
    L.rdata.vsize = vsize(rdata_size);
    L.rdata.rawsize = rawsize(rdata_size);
    L.data.vsize = vsize(data_size);
    L.data.rawsize = rawsize(data_size);

    L.text.rawoff = L.size_of_headers;
    L.rdata.rawoff = L.text.rawoff + L.text.rawsize;
    L.data.rawoff = L.rdata.rawoff + L.rdata.rawsize;

    L.text.vaddr = sec_align;
    L.rdata.vaddr = alignUp(L.text.vaddr + alignUp(L.text.vsize, sec_align), sec_align);
    L.data.vaddr = alignUp(L.rdata.vaddr + alignUp(L.rdata.vsize, sec_align), sec_align);

    L.size_of_image = alignUp(L.data.vaddr + alignUp(L.data.vsize, sec_align), sec_align);
    L.entry_point = L.text.vaddr + entry_rva;
    return L;
}

void appendBytes(std::vector<uint8_t>& out, const void* p, size_t n) {
    const uint8_t* b = static_cast<const uint8_t*>(p);
    out.insert(out.end(), b, b + n);
}

} // namespace

PEEmitter::PEEmitter(const ToolchainProfile& profile, uint64_t seed)
    : profile_(profile), seed_(seed) {}

void PEEmitter::setTextSection(const std::vector<uint8_t>& code)  { text_ = code; }
void PEEmitter::setRdataSection(const std::vector<uint8_t>& rodata){ rdata_ = rodata; }
void PEEmitter::setDataSection(const std::vector<uint8_t>& data)  { data_ = data; }
void PEEmitter::setEntryPoint(uint32_t rva)                       { entry_rva_ = rva; }

uint32_t PEEmitter::align(uint32_t val, uint32_t alignment) {
    return (val + alignment - 1) & ~(alignment - 1);
}

std::vector<uint8_t> PEEmitter::emit() {
    std::vector<uint8_t> out;
    out.reserve(4096);

    buildDosHeader(out);
    buildRichHeader(out);
    buildPEHeaders(out);
    buildSections(out);

    return out;
}

void PEEmitter::buildDosHeader(std::vector<uint8_t>& out) {
    DosHeader dos{};
    dos.e_magic = 0x5A4D;                 // 'MZ'
    dos.e_cblp = 0x0090;
    dos.e_cp = 0x0003;
    dos.e_cparhdr = 0x0004;
    dos.e_maxalloc = 0xFFFF;
    dos.e_sp = 0x00B8;
    dos.e_lfarlc = 0x0040;
    dos.e_lfanew = static_cast<int32_t>(peOffset(profile_));
    appendBytes(out, &dos, sizeof(dos));

    // 64-byte DOS stub: the classic "This program cannot be run in DOS mode".
    static const char stub_msg[] =
        "\x0E\x1F\xBA\x0E\x00\xB4\x09\xCD\x21\xB8\x01\x4C\xCD\x21"
        "This program cannot be run in DOS mode.\r\r\n$";
    const size_t stub_len = sizeof(stub_msg) - 1;   // drop the terminating NUL
    std::vector<uint8_t> stub(64, 0);
    std::memcpy(stub.data(), stub_msg, stub_len < 64 ? stub_len : 64);
    appendBytes(out, stub.data(), stub.size());
}

void PEEmitter::buildRichHeader(std::vector<uint8_t>& out) {
    // The Rich header is stored XOR-encoded with a 32-bit key. The structure:
    //   "DanS"^key, 3x(0^key), N x {comp_id^key, count^key}, "Rich", key
    const uint32_t key = static_cast<uint32_t>(seed_) ^ 0x5A4D4F43u;
    auto put32 = [&](uint32_t v) { appendBytes(out, &v, 4); };

    put32(0x536E6144u ^ key);   // "DanS" ^ key
    put32(0u ^ key);
    put32(0u ^ key);
    put32(0u ^ key);

    for (const auto& e : profile_.rich_entries) {
        uint32_t comp_id = (static_cast<uint32_t>(e.prod_id) << 16) | e.build_id;
        put32(comp_id ^ key);
        put32(e.count ^ key);
    }

    put32(0x68636952u);          // "Rich"
    put32(key);

    // Pad up to the PE header offset.
    const uint32_t cur = static_cast<uint32_t>(out.size());
    const uint32_t target = peOffset(profile_);
    while (out.size() < target) out.push_back(0);
    (void)cur;
}

void PEEmitter::buildPEHeaders(std::vector<uint8_t>& out) {
    Layout L = computeLayout(*this, profile_,
                             static_cast<uint32_t>(text_.size()),
                             static_cast<uint32_t>(rdata_.size()),
                             static_cast<uint32_t>(data_.size()),
                             entry_rva_, FILE_ALIGNMENT, SECTION_ALIGNMENT);

    // ── PE signature ───────────────────────────────────────────────
    const uint32_t sig = 0x00004550;   // "PE\0\0"
    appendBytes(out, &sig, 4);

    // ── COFF header ────────────────────────────────────────────────
    CoffHeader coff{};
    coff.machine = 0x8664;             // AMD64
    coff.numberOfSections = 3;
    coff.timeDateStamp = profile_.timestampBase + (profile_.timestampRange
                          ? static_cast<uint32_t>(seed_ % profile_.timestampRange) : 0);
    coff.pointerToSymbolTable = 0;
    coff.numberOfSymbols = 0;
    coff.sizeOfOptionalHeader = sizeof(OptionalHeader64) + 16 * sizeof(DataDirectory);
    coff.characteristics = 0x0022;     // EXECUTABLE_IMAGE | LARGE_ADDRESS_AWARE
    appendBytes(out, &coff, sizeof(coff));

    // ── Optional header (PE32+) ────────────────────────────────────
    OptionalHeader64 opt{};
    opt.magic = 0x20B;                 // PE32+
    opt.majorLinkerVersion = profile_.majorLinkerVersion;
    opt.minorLinkerVersion = profile_.minorLinkerVersion;
    opt.sizeOfCode = L.text.rawsize;
    opt.sizeOfInitializedData = L.rdata.rawsize + L.data.rawsize;
    opt.sizeOfUninitializedData = 0;
    opt.addressOfEntryPoint = L.entry_point;
    opt.baseOfCode = L.text.vaddr;
    opt.imageBase = IMAGE_BASE;
    opt.sectionAlignment = SECTION_ALIGNMENT;
    opt.fileAlignment = FILE_ALIGNMENT;
    opt.majorOperatingSystemVersion = 6;
    opt.minorOperatingSystemVersion = 0;
    opt.majorImageVersion = 0;
    opt.minorImageVersion = 0;
    opt.majorSubsystemVersion = 6;
    opt.minorSubsystemVersion = 0;
    opt.win32VersionValue = 0;
    opt.sizeOfImage = L.size_of_image;
    opt.sizeOfHeaders = L.size_of_headers;
    opt.checkSum = 0;
    opt.subsystem = 2;                 // WINDOWS_GUI (entry point is WinMain)
    opt.dllCharacteristics = 0x8160;   // HIGH_ENTROPY_VA|DYNAMIC_BASE|NX_COMPAT|TS_AWARE
    opt.sizeOfStackReserve = 0x100000;
    opt.sizeOfStackCommit = 0x1000;
    opt.sizeOfHeapReserve = 0x100000;
    opt.sizeOfHeapCommit = 0x1000;
    opt.loaderFlags = 0;
    opt.numberOfRvaAndSizes = 16;
    appendBytes(out, &opt, sizeof(opt));

    // ── Data directories — all zero: empty import table (invariant 1) ─
    DataDirectory dd[16] = {};
    appendBytes(out, dd, sizeof(dd));

    // ── Section headers ────────────────────────────────────────────
    auto putSection = [&](const char* name, const SecLayout& s, uint32_t characteristics) {
        SectionHeader sh{};
        std::strncpy(sh.name, name, 8);
        sh.virtualSize = s.vsize;
        sh.virtualAddress = s.vaddr;
        sh.sizeOfRawData = s.rawsize;
        sh.pointerToRawData = s.rawoff;
        sh.pointerToRelocations = 0;
        sh.pointerToLinenumbers = 0;
        sh.numberOfRelocations = 0;
        sh.numberOfLinenumbers = 0;
        sh.characteristics = characteristics;
        appendBytes(out, &sh, sizeof(sh));
    };

    putSection(".text",  L.text,  0x60000020);  // CODE | EXECUTE | READ
    putSection(".rdata", L.rdata, 0x40000040);  // INITIALIZED_DATA | READ
    putSection(".data",  L.data,  0xC0000040);  // INITIALIZED_DATA | READ | WRITE

    // Pad headers to sizeOfHeaders.
    while (out.size() < L.size_of_headers) out.push_back(0);
}

void PEEmitter::buildSections(std::vector<uint8_t>& out) {
    Layout L = computeLayout(*this, profile_,
                             static_cast<uint32_t>(text_.size()),
                             static_cast<uint32_t>(rdata_.size()),
                             static_cast<uint32_t>(data_.size()),
                             entry_rva_, FILE_ALIGNMENT, SECTION_ALIGNMENT);

    auto putSectionData = [&](const SecLayout& s, const std::vector<uint8_t>& data) {
        while (out.size() < s.rawoff) out.push_back(0);
        out.insert(out.end(), data.begin(), data.end());
        while (out.size() < s.rawoff + s.rawsize) out.push_back(0);
    };

    putSectionData(L.text,  text_);
    putSectionData(L.rdata, rdata_);
    putSectionData(L.data,  data_);
}
