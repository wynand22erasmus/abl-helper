# OpenEdge ABL Reference 12.8 — Research Notes

> **Gaps:** The bundle root and several TOC/index pages (`Introduction`, `ABL Syntax Reference`) return minimal content via automated fetch (Zoomin shell). Guessed URLs for preprocessor directives, compilation units, and some lexical pages returned **404**. Preprocessor detail below supplements from the PDT langref (same language, not version-locked to 12.8). The full keyword table lives at the 12.8 Keyword Index page — reproduce from source rather than embedding all ~1,500 rows here.

**Primary bundle:** https://docs.progress.com/bundle/openedge-abl-reference-128

---

## Keywords / Reserved words

**Source:** https://docs.progress.com/bundle/openedge-abl-reference-128/page/Keyword-Index.html

The Keyword Index is the authoritative list of ABL keywords and built-in object names. Columns:

| Column | Meaning |
|--------|---------|
| **Keyword** | Full keyword or built-in object name (built-in procedure/database objects in lower case) |
| **Rsrv** | Reserved indicator. `–` = not reserved. Any other value in this column marks a **reserved** keyword and doubles as the minimum abbreviation when abbreviations are allowed |
| **Minimum abbreviation** | Shortest form ABL accepts (empty = cannot abbreviate) |

**Best practice (12.8):** Avoid abbreviated keywords. Enforce with `COMPILE OPTIONS require-full-keywords` (see compiler warning `18494` in CABL).

**Preprocessor tokens in keyword index** (treated as language tokens, not statement keywords):

- `&GLOBAL-DEFINE` (abbrev `&GLOB`), `&SCOPED-DEFINE` (`&SCOP`), `&UNDEFINE` (`&UNDEF`)
- `&IF`, `&THEN`, `&ELSE`, `&ELSEIF`, `&ENDIF`, `&MESSAGE`, `&WEBSTREAM`
- Built-in preprocessor names: `{&BATCH-MODE}`, `{&FILE-NAME}`, `{&LINE-NUMBER}`, `{&OPSYS}`, `{&PROCESS-ARCHITECTURE}`, `{&SEQUENCE}`, `{&WINDOW-SYSTEM}`

**Operators / punctuation also indexed:** `+`, `-`, `.`, `*`, `/`, `:`, `?`, `@`, `[`, `]`, `^`, `'`, `<`, `<=`, `<>`, `=`, `>`, `>=`

**Reserved vs non-reserved examples** (from index):

| Keyword | Reserved? | Min abbrev |
|---------|-----------|------------|
| `ACCUMULATE` | Yes | `ACCUM` |
| `AMBIGUOUS` | Yes | `AMBIG` |
| `DEFINE` | Yes | `DEF` |
| `IF`, `DO`, `FOR`, `END`, `RUN`, `CLASS`, `METHOD` | No | varies / none |
| `PROCEDURE` | No | `PROCE` |

**Runtime check:** `KEYWORD()` function returns the full keyword if the expression matches a reserved keyword or valid abbreviation, else `?`.  
Source: https://documentation.progress.com/output/ua/OpenEdge_latest/dvref/keyword-function.html

**For highlighting/parsing:** Maintain the full Keyword Index as a machine-readable set; distinguish reserved (`Rsrv ≠ –`) from merely recognized tokens; treat `&`-directives and `{&name}` as separate lexer modes.

---

## Lexical / syntax rules

**Sources:**

- https://docs.progress.com/bundle/openedge-abl-reference-128/page/ABL-Syntax-Reference.html (index only via fetch)
- https://docs.progress.com/bundle/openedge-abl-reference-128/page/Type-name-syntax.html
- https://documentation.progress.com/output/ua/OpenEdge_latest/pdsoe/PLUGINS_ROOT/com.openedge.pdt.langref.help/rfi1424919509131.html (PDT syntax reference TOC — supplementary)

### General

- ABL reference entries describe **compile-time** behavior (compiler) and **run-time** behavior (AVM).
- Language elements are supported on all interfaces/OS unless a page says otherwise.
- **Statements end with `.` (period)** — significant for blocks (`END` + `.`) vs prototypes (`:` or `.` depending on construct).

