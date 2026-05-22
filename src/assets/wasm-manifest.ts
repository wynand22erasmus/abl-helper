/**
 * Extension parser WASM assets (binary blobs; paths only in TypeScript).
 */
export const PARSER_WASM_CORE = "tree-sitter.wasm" as const;
export const PARSER_WASM_ABL = "tree-sitter-abl.wasm" as const;

export const PARSER_WASM_FILES = [PARSER_WASM_CORE, PARSER_WASM_ABL] as const;

export type ParserWasmFile = (typeof PARSER_WASM_FILES)[number];
