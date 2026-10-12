#pragma once
#include "ir/ir.h"
#include <llvm/Config/llvm-config.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/IRBuilder.h>
#include <llvm/TargetParser/Triple.h>
#include <map>
#include <memory>
#include <string>

// LLVM >= 20 stores a Triple inside Module and setTargetTriple() takes a
// Triple directly; older releases (including the pinned LLVM 18) take a
// StringRef. This keeps one source building against both.
inline void jockeySetModuleTriple(llvm::Module& mod, const llvm::Triple& triple) {
#if LLVM_VERSION_MAJOR >= 20
    mod.setTargetTriple(triple);
#else
    mod.setTargetTriple(triple.str());
#endif
}


class LLVMLowering {
public:
    LLVMLowering(PlatformTarget target, const std::string& build_seed);

    // Lower an entire IR program to an LLVM Module.
    std::unique_ptr<llvm::Module> lower(const IRProgram& program);

private:
    // ── Runtime function declarations ──────────────────────────────
    // These declare the jrt-core functions that IR opcodes call into.
    void declareRuntimeFunctions();

    // ── Opcode lowering ────────────────────────────────────────────
    void lowerInstruction(const IRInstruction& inst);
    void lowerPipeline(const IRPipeline& pipeline);

    // ── String handling ────────────────────────────────────────────
    // At this stage, strings are emitted as global constants.
    // Phase 3 will replace them with encrypted blobs.
    llvm::GlobalVariable* emitStringLiteral(const std::string& str, int index);

    // ── Entry point generation ─────────────────────────────────────
    void generateEntryPoint(const IRProgram& program);

    PlatformTarget target_;
    std::string    seed_;

    llvm::LLVMContext ctx_;
    std::unique_ptr<llvm::Module> module_;
    llvm::IRBuilder<> builder_;

    // Map of runtime function name → LLVM Function*
    std::map<std::string, llvm::Function*> runtime_funcs_;

    // Current function being built
    llvm::Function* current_fn_ = nullptr;

    // Runtime context handle (returned by jrt_init), stored for reuse by
    // every lowered opcode call.
    llvm::Value* ctx_val_ = nullptr;

    // Pipeline data context pointer (passed between pipeline stages)
    llvm::Value* pipeline_ctx_ = nullptr;
};
