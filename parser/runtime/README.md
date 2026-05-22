# tree-sitter web runtime (vendored)

| File | Role |
|------|------|
| **`tree-sitter.ts`** | ESM TypeScript entry — `loadTreeSitter()` via dynamic `import()` of the binding |
| **`index.ts`** | Re-exports `loadTreeSitter` via dynamic import of `tree-sitter.js` only |
| **`tree-sitter-web.d.ts`** | ESM typings (`export default Parser`) |
| **`tree-sitter.cjs`** | Vendored Emscripten binding ([tree-sitter v0.24.7](https://github.com/tree-sitter/tree-sitter/tree/v0.24.7/lib/binding_web)); not hand-editable |
| **`tree-sitter.wasm`** | Core engine WASM from the [v0.24.7 release](https://github.com/tree-sitter/tree-sitter/releases/tag/v0.24.7) |

The extension loads compiled `tree-sitter.js` through [`src/parser/loadRuntime.ts`](../../src/parser/loadRuntime.ts), which calls `loadTreeSitter()` (dynamic import of vendored `tree-sitter.cjs` inside that module). `npm run compile:parser-runtime` emits `tree-sitter.js` and `index.js` beside the vendored files.
