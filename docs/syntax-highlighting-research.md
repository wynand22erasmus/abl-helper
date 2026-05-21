# Syntax highlighting — research mapping

Grammar sources:

| Layer | File | Origin |
|-------|------|--------|
| Base | [`syntaxes/abl.tmLanguage.json`](../syntaxes/abl.tmLanguage.json) | MIT [chriscamicas/abl-tmlanguage](https://github.com/chriscamicas/abl-tmlanguage) |
| Research injection | [`syntaxes/research-injection.tmLanguage.json`](../syntaxes/research-injection.tmLanguage.json) | Generated from [`docs/research-openedge-abl-reference-128.md`](research-openedge-abl-reference-128.md) |

## Regenerate injection grammar

```bash
npm run grammar:build
```

Input lists:

- [`resources/abl-reserved-keywords.txt`](../resources/abl-reserved-keywords.txt) — Keyword Index **Rsrv** keywords → `keyword.control.reserved.abl`
- [`resources/research-statement-keywords-128.txt`](../resources/research-statement-keywords-128.txt) — 12.8 statement/OO tokens → `keyword.control.statement.abl`

## Scopes added from research

| Research topic | Scope | Notes |
|----------------|-------|-------|
| Reserved keywords (Rsrv) | `keyword.control.reserved.abl` | `DEFINE`, `ACCUMULATE`, `AMBIGUOUS`, operators `AND`/`OR`/`NOT`, etc. |
| Statement families 12.8 | `keyword.control.statement.abl` | `DYNAMIC-NEW`, `BLOCK-LEVEL`, `CONNECT`, `THIS-OBJECT`, … |
| `&WEBSTREAM` | `keyword.control.directive.preprocessor.abl` | Line-start directive |
| Built-in `{&…}` | `variable.preprocessor.builtin.abl` | Adds SpeedScript `{&DISPLAY}`, `{&OUT}`, … |
| .NET inner types | `punctuation.separator.type.abl` | `+` in `Namespace.Type+Inner` |
| Keyword Index operators | `keyword.operator.abl` | `<=`, `<>`, `>=`, `@` |

## Future (from CABL research)

[`docs/research-cabl-sonarlint-validations.md`](research-cabl-sonarlint-validations.md) suggests diagnostics, not TextMate scopes: `ClumsySyntax` (END + period), compiler warning `18494` (require-full-keywords). Those belong in lint/check-syntax, not the grammar.

## Tests

```bash
npm test -- src/test/grammar.test.ts
```
