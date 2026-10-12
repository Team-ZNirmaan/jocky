#pragma once
#include "token.h"
#include <string>
#include <vector>
#include <memory>
#include <variant>

// ── Source location, carried by every AST node ─────────────────────
struct Location {
    std::string file;
    int line;
    int col;
};

// Forward declarations
struct ArtifactDecl;
struct VerbStmt;
struct PipelineExpr;
struct FilterExpr;

// ── Base AST node ──────────────────────────────────────────────────
struct ASTNode {
    Location loc;
    virtual ~ASTNode() = default;
};

// ── Named argument: key: value ─────────────────────────────────────
struct NamedArg : ASTNode {
    std::string key;                            // e.g., "profile", "jitter", "mode"
    std::variant<std::string, int, double> val;  // e.g., "CDN_FRONT", 0.3, 42
};

// ── Verb statement: collect, inject, blind, persist, beacon, etc. ──
struct VerbStmt : ASTNode {
    enum VerbKind {
        VERB_COLLECT, VERB_INJECT, VERB_BLIND, VERB_PERSIST,
        VERB_BEACON, VERB_EXEC_TRUSTED, VERB_FILTER,
        VERB_TIMELINE, VERB_UPLOAD, VERB_HASH_ALL,
        VERB_ALERT, VERB_IOC_CHECK
    };

    VerbKind kind;
    std::string target;                  // e.g., "proc_meta", "MFT", "evtlog"
    std::vector<NamedArg> args;          // e.g., profile: CDN_FRONT, jitter: 0.3
    std::vector<std::string> pos_args;   // positional args: e.g., inject(pid, PAYLOAD, ...)
};

// ── Filter expression: filter(field == "value") ────────────────────
struct FilterExpr : ASTNode {
    std::string field;    // e.g., "parent"
    enum Op { EQ, NEQ };
    Op op;
    std::string value;    // e.g., "cmd.exe"
};

// ── Pipeline expression: verb | verb | verb ────────────────────────
// A pipeline is a chain of VerbStmt nodes connected by |.
// Each stage feeds its output to the next.
struct PipelineExpr : ASTNode {
    std::vector<std::unique_ptr<VerbStmt>> stages;
    // The first stage's input is the implicit collection context.
    // Each subsequent stage receives the previous stage's output.
};

// ── Artifact declaration: the top-level compilation unit ───────────
struct ArtifactDecl : ASTNode {
    std::string name;                    // e.g., "host_triage"
    PrivilegeLevel requires;             // L0, L1, L2
    std::vector<std::string> emits;      // e.g., ["processes", "services", "drivers"]

    // Body: either standalone VerbStmts or PipelineExprs
    std::vector<std::unique_ptr<ASTNode>> body;   // VerbStmt | PipelineExpr
};

// ── Translation unit: a complete .jky file ─────────────────────────
struct TranslationUnit : ASTNode {
    std::vector<std::unique_ptr<ArtifactDecl>> artifacts;
};
