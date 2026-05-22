/**
 * Parser WASM bytes shipped with the extension (src/assets → out/assets on build).
 */
import * as fs from "node:fs";
import * as path from "node:path";

const CORE = "tree-sitter.wasm";
const ABL = "tree-sitter-abl.wasm";

function assetsDirectory(): string {
  for (const dir of [path.join(__dirname, "assets"), path.join(__dirname, "..", "src", "assets")]) {
    if (fs.existsSync(path.join(dir, CORE)) && fs.existsSync(path.join(dir, ABL))) {
      return dir;
    }
  }
  throw new Error("ABL Helper: parser WASM assets missing (run npm run fetch:parser-wasm).");
}

let cached: { core: Uint8Array; abl: Uint8Array } | undefined;

export function getParserWasmBytes(): { core: Uint8Array; abl: Uint8Array } {
  if (!cached) {
    const dir = assetsDirectory();
    cached = {
      core: new Uint8Array(fs.readFileSync(path.join(dir, CORE))),
      abl: new Uint8Array(fs.readFileSync(path.join(dir, ABL))),
    };
  }
  return cached;
}
