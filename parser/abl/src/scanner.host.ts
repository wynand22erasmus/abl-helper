/**
 * Typed host contract for `parser/abl/src/scanner.c` (tree-sitter external scanner).
 *
 * The scanner cannot be implemented in TypeScript for WASM: tree-sitter links a
 * native/external lexer compiled from C (Emscripten for `build-wasm`). This file
 * is the authoritative TypeScript mirror of token kinds, grammar external names,
 * and export symbols — keep it in sync when editing `scanner.c` or `grammar.ts`
 * `externals`.
 *
 * @see scanner.manifest.ts — CI/build validation against scanner.c
 * @see ../grammar.ts — `externals` array (order must match `AblExternalTokenKind`)
 */

/** Numeric kinds assigned by tree-sitter to external tokens (order = grammar `externals`). */
export enum AblExternalTokenKind {
  NAMEDOT = 0,
  NAMECOLON = 1,
  NAMEDOUBLECOLON = 2,
  OR_OPERATOR = 3,
  AND_OPERATOR = 4,
  AUGMENTED_ASSIGNMENT = 5,
  ESCAPED_STRING = 6,
  INPUT_KEYWORD = 7,
  OUTPUT_KEYWORD = 8,
  NEW_KEYWORD = 9,
  OLD_KEYWORD = 10,
  FOR_KEYWORD = 11,
  DEF_KEYWORD = 12,
  VAR_KEYWORD = 13,
  INDEX_KEYWORD = 14,
  FIELD_KEYWORD = 15,
  RETURN_KEYWORD = 16,
}

/** C `enum TokenType` identifiers — must match `scanner.c` exactly and in order. */
export const ABL_SCANNER_C_TOKEN_NAMES = [
  "NAMEDOT",
  "NAMECOLON",
  "NAMEDOUBLECOLON",
  "OR_OPERATOR",
  "AND_OPERATOR",
  "AUGMENTED_ASSIGNMENT",
  "ESCAPED_STRING",
  "INPUT_KEYWORD",
  "OUTPUT_KEYWORD",
  "NEW_KEYWORD",
  "OLD_KEYWORD",
  "FOR_KEYWORD",
  "DEF_KEYWORD",
  "VAR_KEYWORD",
  "INDEX_KEYWORD",
  "FIELD_KEYWORD",
  "RETURN_KEYWORD",
] as const satisfies readonly (keyof typeof AblExternalTokenKind)[];

/** Grammar external rule names (`grammar.ts` `externals`, without `$`). */
export const ABL_GRAMMAR_EXTERNAL_RULES = [
  "_namedot",
  "_namecolon",
  "_namedoublecolon",
  "_or_operator",
  "_and_operator",
  "_augmented_assignment",
  "_escaped_string",
  "_input_keyword",
  "_output_keyword",
  "_new_keyword",
  "_old_keyword",
  "_for_keyword",
  "_def_keyword",
  "_var_keyword",
  "_index_keyword",
  "_field_keyword",
  "_return_keyword",
] as const;

/** Case-insensitive keyword literals matched by `match_keyword` in scanner.c. */
export const ABL_SCANNER_KEYWORD_LITERALS: Readonly<
  Partial<Record<AblExternalTokenKind, string>>
> = {
  [AblExternalTokenKind.OR_OPERATOR]: "OR",
  [AblExternalTokenKind.AND_OPERATOR]: "AND",
  [AblExternalTokenKind.INPUT_KEYWORD]: "INPUT",
  [AblExternalTokenKind.OUTPUT_KEYWORD]: "OUTPUT",
  [AblExternalTokenKind.NEW_KEYWORD]: "NEW",
  [AblExternalTokenKind.OLD_KEYWORD]: "OLD",
  [AblExternalTokenKind.FOR_KEYWORD]: "FOR",
  [AblExternalTokenKind.DEF_KEYWORD]: "DEF",
  [AblExternalTokenKind.VAR_KEYWORD]: "VAR",
  [AblExternalTokenKind.INDEX_KEYWORD]: "INDEX",
  [AblExternalTokenKind.FIELD_KEYWORD]: "FIELD",
  [AblExternalTokenKind.RETURN_KEYWORD]: "RETURN",
};

/**
 * tree-sitter external scanner ABI exported from scanner.c.
 * @see https://tree-sitter.github.io/tree-sitter/creating-parsers#external-scanners
 */
export const ABL_EXTERNAL_SCANNER_EXPORTS = [
  "tree_sitter_abl_external_scanner_create",
  "tree_sitter_abl_external_scanner_destroy",
  "tree_sitter_abl_external_scanner_serialize",
  "tree_sitter_abl_external_scanner_deserialize",
  "tree_sitter_abl_external_scanner_scan",
] as const;

/** Relative path from repo root to the C implementation (vendored, WASM-linked). */
export const ABL_SCANNER_C_RELATIVE_PATH = "parser/abl/src/scanner.c";

/**
 * Scanner payload is always null — no fields to serialize.
 * Mirrors `tree_sitter_abl_external_scanner_create` returning NULL and
 * `serialize` returning 0.
 */
export interface AblExternalScannerState {
  readonly _stateless: true;
}

export const ABL_EXTERNAL_SCANNER_SERIALIZED_LENGTH = 0;

export type AblExternalScannerExport = (typeof ABL_EXTERNAL_SCANNER_EXPORTS)[number];
export type AblScannerCTokenName = (typeof ABL_SCANNER_C_TOKEN_NAMES)[number];
export type AblGrammarExternalRule = (typeof ABL_GRAMMAR_EXTERNAL_RULES)[number];
