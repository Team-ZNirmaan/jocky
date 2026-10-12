// JOCKY AST — node definitions live in ast.h (Implementation Plan §1.2).
//
// This translation unit exists so the AST entities have a home for any
// out-of-line definitions (e.g. visitors, pretty-printers) added later.
// The node hierarchy itself is header-only and needs no emitted code yet.

#include "ast/ast.h"
