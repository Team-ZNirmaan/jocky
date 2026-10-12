#pragma once
#include "ir/ir.h"
#include "parser/parser.h"  // for Diagnostic
#include <vector>

class Typechecker {
public:
    // Check an entire IR program for privilege violations and platform errors.
    // Returns false if any errors are found.
    bool check(const IRProgram& program, PlatformTarget target_platform);

    const std::vector<Diagnostic>& diagnostics() const { return diags_; }

private:
    void checkInstruction(const IRInstruction& inst,
                          PrivilegeLevel declared_priv,
                          PlatformTarget target_platform);

    void checkPipeline(const IRPipeline& pipeline,
                       PrivilegeLevel declared_priv,
                       PlatformTarget target_platform);

    std::vector<Diagnostic> diags_;
};
