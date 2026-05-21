# CABL + SonarLint VS Code — Research Notes

> **Gaps:** The Riverside wiki at https://wiki.rssw.eu/cabl/Home.md mirrors the GitHub wiki and has **no separate rule-category pages** at depth 1–2. Most CABL rules live in commercial JARs (`riverside-rules`, `cabl-security-rules`) not in the public repo — only **7** open-source `@Rule` classes were found under `sonar-openedge`. SonarLint embeds analyzers via bundled language server (`sonarlint-abl` npm dep); analyzer bytecode is not in the VS Code repo's `src/` beyond OpenEdge LSP integration glue.

**Extension repo (tag V4.33.99001):** https://github.com/Riverside-Software/sonarlint-vscode/tree/V4.33.99001  
**CABL / SonarQube plugin:** https://github.com/Riverside-Software/sonar-openedge  
**Issue tracker:** https://github.com/Riverside-Software/sonar-openedge/issues

---

## SonarLint extension behaviors / config

**Sources:**

- https://raw.githubusercontent.com/Riverside-Software/sonarlint-vscode/V4.33.99001/README.md
- https://raw.githubusercontent.com/Riverside-Software/sonarlint-vscode/V4.33.99001/package.json
- https://raw.githubusercontent.com/Riverside-Software/sonarlint-vscode/V4.33.99001/src/openedge/openedge.ts

### Identity and dependencies

| Field | Value |
|-------|-------|
| Extension id | `RiversideSoftware.sonarlint-abl` (npm name `sonarlint-abl`) |
| Display name | **CABL** |
| Publisher | RiversideSoftware |
| VS Code engine | `^1.99.3` |
| Hard dependency | `RiversideSoftware.openedge-abl-lsp` (OpenEdge ABL LSP) |
| Soft dependency | Official `SonarSource.sonarlint-vscode` for non-ABL languages |
| Entry | `./dist/extension` (webpack bundle; upstream SonarLint fork) |
| Language server | `vscode-languageclient`; embedded `sonarlint-abl` package |

### Activation

```json
"activationEvents": ["workspaceContains:openedge-project.json"]
```

Extension activates when the workspace contains **`openedge-project.json`** (OpenEdge LSP project marker). Requires a real folder workspace (`virtualWorkspaces: false`).

### OpenEdge integration (`src/openedge/openedge.ts`)

Before analysis, the language server can call **`openedge-abl-lsp`** API:

```typescript
extensionApi.getFileInfo(fileUri)  // → propath, databases, preprocessor context, etc.
```

Returns `null` if LSP extension missing or activation fails. This couples CABL diagnostics to the same project model as the ABL language server.

### User-facing views (activity bar: **CABL**)

| View id | Purpose |
|---------|---------|
| `sonarlint-abl.ConnectedMode` | Bind to SonarQube Server |
| `sonarlint-abl.AllRules` | Local rule set (standalone mode) |
| `sonarlint-abl.AIAgentsConfiguration` | MCP / AI agent integration |
| `sonarlint-abl.HelpAndFeedback` | Docs links |
| `sonarqube-abl.Findings` | Panel: project findings (connected mode) |
| `sonarlint-abl.IssueLocations` | Explorer: multi-location issues |

### Key settings (`sonarlint-abl.*`)

| Setting | Purpose |
|---------|---------|
| `sonarlint-abl.rules` | Per-rule `level: off\|on` and `parameters` — keys like `repo:key` (e.g. `javascript:S1481` in docs; ABL rules use OpenEdge repo keys) |
| `sonarlint-abl.connectedMode.connections.sonarqube` | Server URL, token, `connectionId`, notification toggle |
| `sonarlint-abl.connectedMode.project` | Bind folder → `projectKey` + `connectionId` |
| `sonarlint-abl.automaticAnalysis` | Real-time analysis on open files (default on) |
| `sonarlint-abl.testFilePattern` | Glob for test files (rules often skipped) |
| `sonarlint-abl.analysisExcludesStandalone` | Standalone exclude globs |
| `sonarlint-abl.analyzerProperties` | Extra key/value props passed to analyzers (maps to `sonar.oe.*` on server) |
| `sonarlint-abl.ls.javaHome` | JRE 17+ for language server |
| `sonarlint-abl.ls.vmargs` | e.g. `-Xmx1024m` |
| `sonarlint-abl.output.showVerboseLogs` | Verbose CABL output |
| `sonarlint-abl.trace.server` | LSP trace |
| `sonarlint-abl.focusOnNewCode` | New-code issue filtering |
| `sonarlint-abl.disableTelemetry` | Opt out of SonarSource telemetry |

