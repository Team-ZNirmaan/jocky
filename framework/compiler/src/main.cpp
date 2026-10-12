/*
 * jockyc — JOCKEY compiler driver (Implementation Plan §1.8).
 *
 * Pipeline:
 *   lex + parse (.jky)            → AST
 *   AST → JOCKY IR                → IRProgram   (with resolved opcode metadata)
 *   effect/privilege typecheck    → diagnostics
 *   JOCKY IR → LLVM IR            → llvm::Module
 *   LLVM backend (TargetMachine)  → relocatable object → section bytes
 *   custom PE64 / ELF64 emitter   → final artifact
 */

#include "parser/parser.h"
#include "ir/ir.h"
#include "typechecker/typechecker.h"
#include "lowering/lowering.h"
#include "emitter/pe_emitter.h"
#include "emitter/elf_emitter.h"

#include <llvm/Support/CommandLine.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/Support/TargetSelect.h>
#include <llvm/Support/MemoryBuffer.h>
#include <llvm/Support/Error.h>
#include <llvm/Support/CodeGen.h>
#include <llvm/MC/TargetRegistry.h>
#include <llvm/Target/TargetMachine.h>
#include <llvm/Target/TargetOptions.h>
#include <llvm/TargetParser/Triple.h>
#include <llvm/IR/LegacyPassManager.h>
#include <llvm/IR/Module.h>
#include <llvm/Object/ObjectFile.h>

#include <algorithm>
#include <cctype>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <optional>
#include <string>
#include <vector>

// selectProfile() is defined in emitter/profiles.cpp.
const ToolchainProfile& selectProfile(uint64_t seed);

// ── CLI options ────────────────────────────────────────────────────
static llvm::cl::opt<std::string> InputFile(
    llvm::cl::Positional,
    llvm::cl::desc("<input.jky>"),
    llvm::cl::Required
);

static llvm::cl::opt<std::string> Target(
    "target",
    llvm::cl::desc("Target platform: 'windows' or 'linux'"),
    llvm::cl::init("linux")
);

static llvm::cl::opt<std::string> Output(
    "output",
    llvm::cl::desc("Output file path"),
    llvm::cl::init("")
);

static llvm::cl::opt<std::string> Seed(
    "seed",
    llvm::cl::desc("Build seed (hex string, e.g. 'a1b2c3d4e5f6...')"),
    llvm::cl::init("")
);

static llvm::cl::opt<bool> Verbose(
    "verbose",
    llvm::cl::desc("Enable verbose output"),
    llvm::cl::init(false)
);

// ════════════════════════════════════════════════════════════════════
//  AST → JOCKY IR lowering
// ════════════════════════════════════════════════════════════════════
namespace {

// Canonical opcode name from the metadata table (ir.cpp).
const char* opcodeName(IROpcode op) {
    for (size_t i = 0; i < OPCODE_TABLE_SIZE; i++) {
        if (OPCODE_TABLE[i].opcode == op) return OPCODE_TABLE[i].name;
    }
    return "unknown";
}

// Copy privilege/effect/platform metadata onto an instruction.
void resolveMetadata(IRInstruction& inst) {
    for (size_t i = 0; i < OPCODE_TABLE_SIZE; i++) {
        if (OPCODE_TABLE[i].opcode == inst.opcode) {
            inst.min_priv = OPCODE_TABLE[i].min_priv;
            inst.effect   = OPCODE_TABLE[i].effect;
            inst.platform = OPCODE_TABLE[i].platform;
            return;
        }
    }
}

std::string toLower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return s;
}

// Map a `collect <target>` to its specific collection opcode.
IROpcode collectOpcodeFor(const std::string& target) {
    std::string t = toLower(target);
    if (t == "proc_meta" || t == "processes")        return IROpcode::IR_COLLECT_PROC_META;
    if (t == "service_enum" || t == "services")      return IROpcode::IR_COLLECT_SERVICE_ENUM;
    if (t == "network_connections" || t == "sockets")return IROpcode::IR_COLLECT_NETWORK_CONNECTIONS;
    if (t == "scheduled_tasks" || t == "tasks")      return IROpcode::IR_COLLECT_SCHEDULED_TASKS;
    if (t == "persistence")                          return IROpcode::IR_COLLECT_PERSISTENCE;
    if (t == "mft")                                  return IROpcode::IR_COLLECT_MFT;
    if (t == "usn")                                  return IROpcode::IR_COLLECT_USN;
    if (t == "evtlog" || t == "evtlog_parse")        return IROpcode::IR_COLLECT_EVTLOG;
    if (t == "prefetch")                             return IROpcode::IR_COLLECT_PREFETCH;
    if (t == "shimcache_amcache" || t == "shimcache" || t == "amcache" ||
        t == "srum")
                                                     return IROpcode::IR_COLLECT_SHIMCACHE_AMCACHE;
    if (t == "registry" || t == "hives")             return IROpcode::IR_COLLECT_REGISTRY;
    if (t == "network_capture" || t == "pcap")       return IROpcode::IR_COLLECT_NETWORK_CAPTURE;
    if (t == "memory" || t == "memory_scan")         return IROpcode::IR_COLLECT_MEMORY;
    if (t == "autoruns")                             return IROpcode::IR_COLLECT_AUTORUNS;
    return IROpcode::IR_COLLECT_PROC_META;   // default collection context
}

