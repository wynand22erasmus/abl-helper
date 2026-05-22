#!/usr/bin/env node
/**
 * Print non-TypeScript source files outside ignored trees (one-off repo audit).
 */
import { readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  "node_modules",
  "out",
  ".git",
  "corpus",
  ".tmp-parser-sync",
  ".vscode-test",
]);
const TS_LIKE = new Set([".ts", ".tsx", ".d.ts"]);
const ALWAYS_OK = new Set([
  ".json",
  ".md",
  ".txt",
  ".wasm",
  ".vsix",
  ".p",
  ".code-snippets",
  ".tmLanguage.json",
  ".gitignore",
  ".gitattributes",
  ".yml",
  ".yaml",
  ".lock",
  ".exp",
  ".lib",
  ".obj",
  ".h",
  ".c",
  ".gyp",
  ".toml",
  ".prettierrc",
  ".editorconfig",
  ".mdc",
  ".LICENSE",
  "",
]);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) {
      continue;
    }
    const full = join(dir, name);
    const rel = relative(ROOT, full);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    const ext = extname(name);
    if (TS_LIKE.has(ext) || ALWAYS_OK.has(ext)) {
      continue;
    }
    if (name === "LICENSE" || name === "NOTICE" || name === "CHANGELOG.md") {
      continue;
    }
    out.push(rel);
  }
}

const found: string[] = [];
walk(ROOT, found);
found.sort();

console.log("Non-TypeScript files (excluding node_modules, out, corpus, …):\n");
for (const f of found) {
  console.log(`  ${f}`);
}
console.log(`\nTotal: ${found.length}`);