### Identifiers and type names

From **Type-name syntax** (12.8):

- **Package segments:** period-separated path mirroring PROPATH directories; class file name must match `class-interface-or-enum-name`; must start alphabetic; no period or space in simple name.
- **Class type names:** alphanumeric plus `#`, `$`, `%`, `-`, `_`. Cannot use `Progress` as first package component for user classes.
- **.NET types:** `namespace.dotNET-object-name[+inner-name]` — inner types use `+` not `.`.
- **Arrays:** `EXTENT [ constant ]` on types; `VAR` statement has alternate array syntax.
- **Ambiguity rule:** Object type references can clash with `table.field` / buffer syntax; use ≥3 package components or naming conventions to disambiguate.
- **Case sensitivity:** First reference to a .NET type is case-sensitive; .NET member names are case-insensitive in ABL.

### Comments (typical ABL — confirm in special-character entries when available)

- Block: `/* ... */`
- Preprocessor/compile directives start at beginning of line (after blanks/tabs/comments only) — see preprocessor section.

### Compilation units

From **CONNECT statement** and **CLASS/METHOD** pages:

- **External procedure** (`.p`), **class** (`.cls`), and related compilation units are resolved at compile/start of execution.
- Database connections established at runtime via `CONNECT` in the **same** compilation unit cannot be used for direct table access in that unit — split into separate procedures/classes.
- Class-only statements (`CLASS`, `METHOD`, etc.) apply only in `.cls` files.

### File extensions (conventional, from ecosystem docs)

- `.p` procedures, `.w` windows, `.i` includes, `.cls` classes — used by analyzers (CABL default suffixes).

---

## Statements / types

**Sources:**

- https://docs.progress.com/bundle/openedge-abl-reference-128/page/Data-types.html
- https://docs.progress.com/bundle/openedge-abl-reference-128/page/CONNECT-statement.html
- https://docs.progress.com/bundle/openedge-abl-reference-128/page/CLASS-statement.html
- https://docs.progress.com/bundle/openedge-abl-reference-128/page/METHOD-statement.html

### Data type categories (12.8)

1. **ABL primitive types** — `CHARACTER`, `INTEGER`, `INT64`, `DECIMAL`, `DATE`, `DATETIME`, `DATETIME-TZ`, `LOGICAL`, `RAW`, `MEMPTR`, `HANDLE`, `RECID`, `ROWID`, `COM-HANDLE`, `LONGCHAR`, `BLOB`, `CLOB`, etc.
2. **Object types** — ABL classes/interfaces/enums; .NET classes/interfaces; user-defined via `CLASS`, `INTERFACE`, `ENUM`.
3. **Handle-based objects** — widgets, buffers, queries, streams, etc. (weakly typed via `HANDLE`).
4. **Arrays** — one-dimensional; `EXTENT`; mappable to 1D .NET arrays.

Primitive keywords appear in: `DEFINE VARIABLE`, `DEFINE PARAMETER`, `DEFINE PROPERTY`, temp-table fields, `FUNCTION`/`METHOD` return types, parameters.

### Statement families (from Syntax Reference TOC — representative)

**Control / structure:** `IF`, `ELSE`, `CASE`, `DO`, `REPEAT`, `FOR`, `WHILE`, `LEAVE`, `NEXT`, `RETURN`, `UNDO`, `STOP`, `QUIT`, `BLOCK-LEVEL ON ERROR UNDO, THROW`

**Data / DB:** `DEFINE`, `FIND`, `FOR EACH`, `CREATE`, `DELETE`, `RELEASE`, `BUFFER-COPY`, `OPEN QUERY`, `CLOSE QUERY`, `CONNECT`, `DISCONNECT`

**OO:** `CLASS`, `INTERFACE`, `ENUM`, `METHOD`, `CONSTRUCTOR`, `DESTRUCTOR`, `NEW`, `DYNAMIC-NEW`, `SUPER`, `THIS-OBJECT`, `USING`, `IMPLEMENTS` (in class header)

