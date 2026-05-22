# Local ABL parser (tree-sitter)

Vendored, editable copies of the tree-sitter **runtime** and **ABL grammar** used by ABL Helper. Edit files here, then run `npm run build:parser` to refresh `src/assets/*.wasm`.

## Layout

| Path | Role | Upstream (pinned) |
|------|------|-------------------|
| [`runtime/`](runtime/) | `tree-sitter.cjs` binding + `tree-sitter.wasm` engine | [tree-sitter](https://github.com/tree-sitter/tree-sitter) **v0.24.7** `lib/binding_web` |
| [`abl/`](abl/) | ABL grammar (`grammar.ts` → `grammar.js`, `src/scanner.c`, typed host contract) + `tree-sitter-abl.wasm` | [eglekaz/tree-sitter-abl](https://github.com/eglekaz/tree-sitter-abl) **0.1.2** (npm) |

## Non-TypeScript artifacts

| File | Role |
|------|------|
| `abl/grammar.js` | Generated from `grammar.ts` for tree-sitter CLI |
| `abl/src/scanner.c` | External scanner (C) — required for WASM; not replaceable by TS |
| `abl/src/scanner.host.ts` | Typed contract mirroring `scanner.c` token kinds and grammar `externals` |
| `abl/src/scanner.manifest.ts` | Build validation (`npm run check:scanner`) |
| `abl/src/grammar.json`, `abl/src/node-types.json` | tree-sitter **generated** metadata (optional `grammar-metadata.d.ts`) |
| `runtime/tree-sitter.cjs` | Vendored Emscripten runtime |
| `*.wasm` | Compiled binaries |

See [docs/TYPESCRIPT.md](../docs/TYPESCRIPT.md).

## External scanner (C + TypeScript contract)

tree-sitter links the external lexer from **`abl/src/scanner.c`** when building `tree-sitter-abl.wasm` (Emscripten). That file stays C by design.

Hand-maintained TypeScript documents the same contract:

- **`abl/src/scanner.host.ts`** — `AblExternalTokenKind`, C enum names, grammar external rule names, export symbols, stateless payload
- **`abl/src/scanner.manifest.ts`** — verifies `scanner.c` exists, exports the tree-sitter ABI, and that C `enum TokenType` and `grammar.ts` `externals` match the host constants

`npm run compile:grammar` and `npm run build:parser` run this check automatically. Run `npm run check:scanner` after editing `scanner.c` or externals.

## Changing ABL parse logic

1. Edit `abl/grammar.ts` and/or `abl/src/scanner.c` (and update `abl/src/scanner.host.ts` if token kinds or externals change), then `npm run grammar:abl:build` from the repo root.
2. Rebuild grammar WASM (requires **emscripten** `emcc` or Docker on `PATH`):
   ```bash
   cd parser/abl && npx tree-sitter-cli@0.24.7 generate && npx tree-sitter-cli@0.24.7 build-wasm
   ```
3. From repo root: `npm run build:parser` (copies WASM into `src/assets/`).

If `build-wasm` is unavailable, commit an updated `abl/tree-sitter-abl.wasm` built on a machine with `emcc`.

## Changing the tree-sitter engine

`runtime/tree-sitter.js` and `runtime/tree-sitter.wasm` come from tree-sitter **v0.24.7**. Replacing them requires rebuilding `lib/binding_web` from the tree-sitter repo (Emscripten). Keep runtime and grammar WASM on the same tree-sitter generation (0.24.x).

## Sync from upstream

`npm run sync:parser-sources` re-downloads pinned npm/git artifacts into `parser/` (see `scripts/sync-parser-sources.ts`).
