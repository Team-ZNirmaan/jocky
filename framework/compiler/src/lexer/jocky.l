%{
/* JOCKY Lexer — Flex specification
 * Generates jocky_lexer.cpp via CMake FLEX_TARGET.
 *
 * Every token carries its source location (line, column) for diagnostics.
 */

#include "token.h"    // Token enum + TokenValue union
#include <string>
#include <cstring>
#include <cstdlib>
#include <cstdio>

/* Globals shared with the hand-written parser (parser.cpp declares these
 * extern). Flex alone does not emit yylval/yylloc — without bison we must
 * define them ourselves; yylineno/yyleng/yytext/yyin come from Flex. */
TokenValue yylval;
SourceLoc  yylloc;

// Track column for error messages
static int col_num = 1;
#define YY_USER_ACTION { yylloc.first_line = yylineno; \
                         yylloc.first_column = col_num; \
                         col_num += yyleng; }

%}

%option noyywrap
%option yylineno
%option case-insensitive

/* ── States ─────────────────────────────────────────────────────── */
%x COMMENT

/* ── Definitions ────────────────────────────────────────────────── */
DIGIT       [0-9]
ALPHA       [a-zA-Z_]
ALNUM       [a-zA-Z0-9_]
HEX         [0-9a-fA-F]
WS          [ \t]+

%%

 /* ── Whitespace & newlines ──────────────────────────────────────── */
{WS}            { /* skip */ }
\n              { col_num = 1; }
\r\n            { col_num = 1; }

 /* ── Comments ──────────────────────────────────────────────────── */
"//".*          { /* single-line comment, skip */ }
"/*"            { BEGIN(COMMENT); }
<COMMENT>"*/"   { BEGIN(INITIAL); }
<COMMENT>.      { /* skip */ }
<COMMENT>\n     { col_num = 1; }

 /* ── Keywords ──────────────────────────────────────────────────── */
"artifact"      { return TOK_ARTIFACT; }
"requires"      { return TOK_REQUIRES; }
"emits"         { return TOK_EMITS; }
"collect"       { return TOK_COLLECT; }
"inject"        { return TOK_INJECT; }
"blind"         { return TOK_BLIND; }
"persist"       { return TOK_PERSIST; }
"beacon"        { return TOK_BEACON; }
"exec_trusted"  { return TOK_EXEC_TRUSTED; }
"filter"        { return TOK_FILTER; }
"timeline"      { return TOK_TIMELINE; }
"upload"        { return TOK_UPLOAD; }
"hash_all"      { return TOK_HASH_ALL; }
"alert"         { return TOK_ALERT; }
"ioc_check"     { return TOK_IOC_CHECK; }

 /* ── Privilege levels ──────────────────────────────────────────── */
"L0"            { yylval.priv = PRIV_L0; return TOK_PRIVILEGE; }
"L1"            { yylval.priv = PRIV_L1; return TOK_PRIVILEGE; }
"L2"            { yylval.priv = PRIV_L2; return TOK_PRIVILEGE; }

 /* ── Mode / method enums ───────────────────────────────────────── */
"SECTION_MAP"   { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"APC"           { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"BYOVD"         { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"AUTO"          { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"RUN_KEY"       { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"SERVICE"       { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"CRON"          { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"UNIT"          { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"CDN_FRONT"     { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"GDRIVE"        { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"AZURE_BLOB"    { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }
"S3"            { yylval.str = strdup(yytext); return TOK_ENUM_VALUE; }

 /* ── Operators & punctuation ───────────────────────────────────── */
"|"             { return TOK_PIPE; }
"("             { return TOK_LPAREN; }
")"             { return TOK_RPAREN; }
"{"             { return TOK_LBRACE; }
"}"             { return TOK_RBRACE; }
","             { return TOK_COMMA; }
":"             { return TOK_COLON; }
"=="            { return TOK_EQ; }
"!="            { return TOK_NEQ; }

 /* ── String literals ───────────────────────────────────────────── */
\"([^\"\\\n]|\\.)*\" {
    /* Strip quotes, store raw string for later encryption */
    yylval.str = strndup(yytext + 1, yyleng - 2);
    return TOK_STRING;
}

 /* ── Integer literals ──────────────────────────────────────────── */
0x{HEX}+        { yylval.ival = strtol(yytext, NULL, 16); return TOK_INT; }
{DIGIT}+        { yylval.ival = atoi(yytext); return TOK_INT; }

 /* ── Float literals (for jitter values etc.) ────────────────────── */
{DIGIT}+"."{DIGIT}+ { yylval.fval = atof(yytext); return TOK_FLOAT; }

 /* ── Identifiers ───────────────────────────────────────────────── */
{ALPHA}{ALNUM}* { yylval.str = strdup(yytext); return TOK_IDENT; }

 /* ── Catch-all for errors ──────────────────────────────────────── */
.               {
    fprintf(stderr, "error: unexpected character '%c' at line %d, col %d\n",
            yytext[0], yylineno, col_num - 1);
    return TOK_ERROR;
}

%%