Deprecated: `sonarlint-abl.connectedMode.servers` → use `connections.sonarqube`.

### Commands (sample)

- `SonarLint.ABL.AnalyseOpenFile` — editor title bar
- `SonarLint.ABL.ShowSonarLintOutput` — CABL output channel
- `SonarLint.ABL.ActivateRule` / `DeactivateRule` / `ResetDefaultRule`
- `SonarLint.ABL.ConnectToSonarQube` — connected mode setup
- `SonarLint.ABL.ScanForHotspotsInFolder` — security hotspots

### AI / language-model tools (`src/languageModelTools/`)

| Tool | Behavior |
|------|----------|
| `sonarqube_analyze_file` | Open file, run analysis, show Problems + CABL Findings |
| `excludeFileOrFolderTool` | Exclude paths from analysis |
| `listPotentialSecurityIssuesTool` | List hotspot candidates |
| `setUpConnectedModeTool` | Connected mode setup assist |

### Analysis modes

1. **Standalone** — bundled CABL rules + local `sonarlint-abl.rules`; Rules tree visible.
2. **Connected** — Quality Profile and exclusions from SonarQube Server override local rule config; full-project analysis and quality gate notifications.

### Server-side analyzer config (mirrors IDE `analyzerProperties`)

**Source:** https://github.com/Riverside-Software/sonar-openedge/wiki/Property-list

Important `sonar.oe.*` properties for ABL analysis:

