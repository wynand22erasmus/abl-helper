#!/usr/bin/env node
/**
 * Copy vendored parser WASM from parser/ into src/assets/ for the extension build.
 * Optionally rebuild ABL grammar WASM when emcc or Docker is available.
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { validateAblExternalScanner } from "../parser/abl/src/scanner.manifest.js";

const root = process.cwd();
validateAblExternalScanner(root);

const assetsDir = path.join(root, "src", "assets");
const runtimeWasm = path.join(root, "parser", "runtime", "tree-sitter.wasm");
const ablWasm = path.join(root, "parser", "abl", "tree-sitter-abl.wasm");
const ablDir = path.join(root, "parser", "abl");

function hasEmccOrDocker(): boolean {
  try {
    execSync("command -v emcc", { stdio: "ignore" });
    return true;
  } catch {
    try {
      execSync("command -v docker", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

function tryRebuildAblWasm(): boolean {
  if (!hasEmccOrDocker()) {
    return false;
  }
  console.log("Rebuilding tree-sitter-abl.wasm from parser/abl/ …");
  execSync("npm run compile:grammar", { cwd: root, stdio: "inherit" });
  execSync("npx tree-sitter-cli@0.24.7 generate", { cwd: ablDir, stdio: "inherit" });
  execSync("npx tree-sitter-cli@0.24.7 build-wasm", { cwd: ablDir, stdio: "inherit" });
  return fs.existsSync(ablWasm);
}

fs.mkdirSync(assetsDir, { recursive: true });

if (process.argv.includes("--rebuild-abl") || process.env.ABL_REBUILD_PARSER_WASM === "1") {
  if (!tryRebuildAblWasm()) {
    console.warn("ABL WASM rebuild skipped or failed; using committed parser/abl/tree-sitter-abl.wasm");
  }
}

for (const [src, name] of [
  [runtimeWasm, "tree-sitter.wasm"],
  [ablWasm, "tree-sitter-abl.wasm"],
] as const) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing ${src} — run npm run sync:parser-sources`);
  }
  fs.copyFileSync(src, path.join(assetsDir, name));
}

console.log("Wrote src/assets/tree-sitter.wasm and tree-sitter-abl.wasm");
