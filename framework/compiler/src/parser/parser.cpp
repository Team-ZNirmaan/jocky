#include "parser/parser.h"
#include <cstdio>
#include <cstdlib>

// Flex-generated extern
extern FILE* yyin;
extern int yylex();
extern union TokenValue yylval;
extern struct SourceLoc yylloc;

Parser::Parser(const std::string& filename) : filename_(filename) {
    // Open source file and tokenize everything up front
    yyin = fopen(filename.c_str(), "r");
    if (!yyin) {
        emitError({filename, 0, 0}, "cannot open file: " + filename);
        return;
    }

    int tok;
    while ((tok = yylex()) != 0) {
        tokens_.push_back({
            static_cast<TokenType>(tok),
            yylval,
            {filename_, yylloc.first_line, yylloc.first_column}
        });
    }
    tokens_.push_back({TOK_EOF, {}, {filename_, yylloc.first_line, yylloc.first_column}});
    fclose(yyin);
}

std::unique_ptr<TranslationUnit> Parser::parse() {
    auto unit = std::make_unique<TranslationUnit>();

    while (current() != TOK_EOF) {
        if (current() == TOK_ARTIFACT) {
            auto art = parseArtifact();
            if (art) unit->artifacts.push_back(std::move(art));
        } else {
            emitError(currentLoc(), "expected 'artifact' declaration");
            synchronize();
        }
    }

    return unit;
}

/*
 * artifact <name> {
 *   requires <L0|L1|L2>
 *   emits    <ident>, <ident>, ...
 *
 *   <verb_stmt | pipeline>
 *   ...
 * }
 */
std::unique_ptr<ArtifactDecl> Parser::parseArtifact() {
    auto art = std::make_unique<ArtifactDecl>();
    art->loc = currentLoc();

    expect(TOK_ARTIFACT, "artifact declaration");
    if (current() != TOK_IDENT) {
        emitError(currentLoc(), "expected artifact name");
        synchronize();
        return nullptr;
    }
    art->name = currentValue().str;
    advance();

    expect(TOK_LBRACE, "artifact body");

    // Parse 'requires' clause
    if (match(TOK_REQUIRES)) {
        if (current() != TOK_PRIVILEGE) {
            emitError(currentLoc(), "expected privilege level (L0, L1, L2)");
        } else {
            art->requires = currentValue().priv;
            advance();
        }
    } else {
        art->requires = PRIV_L0;  // default
    }

    // Parse 'emits' clause
    if (match(TOK_EMITS)) {
        do {
            if (current() != TOK_IDENT) {
                emitError(currentLoc(), "expected emitted artifact name");
                break;
            }
            art->emits.push_back(currentValue().str);
            advance();
        } while (match(TOK_COMMA));
    }

    // Parse body: verb statements or pipelines
    while (current() != TOK_RBRACE && current() != TOK_EOF) {
        auto verb = parseVerbStmt();
        if (!verb) { synchronize(); continue; }

        // Check if this is a pipeline (next token is |)
        if (current() == TOK_PIPE) {
            auto pipeline = std::make_unique<PipelineExpr>();
            pipeline->loc = verb->loc;
            pipeline->stages.push_back(std::move(verb));

            while (match(TOK_PIPE)) {
                auto next = parseVerbStmt();
                if (next) pipeline->stages.push_back(std::move(next));
                else { synchronize(); break; }
            }
            art->body.push_back(std::move(pipeline));
        } else {
            art->body.push_back(std::move(verb));
        }
    }

    expect(TOK_RBRACE, "end of artifact body");
    return art;
}

/*
 * <verb> <target>(<key: value, ...>)
 * e.g.: collect proc_meta
 *       inject(pid, PAYLOAD, mode: SECTION_MAP)
 *       beacon(profile: CDN_FRONT, jitter: 0.3)
 *       filter(parent == "cmd.exe")
 */
