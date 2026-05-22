/**
 * Parser WASM bytes shipped with the extension (src/assets → out/assets on build).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { moduleDir } from "./moduleDir.js";

import { PARSER_WASM_ABL, PARSER_WASM_CORE } from "./assets/wasm-manifest.js";

const CORE = PARSER_WASM_CORE;
const ABL = PARSER_WASM_ABL;

function assetsDirectory(): string {
  const base = moduleDir(import.meta.url);
  for (const dir of [path.join(base, "assets"), path.join(base, "..", "src", "assets")]) {
    if (fs.existsSync(path.join(dir, CORE)) && fs.existsSync(path.join(dir, ABL))) {
      return dir;
    }
  }
  throw new Error("ABL Helper: parser WASM assets missing (run npm run build:parser).");
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
