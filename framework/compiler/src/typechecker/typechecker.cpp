#include "typechecker/typechecker.h"
#include <sstream>

namespace {
// Opcode name lookup — resolves an IROpcode to its canonical name via the
// metadata table in ir.cpp (used for readable diagnostics).
const char* opcodeName(IROpcode op) {
    for (size_t i = 0; i < OPCODE_TABLE_SIZE; i++) {
        if (OPCODE_TABLE[i].opcode == op) return OPCODE_TABLE[i].name;
    }
    return "<unknown>";
}
} // namespace

bool Typechecker::check(const IRProgram& program, PlatformTarget target) {
    for (const auto& item : program.body) {
        if (std::holds_alternative<IRInstruction>(item)) {
            checkInstruction(std::get<IRInstruction>(item),
                             program.declared_priv, target);
        } else {
            checkPipeline(std::get<IRPipeline>(item),
                          program.declared_priv, target);
        }
    }

    // Check for errors
    for (const auto& d : diags_) {
        if (d.severity == Diagnostic::ERROR) return false;
    }
    return true;
}

void Typechecker::checkInstruction(const IRInstruction& inst,
                                    PrivilegeLevel declared_priv,
                                    PlatformTarget target_platform) {
    // ── Privilege check ────────────────────────────────────────────
    // The instruction's required privilege must be ≤ the artifact's declared level.
    if (inst.min_priv > declared_priv) {
        std::ostringstream oss;
        oss << "privilege violation: '"
            << opcodeName(inst.opcode)
            << "' requires L" << static_cast<int>(inst.min_priv)
            << ", but artifact declares 'requires L"
            << static_cast<int>(declared_priv) << "'";

        // Provide actionable fix suggestion
        if (inst.min_priv == PRIV_L1 && declared_priv == PRIV_L0) {
            oss << "\n  help: change artifact to 'requires L1' or use a "
                << "lower-privilege alternative";
        }
        if (inst.min_priv == PRIV_L2) {
            oss << "\n  note: L2 (kernel) operations require blind() and "
                << "BYOVD/module control. The artifact must declare "
                << "'requires L2'.";
        }

        diags_.push_back({Diagnostic::ERROR, inst.loc, oss.str()});
    }

    // ── Platform check ─────────────────────────────────────────────
    // If the instruction is Windows-only and we're targeting Linux (or vice versa)
    if (inst.platform == PlatformTarget::WINDOWS &&
        target_platform == PlatformTarget::LINUX) {
        std::ostringstream oss;
        oss << "platform error: '" << inst.target
            << "' is Windows-only but target is --target=linux";
        diags_.push_back({Diagnostic::ERROR, inst.loc, oss.str()});
    }
    if (inst.platform == PlatformTarget::LINUX &&
        target_platform == PlatformTarget::WINDOWS) {
        std::ostringstream oss;
        oss << "platform error: '" << inst.target
            << "' is Linux-only but target is --target=windows";
        diags_.push_back({Diagnostic::ERROR, inst.loc, oss.str()});
    }

    // ── Effect warnings ────────────────────────────────────────────
    // Warn when a WRITE effect is used (inject, persist) — these modify
    // the target system and should be used deliberately.
    if (inst.effect == EffectClass::WRITE) {
        std::ostringstream oss;
        oss << "note: '" << inst.target
            << "' modifies system state (EffectClass::WRITE)";
        diags_.push_back({Diagnostic::NOTE, inst.loc, oss.str()});
    }
}

void Typechecker::checkPipeline(const IRPipeline& pipeline,
                                 PrivilegeLevel declared_priv,
                                 PlatformTarget target_platform) {
    // Check each stage individually
    for (const auto& inst : pipeline.stages) {
        checkInstruction(inst, declared_priv, target_platform);
    }

    // ── Pipeline compatibility ─────────────────────────────────────
    // Verify that chaining makes sense:
    // - First stage must be a collection verb (produces data)
    // - Middle stages must be transforms (filter, timeline, etc.)
    // - Last stage may be an output verb (upload) or a transform
    for (size_t i = 0; i < pipeline.stages.size(); i++) {
        const auto& stage = pipeline.stages[i];

        if (i == 0 && stage.effect == EffectClass::TRANSFORM) {
            diags_.push_back({Diagnostic::WARNING, stage.loc,
                "first pipeline stage is a transform with no input data; "
                "did you mean to start with a 'collect' verb?"});
        }

        if (i > 0 && stage.effect == EffectClass::READ &&
            stage.opcode != IROpcode::IR_IOC_CHECK) {
            diags_.push_back({Diagnostic::WARNING, stage.loc,
                "collection verb in middle of pipeline — data from previous "
                "stage will be discarded"});
        }
    }
}