**I/O / UI:** `DISPLAY`, `UPDATE`, `PROMPT-FOR`, `MESSAGE`, `PUT`, `EXPORT`, `IMPORT`, widget phrases

**Integration:** `.NET` interop (`ASSEMBLY`, `CAST`, `BOX`/`UNBOX`), AppServer, web (`WEBSTREAM` preprocessor family for SpeedScript)

### CONNECT statement (illustrative syntax rules)

```
CONNECT { physical-name | VALUE(expression) [options] | options } [ NO-ERROR ].
```

- `physical-name`: unquoted or quoted string; restricted charset for DB names.
- `VALUE(...)`: dynamic connection string; use `QUOTER()` for passwords with special chars.
- `NO-ERROR`: suppresses `ERROR` from the statement itself; check `ERROR-STATUS`.
- **Compilation unit rule:** DB must be connected before the unit that references its tables runs.

---

## Preprocessor

**12.8 bundle:** Individual preprocessor directive pages were not found at guessed URLs (404). Use Keyword Index for token list.

**Supplementary (PDT langref — language-compatible):**

- https://documentation.progress.com/output/ua/OpenEdge_latest/pdsoe/PLUGINS_ROOT/com.openedge.pdt.langref.help/rfi1424919776406.html — `&SCOPED-DEFINE`
- https://documentation.progress.com/output/ua/OpenEdge_latest/pdsoe/PLUGINS_ROOT/com.openedge.pdt.langref.help/rfi1424919778459.html — `{ &preprocessor-name }`

### Directives (from keyword index + PDT)

| Directive | Role |
|-----------|------|
| `&GLOBAL-DEFINE` | Global compile-time constant |
| `&SCOPED-DEFINE` | Scoped compile-time constant |
| `&UNDEFINE` | Remove definition |
| `&IF` / `&THEN` / `&ELSE` / `&ELSEIF` / `&ENDIF` | Conditional compilation |
| `&MESSAGE` | Compiler message |
| `&WEBSTREAM` | SpeedScript web stream |

### Placement rules (`&SCOPED-DEFINE`, general for directives)

- Must be at **beginning of a line**, preceded only by blanks, tabs, or `/* */` comments.
- `{&name}` expands everywhere, **including inside quoted strings**.
- `&GLOBAL-DEFINE` vs `&SCOPED-DEFINE`: same syntax, different scope.
- Preprocessor names can override compile-time argument names from include files.
- Line continuation in definitions: `~` at EOL.

### Built-in `{&...}` names

| Name | Expands to |
|------|------------|
| `{&BATCH-MODE}` | `"yes"` / `"no"` |
| `{&FILE-NAME}` | Current compile file name |
| `{&LINE-NUMBER}` | Current line |
| `{&OPSYS}` | `"UNIX"` / `"WIN32"` |
| `{&PROCESS-ARCHITECTURE}` | `"32"` / `"64"` |
| `{&SEQUENCE}` | Incrementing integer per reference |
| `{&WINDOW-SYSTEM}` | e.g. `"MS-WINDOWS"`, `"TTY"` |

SpeedScript also defines `{&DISPLAY}`, `{&OUT}`, `{&OUT-FMT}`, `{&OUT-LONG}`, `{&WEBSTREAM}` aliases.

**Include / argument syntax (related):** `{ file.i }`, `{&arg}` compile-time arguments — see `{ } Include file reference` and `{ } Argument reference` in Syntax Reference.

---

## Classes / methods

**Sources:**

- https://docs.progress.com/bundle/openedge-abl-reference-128/page/CLASS-statement.html
- https://docs.progress.com/bundle/openedge-abl-reference-128/page/METHOD-statement.html
- https://docs.progress.com/bundle/openedge-abl-reference-128/page/Type-name-syntax.html

### CLASS statement (`.cls` only)

```
CLASS class-type-name [ INHERITS super-type-name ]
  [ IMPLEMENTS interface-type-name [, ...] ]
  [ USE-WIDGET-POOL ]
  [ ABSTRACT | FINAL ]
  [ SERIALIZABLE ]:
  class-body
END CLASS.
```

