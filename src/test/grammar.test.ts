import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import {
  Registry,
  type IGrammar,
  type IRawGrammar,
  type IToken,
} from "vscode-textmate";
import * as vscodeOniguruma from "vscode-oniguruma";

const root = path.join(__dirname, "..", "..");

function mergeResearchInjection(main: IRawGrammar, injection: IRawGrammar): IRawGrammar {
  const merged = JSON.parse(JSON.stringify(main)) as IRawGrammar;
  const injectRoot = injection.repository?.["research-root"] as
    | { patterns?: { include: string }[] }
    | undefined;
  const injectIncludes = injectRoot?.patterns ?? [];
  const statements = merged.repository?.statements as
    | { patterns?: unknown[] }
    | undefined;
  if (statements?.patterns) {
    statements.patterns = [
      ...injectIncludes,
      ...statements.patterns,
    ];
  }
  if (injection.repository) {
    merged.repository = { ...merged.repository, ...injection.repository };
  }
  return merged;
}

function collectScopes(tokens: IToken[]): string[] {
  const scopes: string[] = [];
  for (const t of tokens) {
    if (t.scopes) {
      scopes.push(...t.scopes);
    } else if ((t as { scope?: string }).scope) {
      scopes.push((t as { scope: string }).scope);
    }
  }
  return scopes;
}

function hasScope(tokens: IToken[], needle: string): boolean {
  return collectScopes(tokens).some((s) => s.includes(needle));
}

describe("ABL TextMate grammar (research injection)", () => {
  let grammar: IGrammar;

  beforeAll(async () => {
    const wasmPath = path.join(
      root,
      "node_modules",
      "vscode-oniguruma",
      "release",
      "onig.wasm",
    );
    const wasmBin = readFileSync(wasmPath).buffer;
    const onigLib = await vscodeOniguruma.loadWASM(wasmBin).then(() => ({
      createOnigScanner: (patterns: string[]) =>
        new vscodeOniguruma.OnigScanner(patterns),
      createOnigString: (s: string) => new vscodeOniguruma.OnigString(s),
    }));

    const main = JSON.parse(
      readFileSync(path.join(root, "syntaxes", "abl.tmLanguage.json"), "utf8"),
    ) as IRawGrammar;
    const injection = JSON.parse(
      readFileSync(
        path.join(root, "syntaxes", "research-injection.tmLanguage.json"),
        "utf8",
      ),
    ) as IRawGrammar;
    const merged = mergeResearchInjection(main, injection);

    const registry = new Registry({
      onigLib: Promise.resolve(onigLib),
      loadGrammar: async (scopeName: string) => {
        if (scopeName === "source.abl") {
          return merged;
        }
        return null;
      },
    });

    grammar = (await registry.loadGrammar("source.abl"))!;
    expect(grammar).toBeTruthy();
  });

  it("highlights reserved DEFINE as keyword.control.reserved.abl", () => {
    const line = "DEFINE VARIABLE i AS INTEGER NO-UNDO.";
    const { tokens } = grammar.tokenizeLine(line, null);
    expect(hasScope(tokens, "keyword.control.reserved.abl")).toBe(true);
  });

  it("highlights DYNAMIC-NEW statement keyword", () => {
    const line = "o = DYNAMIC-NEW Progress.Lang.Class().";
    const { tokens } = grammar.tokenizeLine(line, null);
    expect(hasScope(tokens, "keyword.control.statement.abl")).toBe(true);
  });

  it("highlights preprocessor &WEBSTREAM at line start", () => {
    const line = "&WEBSTREAM";
    const { tokens } = grammar.tokenizeLine(line, null);
    expect(
      hasScope(tokens, "keyword.control.directive.preprocessor.abl"),
    ).toBe(true);
  });

  it("highlights built-in {&FILE-NAME}", () => {
    const line = "MESSAGE {&FILE-NAME}.";
    const { tokens } = grammar.tokenizeLine(line, null);
    expect(
      hasScope(tokens, "variable.preprocessor.builtin.abl") ||
        hasScope(tokens, "entity.name.function.preprocessor.abl"),
    ).toBe(true);
  });

  it("highlights .NET inner type plus separator", () => {
    const line = "System.IO.Stream+Reader";
    const { tokens } = grammar.tokenizeLine(line, null);
    expect(
      hasScope(tokens, "punctuation.separator.type.abl") ||
        hasScope(tokens, "keyword.operator.abl"),
    ).toBe(true);
  });
});