std::unique_ptr<VerbStmt> Parser::parseVerbStmt() {
    auto stmt = std::make_unique<VerbStmt>();
    stmt->loc = currentLoc();

    // Map token to verb kind
    switch (current()) {
        case TOK_COLLECT:      stmt->kind = VerbStmt::VERB_COLLECT;      break;
        case TOK_INJECT:       stmt->kind = VerbStmt::VERB_INJECT;       break;
        case TOK_BLIND:        stmt->kind = VerbStmt::VERB_BLIND;        break;
        case TOK_PERSIST:      stmt->kind = VerbStmt::VERB_PERSIST;      break;
        case TOK_BEACON:       stmt->kind = VerbStmt::VERB_BEACON;       break;
        case TOK_EXEC_TRUSTED: stmt->kind = VerbStmt::VERB_EXEC_TRUSTED; break;
        case TOK_FILTER:       stmt->kind = VerbStmt::VERB_FILTER;       break;
        case TOK_TIMELINE:     stmt->kind = VerbStmt::VERB_TIMELINE;     break;
        case TOK_UPLOAD:       stmt->kind = VerbStmt::VERB_UPLOAD;       break;
        case TOK_HASH_ALL:     stmt->kind = VerbStmt::VERB_HASH_ALL;     break;
        case TOK_ALERT:        stmt->kind = VerbStmt::VERB_ALERT;        break;
        case TOK_IOC_CHECK:    stmt->kind = VerbStmt::VERB_IOC_CHECK;    break;
        default:
            emitError(currentLoc(), "expected verb (collect, inject, blind, ...)");
            return nullptr;
    }
    advance();

    // ── filter(field (==|!=) value) — has its own grammar ──────────
    if (stmt->kind == VerbStmt::VERB_FILTER) {
        auto filter = parseFilter();
        if (filter) {
            stmt->target = filter->field;
            NamedArg op;
            op.loc = filter->loc;
            op.key = (filter->op == FilterExpr::EQ) ? "==" : "!=";
            op.val = filter->value;
            stmt->args.push_back(op);
        }
        return stmt;
    }

    // Optional: target identifier (e.g., "proc_meta", "MFT")
    if (current() == TOK_IDENT) {
        stmt->target = currentValue().str;
        advance();
    } else if (current() == TOK_STRING) {
        stmt->target = currentValue().str;
        advance();
    }

    // Optional: argument list in parentheses
    if (match(TOK_LPAREN)) {
        while (current() != TOK_RPAREN && current() != TOK_EOF) {
            // Check if it's a named arg: key: value
            if (current() == TOK_IDENT && peek() == TOK_COLON) {
                stmt->args.push_back(parseNamedArg());
            }
            // Positional arg
            else if (current() == TOK_IDENT || current() == TOK_STRING ||
                     current() == TOK_ENUM_VALUE) {
                stmt->pos_args.push_back(currentValue().str);
                advance();
            }
            else if (current() == TOK_INT) {
                stmt->pos_args.push_back(std::to_string(currentValue().ival));
                advance();
            }

            if (!match(TOK_COMMA)) break;
        }
        expect(TOK_RPAREN, "argument list");
    }

    return stmt;
}

/*
 * filter(field (==|!=) value)
 */
std::unique_ptr<FilterExpr> Parser::parseFilter() {
    auto filter = std::make_unique<FilterExpr>();
    filter->loc = currentLoc();

    if (!expect(TOK_LPAREN, "filter argument list")) return nullptr;

    if (current() != TOK_IDENT) {
        emitError(currentLoc(), "expected field name in filter");
        return nullptr;
    }
    filter->field = currentValue().str;
    advance();

    if (current() == TOK_EQ) {
        filter->op = FilterExpr::EQ;
        advance();
    } else if (current() == TOK_NEQ) {
        filter->op = FilterExpr::NEQ;
        advance();
    } else {
        emitError(currentLoc(), "expected '==' or '!=' in filter");
        return nullptr;
    }

    if (current() == TOK_STRING || current() == TOK_IDENT ||
        current() == TOK_ENUM_VALUE) {
        filter->value = currentValue().str;
        advance();
    } else {
        emitError(currentLoc(), "expected comparison value in filter");
        return nullptr;
    }

    expect(TOK_RPAREN, "end of filter");
    return filter;
}

NamedArg Parser::parseNamedArg() {
    NamedArg arg;
    arg.loc = currentLoc();
    arg.key = currentValue().str;
    advance(); // skip key
    advance(); // skip colon

    if (current() == TOK_STRING || current() == TOK_IDENT || current() == TOK_ENUM_VALUE) {
        arg.val = std::string(currentValue().str);
    } else if (current() == TOK_INT) {
        arg.val = currentValue().ival;
    } else if (current() == TOK_FLOAT) {
        arg.val = currentValue().fval;
    } else {
        emitError(currentLoc(), "expected value for argument '" + arg.key + "'");
    }
    advance();
    return arg;
}

void Parser::synchronize() {
    while (current() != TOK_EOF) {
        if (current() == TOK_RBRACE) { advance(); return; }
        if (current() == TOK_ARTIFACT) return;
        advance();
    }
}

// ── Helpers ────────────────────────────────────────────────────────
TokenType Parser::current() const { return tokens_[pos_].type; }
TokenType Parser::peek() const { return pos_ + 1 < tokens_.size() ? tokens_[pos_+1].type : TOK_EOF; }
TokenValue Parser::currentValue() const { return tokens_[pos_].value; }
Location Parser::currentLoc() const { return tokens_[pos_].loc; }
void Parser::advance() { if (pos_ < tokens_.size() - 1) pos_++; }
bool Parser::match(TokenType tok) { if (current() == tok) { advance(); return true; } return false; }
bool Parser::expect(TokenType tok, const std::string& ctx) {
    if (!match(tok)) {
        emitError(currentLoc(), "expected '" + ctx + "'");
        return false;
    }
    return true;
}
bool Parser::hasErrors() const {
    for (auto& d : diags_) if (d.severity == Diagnostic::ERROR) return true;
    return false;
}
void Parser::emitError(const Location& loc, const std::string& msg) {
    diags_.push_back({Diagnostic::ERROR, loc, msg});
}
void Parser::emitWarning(const Location& loc, const std::string& msg) {
    diags_.push_back({Diagnostic::WARNING, loc, msg});
}
