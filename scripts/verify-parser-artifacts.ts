#!/usr/bin/env node
/**
 * Ensure required parser artifacts exist (C scanner, vendored binding, grammar ESM).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { validateAblExternalScanner } from "../parser/abl/src/scanner.manifest.js";

const root = process.cwd();
const required = [
  "parser/abl/grammar.ts",
  "parser/abl/src/scanner.c",
  "parser/abl/src/scanner.host.ts",
  "parser/runtime/tree-sitter.cjs",
  "parser/runtime/tree-sitter.ts",
  "parser/runtime/tree-sitter-web.d.ts",
];

for (const rel of required) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`Missing parser artifact: ${rel}`);
    process.exit(1);
  }
}

const grammarJs = path.join(root, "parser", "abl", "grammar.js");
if (fs.existsSync(grammarJs)) {
  const text = fs.readFileSync(grammarJs, "utf8");
  if (!text.includes("export default grammar")) {
    console.error("parser/abl/grammar.js must be ESM (export default grammar). Run npm run compile:grammar.");
    process.exit(1);
  }
}

validateAblExternalScanner(root);
console.log("Parser artifacts OK");
