#!/usr/bin/env node
/**
 * Refresh vendored parser/ sources from pinned upstream (tree-sitter v0.24.7, tree-sitter-abl 0.1.2).
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const parserDir = path.join(root, "parser");
const runtimeDir = path.join(parserDir, "runtime");
const ablDir = path.join(parserDir, "abl");
const tmp = path.join(root, ".tmp-parser-sync");

function rmrf(p: string): void {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyFile(src: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** Upstream binding_web uses `export =`; ABL Helper uses ESM `export default`. */
function patchTreeSitterWebDts(filePath: string): void {
  const text = fs.readFileSync(filePath, "utf8");
  const modMatch = text.match(/declare module\s+['"][^'"]+['"]\s*\{([\s\S]*)\}\s*$/);
  let body = modMatch ? modMatch[1]!.trim() : text.trim();
  body = body.replace(/\bexport\s*=\s*Parser\b/, "export default Parser");
  const header = `/**
 * ESM typings for the vendored web-tree-sitter binding (tree-sitter.cjs at runtime).
 */
`;
  fs.writeFileSync(filePath, header + body + "\n");
}

rmrf(tmp);
fs.mkdirSync(tmp, { recursive: true });

console.log("Fetching tree-sitter-abl@0.1.2 …");
execSync("npm pack tree-sitter-abl@0.1.2 --pack-destination .tmp-parser-sync", {
  cwd: root,
  stdio: "inherit",
});
execSync("tar -xzf tree-sitter-abl-0.1.2.tgz", { cwd: tmp });

const ablPkg = path.join(tmp, "package");
// grammar.js is generated from grammar.ts via npm run grammar:abl:build — do not copy from npm.
for (const rel of [
  "LICENSE",
  "README.md",
  "src/scanner.c",
  "src/grammar.json",
  "src/node-types.json",
  "tree-sitter-abl.wasm",
]) {
  copyFile(path.join(ablPkg, rel), path.join(ablDir, rel));
}
for (const h of fs.readdirSync(path.join(ablPkg, "src", "tree_sitter"))) {
  copyFile(path.join(ablPkg, "src", "tree_sitter", h), path.join(ablDir, "src", "tree_sitter", h));
}

console.log("Fetching tree-sitter v0.24.7 binding_web …");
const tsRepo = path.join(tmp, "tree-sitter");
execSync(
  "git clone --depth 1 --branch v0.24.7 https://github.com/tree-sitter/tree-sitter.git tree-sitter",
  { cwd: tmp, stdio: "inherit" },
);
const binding = path.join(tsRepo, "lib", "binding_web");
const webDts = path.join(runtimeDir, "tree-sitter-web.d.ts");
copyFile(path.join(binding, "tree-sitter-web.d.ts"), webDts);
patchTreeSitterWebDts(webDts);

const wasmUrl =
  "https://github.com/tree-sitter/tree-sitter/releases/download/v0.24.7/tree-sitter.wasm";
execSync(
  `curl -fsSL "${wasmUrl}" -o "${path.join(runtimeDir, "tree-sitter.wasm")}"`,
  { stdio: "inherit" },
);

const webTreeSitterJs = path.join(root, "node_modules", "web-tree-sitter", "tree-sitter.js");
if (fs.existsSync(webTreeSitterJs)) {
  copyFile(webTreeSitterJs, path.join(runtimeDir, "tree-sitter.cjs"));
} else if (fs.existsSync(path.join(runtimeDir, "tree-sitter.cjs"))) {
  console.warn("web-tree-sitter not installed; keeping existing parser/runtime/tree-sitter.cjs");
} else {
  throw new Error("Install web-tree-sitter once for sync, or copy tree-sitter.cjs manually");
}
copyFile(path.join(tsRepo, "LICENSE"), path.join(runtimeDir, "LICENSE"));

rmrf(tmp);
console.log("Synced parser/runtime and parser/abl from upstream pins.");
console.log("ABL grammar: edit parser/abl/grammar.ts, then npm run grammar:abl:build.");
