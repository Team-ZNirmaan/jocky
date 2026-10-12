#pragma once
#include "ast/ast.h"
#include "token.h"
#include <vector>
#include <string>
#include <memory>

// ── Diagnostic ─────────────────────────────────────────────────────
struct Diagnostic {
    enum Severity { ERROR, WARNING, NOTE };
    Severity severity;
    Location loc;
    std::string message;
};

class Parser {
public:
    explicit Parser(const std::string& filename);

    // Entry point: parse an entire .jky file → TranslationUnit
    std::unique_ptr<TranslationUnit> parse();

    // Collected diagnostics
    const std::vector<Diagnostic>& diagnostics() const { return diags_; }
    bool hasErrors() const;

private:
    // ── Token stream management ────────────────────────────────────
    TokenType current() const;
    TokenType peek() const;
    TokenValue currentValue() const;
    Location  currentLoc() const;
    void advance();
    bool expect(TokenType tok, const std::string& context);
    bool match(TokenType tok);

    // ── Recursive-descent parsing rules ────────────────────────────
    std::unique_ptr<ArtifactDecl> parseArtifact();
    std::unique_ptr<VerbStmt>     parseVerbStmt();
    std::unique_ptr<PipelineExpr> parsePipeline();
    std::unique_ptr<FilterExpr>   parseFilter();
    NamedArg                      parseNamedArg();

    // ── Error recovery ─────────────────────────────────────────────
    void synchronize();  // Skip tokens until next } or artifact keyword
    void emitError(const Location& loc, const std::string& msg);
    void emitWarning(const Location& loc, const std::string& msg);

    std::string filename_;
    std::vector<Diagnostic> diags_;
    // Token buffer (filled by lexer)
    struct TokenInfo { TokenType type; TokenValue value; Location loc; };
    std::vector<TokenInfo> tokens_;
    size_t pos_ = 0;
};