// VerbStmt → IRInstruction.
IRInstruction lowerVerb(const VerbStmt& v) {
    IRInstruction inst;
    inst.loc = v.loc;
    inst.target = v.target;
    inst.pos_args = v.pos_args;

    // filter(field == "value") is normalized by the parser into target=field
    // plus a single arg whose key is the operator ("==" / "!="). Reshape it
    // into the IR convention: named arg "op" + the value as a positional arg.
    if (v.kind == VerbStmt::VERB_FILTER) {
        for (const auto& a : v.args) {
            inst.named_args.emplace_back("op", std::string(a.key));
            if (std::holds_alternative<std::string>(a.val)) {
                inst.pos_args.push_back(std::get<std::string>(a.val));
            }
        }
        inst.opcode = IROpcode::IR_FILTER;
        resolveMetadata(inst);
        return inst;
    }

    for (const auto& a : v.args) {
        inst.named_args.emplace_back(a.key, a.val);
    }

    switch (v.kind) {
        case VerbStmt::VERB_COLLECT:      inst.opcode = collectOpcodeFor(v.target); break;
        case VerbStmt::VERB_INJECT:       inst.opcode = IROpcode::IR_INJECT;        break;
        case VerbStmt::VERB_BLIND:        inst.opcode = IROpcode::IR_BLIND;         break;
        case VerbStmt::VERB_PERSIST:      inst.opcode = IROpcode::IR_PERSIST;       break;
        case VerbStmt::VERB_BEACON:       inst.opcode = IROpcode::IR_BEACON;        break;
        case VerbStmt::VERB_EXEC_TRUSTED: inst.opcode = IROpcode::IR_EXEC_TRUSTED;  break;
        case VerbStmt::VERB_FILTER:       inst.opcode = IROpcode::IR_FILTER;        break;
        case VerbStmt::VERB_TIMELINE:     inst.opcode = IROpcode::IR_TIMELINE;      break;
        case VerbStmt::VERB_UPLOAD:       inst.opcode = IROpcode::IR_UPLOAD;        break;
        case VerbStmt::VERB_HASH_ALL:     inst.opcode = IROpcode::IR_HASH_ALL;      break;
        case VerbStmt::VERB_ALERT:        inst.opcode = IROpcode::IR_ALERT;         break;
        case VerbStmt::VERB_IOC_CHECK:    inst.opcode = IROpcode::IR_IOC_CHECK;     break;
    }

    // filter(...) carries its value in pos_args and its operator in a named
    // arg "op" (set by the parser); target holds the field name.
    resolveMetadata(inst);
    return inst;
}

// ArtifactDecl → IRProgram.
IRProgram lowerArtifact(const ArtifactDecl& art) {
    IRProgram prog;
    prog.artifact_name = art.name;
    prog.declared_priv = art.requires;
    prog.emits = art.emits;

    for (const auto& item : art.body) {
        if (auto* verb = dynamic_cast<VerbStmt*>(item.get())) {
            prog.body.emplace_back(lowerVerb(*verb));
        } else if (auto* pipeline = dynamic_cast<PipelineExpr*>(item.get())) {
            IRPipeline irp;
            irp.loc = pipeline->loc;
            for (const auto& stage : pipeline->stages) {
                irp.stages.push_back(lowerVerb(*stage));
            }
            prog.body.emplace_back(std::move(irp));
        }
    }
    return prog;
}

} // namespace

