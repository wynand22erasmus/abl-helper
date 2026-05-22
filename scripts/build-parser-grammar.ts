#!/usr/bin/env node
/**
 * Emit parser/abl/grammar.js (ESM) from grammar.ts for tree-sitter-cli.
 * Strips TS-only lines; keeps `export default grammar(...)`.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { validateAblExternalScanner } from "../parser/abl/src/scanner.manifest.js";

const root = process.cwd();
validateAblExternalScanner(root);

const entry = path.join(root, "parser", "abl", "grammar.ts");
const outfile = path.join(root, "parser", "abl", "grammar.js");

let source = fs.readFileSync(entry, "utf8");
source = source.replace(/^\/\/\/ <reference[^\n]*\r?\n/m, "");
source = source.replace(/^\/\/ @ts-nocheck[^\n]*\r?\n/m, "");

fs.writeFileSync(outfile, source, "utf8");
console.log(`Wrote ${path.relative(root, outfile)} from grammar.ts`);