**Class body members (any order):** data members, properties, methods, events, constructors, destructor, class-scoped handle objects, triggers (`ON`), external `FUNCTION` prototypes.

**Inheritance defaults:** ABL classes inherit `Progress.Lang.Object`; .NET `System.Object` also inherits `Progress.Lang.Object` in OpenEdge.

**Modifiers:** `ABSTRACT` (cannot instantiate; may define abstract members), `FINAL` (cannot inherit), `SERIALIZABLE` (JSON/binary/AppServer passing constraints).

### METHOD statement (`.cls` / interface)

**Implementation:**

```
METHOD [ PRIVATE | PACKAGE-PRIVATE | PROTECTED | PACKAGE-PROTECTED | PUBLIC ]
  [ STATIC | ABSTRACT ] [ OVERRIDE ] [ FINAL ]
  { VOID | return-type } method-name ( [ parameter [, ...] ] ) :
  method-body
END METHOD.
```

**Interface prototype:** ends with `.` not `:`  
**Abstract prototype:** `ABSTRACT` … `.`  
**Access default:** `PUBLIC`. `OVERRIDE` cannot narrow .NET visibility.

**Related instantiation:** `NEW`, `DYNAMIC-NEW`, `Progress.Lang.Class:New()`, `NEW function (classes)`.

---

## Use for highlighting / parsing / lint / format / outline

| Concern | Guidance from reference |
|---------|-------------------------|
| **Syntax highlighting** | Token classes: preprocessor (`&…`, `{&…}`, `{file.i}`), operators/punctuation from keyword index, reserved vs non-reserved keywords, string/comment modes, `.` as statement terminator, `:` for block headers / method bodies |
| **Parsing** | Period-terminated statements; block structure `DO/END`, `REPEAT/END`, `FOR/END`, `METHOD/END METHOD`; class file `CLASS…END CLASS`; distinguish prototype (`.`) vs body (`:`); handle `:` attribute access vs type syntax |
| **Lint** | Reserved word misuse via `KEYWORD()` semantics; require-full-keywords; ambiguous `package.Class.field` (Type-name syntax notes); CONNECT/compilation-unit DB visibility; `.NET` inner type `+`; enum/class member qualification |
| **Formatting** | Preprocessor directives column 0; block `END [keyword]` + period (CABL `ClumsySyntax` aligns with this); indent method bodies under `:` |
| **Document outline** | Top-level: `PROCEDURE`/`FUNCTION` in `.p`; `CLASS`/`INTERFACE` in `.cls`; nested `METHOD`, `CONSTRUCTOR`, `DESTRUCTOR`; `DEFINE` blocks; `&IF` regions for folding |

### High-value 12.8 pages to wire into tooling

| Topic | URL |
|-------|-----|
| Keyword Index | https://docs.progress.com/bundle/openedge-abl-reference-128/page/Keyword-Index.html |
| Data types | https://docs.progress.com/bundle/openedge-abl-reference-128/page/Data-types.html |
| Type-name syntax | https://docs.progress.com/bundle/openedge-abl-reference-128/page/Type-name-syntax.html |
| CLASS | https://docs.progress.com/bundle/openedge-abl-reference-128/page/CLASS-statement.html |
| METHOD | https://docs.progress.com/bundle/openedge-abl-reference-128/page/METHOD-statement.html |
| DEFINE VARIABLE | https://docs.progress.com/bundle/openedge-abl-reference-128/page/DEFINE-VARIABLE-statement.html |
| USING | https://docs.progress.com/bundle/openedge-abl-reference-128/page/USING-statement.html |
| RUN | https://docs.progress.com/bundle/openedge-abl-reference-128/page/RUN-statement.html |
| NO-ERROR option | https://docs.progress.com/bundle/openedge-abl-reference-128/page/NO-ERROR-option.html |

### Suggested next fetch (manual / improved crawler)

- Special-character entries (`.`, `:`, `;`, `{ }` include/argument) from Syntax Reference TOC
- Preprocessor directive pages in 12.8 bundle (discover slugs from PDF/PDT cross-links)
- `Parameter definition syntax`, `Class-based method call`, `Block-level` error handling