// ════════════════════════════════════════════════════════════════════
//  LLVM backend: Module → object bytes → sections
// ════════════════════════════════════════════════════════════════════
namespace {

struct SectionBytes {
    std::vector<uint8_t> text;
    std::vector<uint8_t> rdata;
    std::vector<uint8_t> data;
    uint64_t entry_offset = 0;
};

bool codegenToSections(llvm::Module* mod, llvm::Triple triple,
                       SectionBytes& out) {
    llvm::InitializeAllTargetInfos();
    llvm::InitializeAllTargets();
    llvm::InitializeAllTargetMCs();
    llvm::InitializeAllAsmParsers();
    llvm::InitializeAllAsmPrinters();

    std::string err;
    const llvm::Target* target = llvm::TargetRegistry::lookupTarget(triple, err);
    if (!target) {
        llvm::errs() << "error: no LLVM target for triple '" << triple.str()
                     << "': " << err << "\n";
        return false;
    }

    llvm::TargetOptions options;
    std::unique_ptr<llvm::TargetMachine> tm(target->createTargetMachine(
        triple, "generic", "", options, llvm::Reloc::PIC_));
    if (!tm) {
        llvm::errs() << "error: could not create target machine\n";
        return false;
    }

    mod->setDataLayout(tm->createDataLayout());
    jockeySetModuleTriple(*mod, triple);

    llvm::SmallVector<char, 0> obj;
    llvm::raw_svector_ostream os(obj);
    llvm::legacy::PassManager pm;
    // CodeGenFileType became a scoped enum in LLVM 19; the pinned LLVM 18
    // still uses the unscoped CGFT_* spelling.
#if LLVM_VERSION_MAJOR >= 19
    const llvm::CodeGenFileType file_type = llvm::CodeGenFileType::ObjectFile;
#else
    const llvm::CodeGenFileType file_type = llvm::CGFT_ObjectFile;
#endif
    if (tm->addPassesToEmitFile(pm, os, nullptr, file_type)) {
        llvm::errs() << "error: target cannot emit an object file\n";
        return false;
    }
    pm.run(*mod);

    // Parse the emitted object and pull out section contents.
    std::unique_ptr<llvm::MemoryBuffer> buf =
        llvm::MemoryBuffer::getMemBuffer(
            llvm::StringRef(obj.data(), obj.size()), "", /*RequiresNullTerminator=*/false);

    auto objOrErr = llvm::object::ObjectFile::createObjectFile(buf->getMemBufferRef());
    if (!objOrErr) {
        llvm::errs() << "error: could not parse emitted object: "
                     << llvm::toString(objOrErr.takeError()) << "\n";
        return false;
    }
    llvm::object::ObjectFile& file = **objOrErr;

    for (const llvm::object::SectionRef& sec : file.sections()) {
        auto nameOrErr = sec.getName();
        if (!nameOrErr) { llvm::consumeError(nameOrErr.takeError()); continue; }
        llvm::StringRef name = *nameOrErr;
        auto contOrErr = sec.getContents();
        if (!contOrErr) { llvm::consumeError(contOrErr.takeError()); continue; }
        llvm::StringRef c = *contOrErr;

        const bool is_rodata = (name == ".rdata") ||
                               (name.size() >= 7 && name.substr(0, 7) == ".rodata");

        if (name == ".text") {
            out.text.assign(c.begin(), c.end());
        } else if (is_rodata) {
            out.rdata.insert(out.rdata.end(), c.begin(), c.end());
        } else if (name == ".data") {
            out.data.insert(out.data.end(), c.begin(), c.end());
        }
    }

    // Locate the entry symbol to compute the entry offset within .text.
    for (const llvm::object::SymbolRef& sym : file.symbols()) {
        auto nameOrErr = sym.getName();
        if (!nameOrErr) { llvm::consumeError(nameOrErr.takeError()); continue; }
        if (*nameOrErr == "main" || *nameOrErr == "WinMain") {
            auto addrOrErr = sym.getAddress();
            if (addrOrErr) {
                out.entry_offset = *addrOrErr;
            } else {
                llvm::consumeError(addrOrErr.takeError());
            }
            break;
        }
    }

    return true;
}

bool writeFile(const std::string& path, const std::vector<uint8_t>& bytes) {
    std::ofstream f(path, std::ios::binary);
    if (!f) return false;
    f.write(reinterpret_cast<const char*>(bytes.data()),
            static_cast<std::streamsize>(bytes.size()));
    return static_cast<bool>(f);
}

} // namespace