| Property | Role |
|----------|------|
| `sonar.oe.propath` | ProPath (PL + dirs) |
| `sonar.oe.binaries` | R-code output dirs |
| `sonar.oe.dlc` | OpenEdge install (`$DLC`) |
| `sonar.oe.databases` / `sonar.oe.aliases` | DF schema + alias mapping |
| `sonar.oe.file.suffixes` | Default `p,w,i,cls` |
| `sonar.oe.include.suffixes` | Default `i` (includes parsed, limited rules) |
| `sonar.oe.preprocessor.*` | `opsys`, `window-system`, `proversion`, `batch-mode`, `process-architecture` |
| `sonar.oe.proparse.debug` | AST HTML dump to `.proparse/` |
| `sonar.oe.skipProparse` | Skip AST + Proparse rules |
| `sonar.oe.proparse.recover` | Token injection/deletion on parse errors |
| `sonar.oe.proparse.tokenStartChars` | Extra valid name-start chars (`&`, `/`, `` ` ``, etc.) |
| `sonar.oe.issues.annotations` | Suppress issues in annotated blocks (default `@InitializeComponent`) |
| `sonar.oe.cpd.*` | Copy-paste detection tuning |
| `sonar.oe.rtb` | Roundtable compatibility (XREF/listing paths) |

**Build expectation (server):** Ant + **PCT** with XML XREF, listing, optional profiler coverage — see https://github.com/Riverside-Software/sonar-openedge/wiki/Getting-started

---

## CABL rule categories / examples

**Sources:**

- https://wiki.rssw.eu/cabl/Home.md
- https://github.com/Riverside-Software/sonar-openedge/wiki
- https://github.com/Riverside-Software/sonar-openedge/tree/main/openedge-plugin/src/main/java/org/sonar/plugins/openedge/checks
- https://raw.githubusercontent.com/Riverside-Software/sonar-openedge/main/openedge-plugin/src/main/resources/rules/compiler-warnings.json

### Platform capabilities (from CABL home)

CABL on SonarQube reports:

- **Metrics** — LOC, comment density, complexity, shared objects
- **Issues** — performance, deprecated keywords, incorrect builtins, runtime risks
- **Coverage** — from unit test profiler output
- **Duplication** — token-based CPD (Proparse-aware)
- **Compiler warnings** — mapped from OpenEdge compile listing
- **XREF** — cross-reference / shared object analysis
- **Security** — vulnerabilities and hotspots (commercial `cabl-security-rules`)

### Rule packaging

| Package | License | Notes |
|---------|---------|-------|
| OpenEdge plugin core | LGPL (open source) | Parser (Proparse), metrics, OSS checks |
| `riverside-rules` | Commercial | Large rule set; evaluation license via SonarQube admin |
| `cabl-security-rules` | Commercial | Security rules |

Rule keys follow SonarQube convention: **`openedge:<ruleKey>`** (repository `openedge` / `rssw-oe` in resources).

### Open-source Proparse checks (public repo)

Analyzer base: **`OpenEdgeProparseCheck`** — walks **Proparse AST** (`JPNode`, `ABLNodeType`).

| Class | Rule theme | Example message |
|-------|------------|-----------------|
| `ClumsySyntax` | FORMATTED / maintainability | Block must end with `END` + period; statement must end with period; METHOD prototype ends with `.` not `:` |
| `LargeTransactionScope` | RELIABILITY / efficiency | Transaction scope spans entire procedure |
| `FixedLineNumberRule` | (see source) | Line-number / listing related |
| `MultiLineIssue` | Multi-line reporting helper | — |
| `NoOpDatabaseRule` | Database / DF | No-op DB definitions |
| `NoSonarKeywordIssue` | Suppression | `@NoSonar` / annotation handling |

**ClumsySyntax** inspects `CATCH`, `CASE`, `DO`, `FOR`, `REPEAT`, `FINALLY`, `PROCEDURE`, `FUNCTION`, `METHOD` nodes — directly maps to **formatting/lint** rules for abl-helper.

### Compiler warning rules (JSON-defined)

**Source:** `openedge-plugin/src/main/resources/rules/compiler-warnings.json`

| Key | Name | Priority |
|-----|------|----------|
| `compiler.warning` | Generic compiler warning | MINOR |
| `compiler.warning.214` | TRANSACTION inside transaction | CRITICAL |
| `compiler.warning.1688` | Subscript in CONTAINS ignored | MINOR |
| `compiler.warning.2750` | RETURN missing value in UDF/method | MINOR |
| `compiler.warning.2965` | Non-constant in preprocessor expr | BLOCKER |
| `compiler.warning.4788` | Translation exceeds length | CRITICAL |
| `compiler.warning.4958` | IMPORT UNFORMATTED multi-field | MINOR |
| `compiler.warning.5378` | BUFFER-COPY EXCEPT/USING source-only | MINOR |
| `compiler.warning.12115` | Expression is constant | MINOR |
| `compiler.warning.14786` | Schema name casing | MAJOR |
| `compiler.warning.14789` | Field must be qualified | MAJOR |
| `compiler.warning.15090` | Dead code | CRITICAL |
| `compiler.warning.18494` | Abbreviated keywords not authorized | INFO |
| `compiler.warning.19822` | All paths must return value | CRITICAL |

These require **PCT compile listing** output on the server; in IDE mode, equivalent checks need compile integration or static approximation.

### Clean Code / impact metadata (rule model)

OSS checks use annotations from `openedge-checks` API:

- `@CleanCode(attribute = "FORMATTED" | "LOGICAL" | "EFFICIENT" | …)`
- `@Impact(quality = "MAINTAINABILITY" | "RELIABILITY", severity = "…")`
- `@SqaleConstantRemediation("2min" | "3h" | …)`

Commercial rules follow the same SonarQube issue model (type, severity, effort, tags).

### Categories implied by documentation (not a formal wiki taxonomy)

| Category | Examples |
|----------|----------|
| **Syntax / style** | ClumsySyntax, abbreviated keywords (18494) |
| **Correctness** | Missing RETURN (2750, 19822), dead code (15090), preprocessor constants (2965) |
| **Data access / schema** | Qualified fields (14789), schema casing (14786) |
| **Transactions / performance** | LargeTransactionScope, TRANSACTION misuse (214) |
| **Database / DF** | NoOpDatabaseRule, dump file checks |
| **Security** | Hotspots (commercial), MCP `listPotentialSecurityIssuesTool` |
| **Duplication** | CPD engine (`sonar.oe.cpd.*`) |
| **Coverage** | Profiler `.out` parsing |

---

## Mappable future diagnostics for abl-helper

Prioritized mappings from CABL/SonarLint behavior to a lightweight VS Code ABL extension **without** shipping the full Java analyzer:

### Tier 1 — Pure syntax / AST (no database)

| Diagnostic | CABL inspiration | abl-helper approach |
|------------|------------------|---------------------|
| Missing statement terminator | `ClumsySyntax` | Parser: last child of statement must be `PERIOD` |
| Block `END` + period | `ClumsySyntax` | Match `DO/END`, `FOR/END`, etc. |
| METHOD prototype `.` vs body `:` | `ClumsySyntax` | Different delimiters for abstract/interface vs implementation |
| Abbreviated keywords | `compiler.warning.18494` | Flag tokens that are strict abbreviations when `require-full-keywords` enabled |
| Preprocessor at column 0 | Preprocessor docs | Directive not after only whitespace/comments |

### Tier 2 — Semantic (needs symbol / schema context)

| Diagnostic | CABL inspiration | abl-helper approach |
|------------|------------------|---------------------|
| Unqualified field | `compiler.warning.14789` | Require `table.field` when ambiguous |
| Schema name casing | `compiler.warning.14786` | Compare to DF / dictionary |
| Large transaction scope | `LargeTransactionScope` | Detect TRANSACTION spanning whole procedure |
| Dead code (simple) | `compiler.warning.15090` | Unreachable after `RETURN`/`STOP`/`QUIT` |

### Tier 3 — Requires compile / XREF / Proparse parity

| Diagnostic | CABL inspiration | abl-helper approach |
|------------|------------------|---------------------|
| Compiler warnings | `compiler.warning.*` | Invoke OpenEdge compile or parse `.lst` |
| Shared object / XREF | CABL metrics | Needs PCT XML XREF |
| Copy-paste | `sonar.oe.cpd.*` | Token stream + minimum tokens/lines |
| Full rule set | `riverside-rules` | Integrate CABL extension or language server, not reimplement |

### Config / UX patterns to reuse

- **`openedge-project.json`** as single project root marker (align with CABL + LSP).
- **Rule key namespace** `openedge:<id>` for compatibility with SonarQube importers.
- **Suppression annotations** — support `@NoSonar` / configurable `@InitializeComponent`-style blocks (`sonar.oe.issues.annotations`).
- **Standalone vs connected** — local diagnostics JSON + optional SonarQube profile sync.
- **Analyzer properties** — expose subset of `sonar.oe.preprocessor.*` and `propath` for parse pre-processing.
- **Test file globs** — de-prioritize rules on `**/test/**` patterns.
- **Issue locations view** — multi-range diagnostics for related spans (SonarLint `IssueLocations` pattern).

### Integration options

1. **Delegate** — Recommend/install CABL + `openedge-abl-lsp`; abl-helper focuses on editing, symbols, formatting.
2. **Subset linter** — Port OSS checks (period/colon rules) into TypeScript/Rust parser.
3. **LSP bridge** — If abl-helper becomes an LSP: implement `textDocument/publishDiagnostics` with compatible rule keys for CABL import.

### Reference links

| Resource | URL |
|----------|-----|
| CABL wiki (GitHub) | https://github.com/Riverside-Software/sonar-openedge/wiki |
| Getting started | https://github.com/Riverside-Software/sonar-openedge/wiki/Getting-started |
| Property list | https://github.com/Riverside-Software/sonar-openedge/wiki/Property-list |
| Roundtable mode | https://github.com/Riverside-Software/sonar-openedge/wiki/Using-CABL-with-Roundtable |
| SonarLint language server | https://github.com/Riverside-Software/sonarlint-language-server |
| OpenEdge LSP marketplace | https://marketplace.visualstudio.com/items?itemName=RiversideSoftware.openedge-abl-lsp |
