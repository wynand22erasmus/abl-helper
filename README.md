# ABL Helper

OpenEdge ABL language support for Visual Studio Code: **syntax highlighting**, **outline**, **formatting**, and **syntax checking** (via local OpenEdge install).

## Features

| Feature | Description |
|--------|-------------|
| Syntax highlighting | TextMate grammar for `.p`, `.cls`, `.w`, `.i` plus research-driven injection (OpenEdge 12.8 reserved keywords, preprocessors) |
| Outline | Document symbols from [tree-sitter-abl](https://github.com/eglekaz/tree-sitter-abl) via bundled WebAssembly |
| Autocomplete | ABL keywords + symbols from the current file (no database schema yet) |
| Snippets | Common constructs — procedure, class, method, `defvar`, `foreach`, include, etc. |
| Format document | Trim trailing whitespace; optional keyword upper/lower; experimental tree-sitter pass (off by default) |
| Check syntax | Runs `_progres -b -p` with a helper procedure; maps compiler listing to diagnostics |

## Requirements

- **VS Code** 1.85+
- **Check syntax only**: OpenEdge 11.7+ with `_progres` on `PATH` via `DLC` (developer license). Set `ablHelper.dlcPath` or the `DLC` environment variable.
- **Outline / parsing**: No OpenEdge required. Parsing uses bundled `web-tree-sitter` with `wasm/tree-sitter.wasm` and `wasm/tree-sitter-abl.wasm` (included in the repo; refresh with `npm run fetch:wasm`).

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `ablHelper.dlcPath` | `""` | OpenEdge DLC root (else `DLC` env) |
| `ablHelper.propath` | `[]` | PROPATH entries; workspace folder appended |
| `ablHelper.parameterFiles` | `[]` | `-pf` files |
| `ablHelper.workingDirectory` | `${workspaceFolder}` | CWD for OpenEdge |
| `ablHelper.batchExecutable` | `_progres` | Batch executable name |
| `ablHelper.format.keywordCaseOnFormatDocument` | `none` | `none` / `upper` / `lower` |
| `ablHelper.format.trimTrailingWhitespace` | `true` | Trim on format |
| `ablHelper.format.enableTreeSitterPass` | `false` | Experimental Tier B formatting |
| `[abl].editor.formatOnSave` | `false` | Disabled by default — format legacy code cautiously |

## Commands

- **ABL Helper: Check Syntax** — compile-check current file
- **ABL Helper: Format Keywords (Upper/Lower Case)**
- **ABL Helper: Trim Trailing Whitespace**
- **ABL Helper: Show Output**
- **ABL Helper: Reload Tree-sitter Parser**

## Formatting risk

Automated formatting can change large legacy sources in ways that are hard to review. Prefer **Format Selection** or keyword-only commands until you trust results on your codebase. Do not enable `editor.formatOnSave` for ABL until you have verified behavior.

## Coexistence with other ABL extensions

You can install **ABL Helper** alongside [Riverside OpenEdge ABL LSP](https://marketplace.visualstudio.com/items?itemName=RiversideSoftware.openedge-abl-lsp) or [ZExt](https://marketplace.visualstudio.com/items?itemName=EzequielGandolfi.openedge-zext). Disable overlapping features (format on save, duplicate grammars) in settings if two extensions fight over the same language.

This extension does **not** provide a full language server, debugger, or compile/deploy pipeline — it focuses on lightweight highlighting, outline, Tier A/B formatting, and a simple check-syntax path.

For a full implemented vs planned feature inventory, see **[docs/FEATURES.md](docs/FEATURES.md)**.

## Feature checklist

Legend: **Done** = available in v0.1.x · **Planned** = on the roadmap below · **Out of scope** = intentionally deferred (use Riverside LSP, ZExt, CABL, etc.)

### Core (plan v1 goals)

| Status | Feature |
|--------|---------|
| Done | Syntax highlighting (`.p`, `.cls`, `.w`, `.i`) — chriscamicas TextMate grammar + [12.8 research injection](docs/syntax-highlighting-research.md) |
| Done | Editor ergonomics — comments, brackets, `//#region` folding, basic indent rules |
| Done | Document outline — tree-sitter-abl symbols (procedure, class, method, etc.) |
| Done | Check syntax — `_progres` subprocess, Problems panel, **ABL Helper** output channel |
| Done | Tier A formatting — trim trailing whitespace; keyword upper/lower commands |
| Done | Tier B formatting (experimental) — minimal tree-sitter pass via `ablHelper.format.enableTreeSitterPass` |
| Done | Settings — DLC, PROPATH, parameter files, working directory |
| Planned | Richer diagnostics — map individual compiler warnings (e.g. 18494 abbreviated keywords) from listing |
| Planned | Tier B formatting — assign / if / case / for / block coverage (Baltic-style, settings-driven) |
| Planned | Expand reserved/statement keyword lists from full [Keyword Index](https://docs.progress.com/bundle/openedge-abl-reference-128/page/Keyword-Index.html) |

### Language intelligence (typical LSP / ZExt / Camicas)

| Status | Feature |
|--------|---------|
| Done | Autocomplete — keywords + in-file symbols (tree-sitter) |
| Planned | Autocomplete — tables, fields (database / dictionary; deferred) |
| Planned | Go to definition / references (includes, procedures, classes) |
| Planned | Hover — schema, variable, method signatures |
| Planned | Rename symbol |
| Done | Code snippets (`snippets/abl.code-snippets`) |
| Planned | Include file suggestions on `{` |
| Out of scope | Full Java language server (see [Riverside openedge-abl-lsp](https://marketplace.visualstudio.com/items?itemName=RiversideSoftware.openedge-abl-lsp)) |

### Build, run, debug (Riverside / ZExt / Camicas)

| Status | Feature |
|--------|---------|
| Planned | Compile current file (beyond check-syntax; xref / listing options) |
| Planned | Run procedure (`_progres` / prowin, batch and interactive) |
| Planned | Deploy source or r-code |
| Planned | `openedge-project.json` (or `.abl-helper.json`) — build paths, DB connections, profiles |
| Planned | Rebuild project / background compile queue |
| Out of scope | Debugger (legacy + PASOE), `launch.json` templates |
| Out of scope | AppBuilder, Data Dictionary, Speedscript pipeline, compile hooks |

### Static analysis (CABL / SonarLint research)

| Status | Feature |
|--------|---------|
| Planned | Lightweight lint rules inspired by [CABL research](docs/research-cabl-sonarlint-validations.md) — e.g. ClumsySyntax-style `END` + period, require-full-keywords |
| Planned | Dictionary / schema awareness for checks and completion |
| Out of scope | SonarQube connected mode, commercial CABL rule packs, metrics/CPD/coverage UI |

### Other extensions’ specialties

| Status | Feature |
|--------|---------|
| Planned | Per-construct formatter settings and optional per-file overrides |
| Out of scope | Class browser tree + `catalog.json` ([Consultingwerk Class Browser](https://marketplace.visualstudio.com/items?itemName=ConsultingwerkApplicationModernizationSolutionsLtd.classbrowser)) |
| Out of scope | Extension API for other tools (`getProjectInfo`, `compile`, `getSchema`, …) |

### Tooling and quality (repo)

| Status | Feature |
|--------|---------|
| Done | TypeScript-only repo — `src/`, `scripts/`, root tooling configs; ESLint + `check:typescript-only` + CI |
| Done | Unit tests — symbols, completion, check-syntax parser, grammar scopes |
| Done | ADE corpus smoke tests (`npm run test:corpus`, CI job) |
| Done | GitHub Actions — build, typecheck, lint, test (corpus job on pinned ADE) |
| Planned | Publish to VS Code Marketplace |
| Planned | Broader ADE corpus assertions (formatter idempotence on allowlist) |

## Roadmap

Phased work after v0.1.0. Order may shift; **Out of scope** items stay external unless goals change.

```mermaid
flowchart LR
  v01[v0.1 Core]
  v02[v0.2 Autocomplete and snippets]
  p2[Phase 2 Intelligence]
  p3[Phase 3 Project and OE]
  p4[Phase 4 Format and Lint]
  p5[Phase 5 Ship]

  v01 --> v02
  v02 --> p2
  p2 --> p3
  p3 --> p4
  p4 --> p5
```

### Phase 2 — Language intelligence

- ~~Autocomplete: keywords + in-file symbols~~ (v0.2)
- ~~Code snippets for common ABL patterns~~ (v0.2)
- Autocomplete: database tables/fields (dictionary / `.df` — when configured)
- Go to definition for includes and local symbols
- Hover for tables/fields where schema is available

### Phase 3 — Project model and OpenEdge workflows

- Read `openedge-project.json` / `.abl-helper.json` (PROPATH, DB, build dirs)
- Compile and run commands with keyboard shortcuts
- Optional deploy hooks (source / r-code)
- Startup procedure and improved check-syntax project context

### Phase 4 — Formatting and lint depth

- Expand Tier B tree-sitter formatting (assign, if, case, for, block, temp-table, using)
- Formatter settings in VS Code (`ablHelper.format.*` per construct)
- Rules from [OpenEdge 12.8 research](docs/research-openedge-abl-reference-128.md) and [CABL research](docs/research-cabl-sonarlint-validations.md) as diagnostics where feasible without SonarQube

### Phase 5 — Release hardening

- Marketplace publish, changelog discipline, compatibility matrix (OE 11.7 / 12.2 / 12.8)
- ADE corpus: pin bumps, optional formatter regression allowlist
- Documentation for coexistence with Riverside LSP / ZExt (which features to disable)

### Explicitly not planned (v1)

- Full LSP server, debugger, PASOE attach, class browser, SonarQube/CABL integration — use the specialized extensions listed under [Coexistence](#coexistence-with-other-abl-extensions).

## Building the extension

**Prerequisites:** [Node.js](https://nodejs.org/) 20+ and npm.

| Goal | Command |
|------|---------|
| Install dependencies | `npm ci` |
| Full build (grammar + extension) | `npm run build` |
| Regenerate research injection grammar only | `npm run grammar:build` |
| Compile TypeScript only | `npm run compile` |
| Watch while editing | `npm run watch` |
| Type-check (`src` + tooling configs) | `npm run typecheck` |
| Lint (ESLint + TypeScript-only guard) | `npm run lint` |
| Package installable `.vsix` | `npm run package` |
| Run tests | `npm test` |

`npm run build` runs `grammar:build` (regenerates `syntaxes/research-injection.tmLanguage.json` from `resources/*.txt`) then `compile` (esbuild → `out/extension.js` and copies `resources/` into `out/resources/`). `npm run package` runs `build` first, then writes **`abl-helper-dev.vsix`** at the repo root (stable name for git and quick install).

A committed **`abl-helper-dev.vsix`** is kept in the repository so you can install the latest dev build without running `npm run package` locally. After changing extension code, run `npm run package` and commit the updated `abl-helper-dev.vsix` when you want others to pick up that build.

**Run from source (F5):** Open this folder in VS Code, run `npm run build`, choose **Run Extension** from the Run and Debug view (see `.vscode/launch.json`).

**Install the VSIX:** Extensions → `...` → **Install from VSIX...** → select `abl-helper-dev.vsix` (from the repo or from `npm run package`).

Parsing is **WASM-only** (`web-tree-sitter` bundled in `out/extension.js`; grammar binaries under `wasm/`). The extension warms the parser on activate so outline and completion avoid a cold start.

## Development

Maintained source in this repository is **TypeScript only** (`.ts`): extension code in `src/`, automation in `scripts/`, and root configs (`esbuild.config.ts`, `eslint.config.ts`, `vitest.config.ts`). Do not add hand-written `.js`, `.jsx`, or `.mjs` under `src/` or `scripts/`. Tooling runs via [tsx](https://github.com/privatenumber/tsx) without a separate compile step. Bundled extension output lives in `out/` (gitignored; `out/extension.js` from esbuild).

```bash
npm ci
npm run build
npm run package   # refresh abl-helper-dev.vsix before committing extension changes
npm test
npm run lint                   # eslint . + check:typescript-only
npm run typecheck              # tsconfig.json (src) + tsconfig.tools.json (scripts + root configs)
npm run check:typescript-only  # fail if .js/.jsx/.mjs exist under src/ or scripts/
```

See [docs/syntax-highlighting-research.md](docs/syntax-highlighting-research.md) for how Progress 12.8 reference notes map to TextMate scopes.

### ADE corpus tests

Uses [progress/ADE](https://github.com/progress/ADE) (`release-12.8.x`, Apache-2.0) as a read-only test corpus — **not** bundled in the VSIX.

```bash
npm run corpus:sync    # shallow clone into corpus/ade (~large download)
npm run test:corpus    # parse smoke on deterministic sample
```

CI checks out ADE at a pinned commit (see `.github/workflows/ci.yml`).

## Credits

Third-party components used by ABL Helper. Full license texts are in [LICENSE](LICENSE) and [NOTICE](NOTICE).

### Parsing (WebAssembly, shipped in the VSIX)

| Component | Source | License |
|-----------|--------|---------|
| [tree-sitter](https://github.com/tree-sitter/tree-sitter) runtime WASM | [tree-sitter v0.24.7 release](https://github.com/tree-sitter/tree-sitter/releases/tag/v0.24.7) (`tree-sitter.wasm`) | MIT |
| [web-tree-sitter](https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web) | npm `web-tree-sitter@0.24.7` (bundled into the extension) | MIT |
| [tree-sitter-abl](https://github.com/eglekaz/tree-sitter-abl) grammar WASM | npm `tree-sitter-abl@0.1.2` (`tree-sitter-abl.wasm` via `npm run fetch:wasm`) | MIT |

### Syntax highlighting (TextMate)

| Component | Source | License |
|-----------|--------|---------|
| OpenEdge ABL grammar | [chriscamicas/abl-tmlanguage](https://github.com/chriscamicas/abl-tmlanguage) (`syntaxes/abl.tmLanguage.json`) | MIT |
| ABL keyword list | Same project (`resources/abl-keywords.txt`) | MIT |
| Research keyword injection | Progress OpenEdge 12.8 reference notes (`resources/*.txt`, `syntaxes/research-injection.tmLanguage.json`) | See [docs/syntax-highlighting-research.md](docs/syntax-highlighting-research.md) |

### Development and tests only (not shipped in the VSIX)

| Component | Source | License |
|-----------|--------|---------|
| [vscode-textmate](https://github.com/microsoft/vscode-textmate) | Grammar unit tests | MIT |
| [vscode-oniguruma](https://github.com/microsoft/vscode-oniguruma) | Oniguruma WASM for grammar tests | MIT |
| [progress/ADE](https://github.com/progress/ADE) | Optional corpus smoke tests (`corpus/ade`, branch `release-12.8.x`) | Apache-2.0 |

## License

MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