// ════════════════════════════════════════════════════════════════════
//  main
// ════════════════════════════════════════════════════════════════════
int main(int argc, char** argv) {
    llvm::cl::ParseCommandLineOptions(argc, argv, "JOCKEY Compiler\n");

    // ── Resolve platform ───────────────────────────────────────────
    PlatformTarget platform;
    if (Target == "windows") {
        platform = PlatformTarget::WINDOWS;
    } else if (Target == "linux") {
        platform = PlatformTarget::LINUX;
    } else {
        std::cerr << "error: unknown target '" << Target
                  << "'. Use 'windows' or 'linux'.\n";
        return 1;
    }

    // ── Generate seed if not provided ──────────────────────────────
    std::string seed = Seed;
    if (seed.empty()) {
        // Generate random seed
        std::ifstream urandom("/dev/urandom", std::ios::binary);
        uint8_t seed_bytes[16] = {0};
        urandom.read(reinterpret_cast<char*>(seed_bytes), sizeof(seed_bytes));
        char hex[33];
        for (int i = 0; i < 16; i++) sprintf(hex + i*2, "%02x", seed_bytes[i]);
        hex[32] = 0;
        seed = hex;
    }
    if (Verbose) std::cerr << "[*] Build seed: " << seed << "\n";
    uint64_t seed_u64 = strtoull(seed.c_str(), nullptr, 16);

    // ── Phase 1: Lex + Parse ───────────────────────────────────────
    if (Verbose) std::cerr << "[*] Parsing " << InputFile << "...\n";

    Parser parser(InputFile);
    auto ast = parser.parse();

    if (parser.hasErrors()) {
        for (const auto& d : parser.diagnostics()) {
            std::cerr << d.loc.file << ":" << d.loc.line << ":"
                      << d.loc.col << ": ";
            switch (d.severity) {
                case Diagnostic::ERROR:   std::cerr << "error: "; break;
                case Diagnostic::WARNING: std::cerr << "warning: "; break;
                case Diagnostic::NOTE:    std::cerr << "note: "; break;
            }
            std::cerr << d.message << "\n";
        }
        return 1;
    }

    if (!ast || ast->artifacts.empty()) {
        std::cerr << InputFile.getValue() << ": error: no 'artifact' declaration found\n";
        return 1;
    }
    if (ast->artifacts.size() > 1) {
        std::cerr << InputFile.getValue()
                  << ": warning: Phase 1 compiles a single artifact per file; "
                     "compiling '" << ast->artifacts.front()->name << "'\n";
    }

    // ── Phase 2: AST → IR lowering ─────────────────────────────────
    if (Verbose) std::cerr << "[*] Lowering AST to JOCKY IR...\n";
    IRProgram ir_program = lowerArtifact(*ast->artifacts.front());

    // ── Phase 3: Typecheck ─────────────────────────────────────────
    if (Verbose) std::cerr << "[*] Type-checking...\n";

    Typechecker checker;
    if (!checker.check(ir_program, platform)) {
        for (const auto& d : checker.diagnostics()) {
            if (d.severity != Diagnostic::ERROR) continue;
            std::cerr << InputFile.getValue() << ":" << d.loc.line << ":"
                      << d.loc.col << ": error: " << d.message << "\n";
        }
        return 1;
    }
    if (Verbose) {
        for (const auto& d : checker.diagnostics()) {
            if (d.severity == Diagnostic::WARNING || d.severity == Diagnostic::NOTE) {
                std::cerr << "[!] " << d.message << "\n";
            }
        }
    }

    // ── Phase 4: JOCKY IR → LLVM IR ───────────────────────────────
    if (Verbose) std::cerr << "[*] Lowering to LLVM IR...\n";

    LLVMLowering lowering(platform, seed);
    auto llvm_module = lowering.lower(ir_program);
    if (!llvm_module) {
        std::cerr << "error: LLVM IR generation failed\n";
        return 1;
    }

    // ── Phase 5: LLVM backend → object → sections ─────────────────
    if (Verbose) std::cerr << "[*] Running LLVM backend...\n";

    llvm::Triple triple = (platform == PlatformTarget::WINDOWS)
        ? llvm::Triple("x86_64-pc-windows-msvc")
        : llvm::Triple("x86_64-unknown-linux-gnu");

    SectionBytes sections;
    if (!codegenToSections(llvm_module.get(), triple, sections)) {
        return 1;
    }

    // ── Phase 6: Custom PE/ELF emitter ────────────────────────────
    if (Verbose) std::cerr << "[*] Emitting binary...\n";

    std::string output_path = Output;
    if (output_path.empty()) {
        output_path = (platform == PlatformTarget::WINDOWS)
            ? "output.exe" : "output";
    }

    std::vector<uint8_t> image;
    if (platform == PlatformTarget::WINDOWS) {
        const ToolchainProfile& profile = selectProfile(seed_u64);
        if (Verbose) std::cerr << "[*] Toolchain profile: " << profile.name << "\n";
        PEEmitter emitter(profile, seed_u64);
        emitter.setTextSection(sections.text);
        emitter.setRdataSection(sections.rdata);
        emitter.setDataSection(sections.data);
        emitter.setEntryPoint(static_cast<uint32_t>(sections.entry_offset));
        image = emitter.emit();
    } else {
        ELFEmitter emitter(seed_u64);
        emitter.setTextSection(sections.text);
        emitter.setRdataSection(sections.rdata);
        emitter.setDataSection(sections.data);
        emitter.setEntryPoint(sections.entry_offset);
        image = emitter.emit();
    }

    if (!writeFile(output_path, image)) {
        std::cerr << "error: cannot write output file: " << output_path << "\n";
        return 1;
    }

    // ── Output ─────────────────────────────────────────────────────
    if (Verbose) std::cerr << "[*] Wrote " << output_path << " ("
                           << image.size() << " bytes)\n";
    return 0;
}
