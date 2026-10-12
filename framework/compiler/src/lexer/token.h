#pragma once

// ── Token types ────────────────────────────────────────────────────
// NOTE: Flex signals end-of-input by returning 0 from yylex(), so the EOF
// token MUST carry the value 0. Every real token therefore starts at 1 —
// otherwise the first keyword ("artifact") would be indistinguishable from
// EOF and lexing would stop immediately.
enum TokenType {
    // End of input
    TOK_EOF = 0,

    // Keywords
    TOK_ARTIFACT, TOK_REQUIRES, TOK_EMITS,
    TOK_COLLECT, TOK_INJECT, TOK_BLIND, TOK_PERSIST,
    TOK_BEACON, TOK_EXEC_TRUSTED, TOK_FILTER,
    TOK_TIMELINE, TOK_UPLOAD, TOK_HASH_ALL,
    TOK_ALERT, TOK_IOC_CHECK,

    // Privilege levels
    TOK_PRIVILEGE,

    // Enum values (modes, methods, profiles)
    TOK_ENUM_VALUE,

    // Literals
    TOK_STRING, TOK_INT, TOK_FLOAT, TOK_IDENT,

    // Operators & punctuation
    TOK_PIPE, TOK_LPAREN, TOK_RPAREN,
    TOK_LBRACE, TOK_RBRACE,
    TOK_COMMA, TOK_COLON,
    TOK_EQ, TOK_NEQ,

    // Special
    TOK_ERROR
};

enum PrivilegeLevel {
    PRIV_L0 = 0,
    PRIV_L1 = 1,
    PRIV_L2 = 2
};

// Token value union — attached to yylval
union TokenValue {
    char*          str;   // TOK_STRING, TOK_IDENT, TOK_ENUM_VALUE
    int            ival;  // TOK_INT
    double         fval;  // TOK_FLOAT
    PrivilegeLevel priv;  // TOK_PRIVILEGE
};

// Source location — attached to yylloc
struct SourceLoc {
    int first_line;
    int first_column;
    int last_line;
    int last_column;
};
