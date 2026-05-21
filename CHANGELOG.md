# Changelog

## Unreleased

_(nothing yet)_

## 0.2.0 — 2026-05-21

### Fixed

- **Check syntax** — Structured run status (`ok`, `no_listing`, `spawn_failed`, `validation_failed`); no false “no issues” when listing is missing or spawn fails; pre-spawn validation for executable, runner, and working directory; diagnostics cleared on command error.
- **Format commands** — Warn when no ABL editor is active; try/catch on format and parser reload commands.
- **Parser unavailable** — Warnings when outline, Tier B format, or parser reload cannot use tree-sitter (WASM missing).

### Added

- **Autocomplete** — ABL keywords (`resources/abl-keywords.txt`) plus in-file symbols from tree-sitter-abl.
- **Snippets** — common constructs in `snippets/abl.code-snippets` (procedure, class, method, `defvar`, `foreach`, include, etc.).
- Committed **`abl-helper-dev.vsix`** at the repo root for install without running `npm run package` locally.
- **`ablHelper.checkSyntax.verboseListing`** — Optional full listing log (default truncated to 8 KB).
- **Unit tests** — Tier A formatters; extended check-syntax message parsing and status helpers.
- **`src/parseUtil.ts`** — Shared `withParseTree`, `requireAblEditor`, `replaceEntireDocument`.

### Changed

- **Build pipeline** — `npm run build` runs `grammar:build` then `compile` (esbuild → `out/extension.js`); `npm run package` produces `abl-helper-dev.vsix`.
- **TypeScript-only repo** — extension code (`src/`), scripts (`scripts/`), and root tooling (`esbuild.config.ts`, `eslint.config.ts`, `vitest.config.ts`) are TypeScript; `npm run typecheck` covers `tsconfig.json` + `tsconfig.tools.json`; `npm run check:typescript-only` blocks `.js`/`.jsx`/`.mjs` under `src/` and `scripts/`.
- **Diagnostics** — Compiler messages use source `ABL Helper`; user-facing toasts use unified `ABL Helper:` prefix.
- **Outline** — Debounce via `ablHelper.outline.debounceMs`.
- **Keyword completion** — Stops building items after 80 matches.
- **Corpus tests** — Use settings-aligned defaults (`1048576` bytes, sample `400`); corpus settings documented as test-only in `package.json`.

## 0.1.0 — 2026-05-20

- Initial release: ABL syntax highlighting (TextMate), document outline (tree-sitter), Tier A formatting, OpenEdge check-syntax command, ADE corpus smoke tests, GitHub Actions CI.
