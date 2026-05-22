# tree-sitter-abl (vendored)

Pinned to npm **`tree-sitter-abl@0.1.2`** ([eglekaz/tree-sitter-abl](https://github.com/eglekaz/tree-sitter-abl), MIT).

Editable sources:

- `grammar.ts` / `grammar.js` — grammar rules (TS authored, JS emitted)
- `src/scanner.c` — external scanner (C, WASM)
- `src/scanner.host.ts`, `src/scanner.manifest.ts` — TypeScript contract + build sync check
- `src/grammar.json`, `src/node-types.json` — generated metadata (regenerate with `tree-sitter generate`)

Shipped artifact:

- `tree-sitter-abl.wasm` — rebuild with `tree-sitter build-wasm` after grammar changes (requires `emcc` or Docker).
