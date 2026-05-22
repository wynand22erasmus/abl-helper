/**
 * Build-time validation: `scanner.c` exists, exports the tree-sitter ABI, and
 * stays aligned with `scanner.host.ts` / `grammar.ts` externals.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ABL_EXTERNAL_SCANNER_EXPORTS,
  ABL_GRAMMAR_EXTERNAL_RULES,
  ABL_SCANNER_C_RELATIVE_PATH,
  ABL_SCANNER_C_TOKEN_NAMES,
} from "./scanner.host.js";

export interface ScannerManifestResult {
  scannerPath: string;
  cTokenNames: readonly string[];
  grammarExternals: readonly string[];
}

function repoRoot(): string {
  return process.cwd();
}

function readUtf8(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${path.relative(repoRoot(), filePath)}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

/** Parse `enum TokenType { ... }` from scanner.c. */
export function parseScannerCTokenEnum(source: string): string[] {
  const block = source.match(/enum\s+TokenType\s*\{([^}]*)\}/s);
  if (!block) {
    throw new Error("scanner.c: enum TokenType not found");
  }
  return block[1]!
    .split(",")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter((name) => name.length > 0);
}

/** Parse `externals: ($) => [ $._foo, ... ]` rule names from grammar.ts / grammar.js. */
export function parseGrammarExternals(source: string): string[] {
  const block = source.match(/externals:\s*\(\$\)\s*=>\s*\[([\s\S]*?)\]/);
  if (!block) {
    throw new Error("grammar: externals array not found");
  }
  const names: string[] = [];
  const ruleRe = /\$\.(_[a-z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(block[1]!)) !== null) {
    names.push(m[1]!);
  }
  if (names.length === 0) {
    throw new Error("grammar: no external rule names parsed");
  }
  return names;
}

function assertSameOrder(
  label: string,
  expected: readonly string[],
  actual: readonly string[],
): void {
  if (expected.length !== actual.length) {
    throw new Error(
      `${label}: length ${actual.length} !== expected ${expected.length}`,
    );
  }
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(
        `${label}: index ${i} got "${actual[i] ?? "(missing)"}", expected "${expected[i]}"`,
      );
    }
  }
}

/**
 * Validate vendored external scanner contract. Throws on mismatch.
 * @param root — repository root (default: cwd)
 */
export function validateAblExternalScanner(root: string = repoRoot()): ScannerManifestResult {
  const scannerPath = path.join(root, ABL_SCANNER_C_RELATIVE_PATH);
  const grammarPath = path.join(root, "parser", "abl", "grammar.ts");
  const scannerSource = readUtf8(scannerPath);
  const grammarSource = readUtf8(grammarPath);

  for (const symbol of ABL_EXTERNAL_SCANNER_EXPORTS) {
    if (!scannerSource.includes(symbol)) {
      throw new Error(`scanner.c: missing export ${symbol}`);
    }
  }

  const cTokenNames = parseScannerCTokenEnum(scannerSource);
  const grammarExternals = parseGrammarExternals(grammarSource);

  assertSameOrder("scanner.c TokenType", ABL_SCANNER_C_TOKEN_NAMES, cTokenNames);
  assertSameOrder("grammar.ts externals", ABL_GRAMMAR_EXTERNAL_RULES, grammarExternals);

  return { scannerPath, cTokenNames, grammarExternals };
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const result = validateAblExternalScanner();
    console.log(
      `OK: ${path.relative(repoRoot(), result.scannerPath)} (${result.cTokenNames.length} external tokens)`,
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
