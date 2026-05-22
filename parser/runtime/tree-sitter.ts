/**
 * ESM TypeScript entry for the vendored web-tree-sitter binding.
 * The Emscripten artifact stays in tree-sitter.cjs (opaque binary); this module loads it.
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import * as path from "node:path";
import type Parser from "./tree-sitter-web.js";

export type TreeSitterParserCtor = typeof Parser;
export type { Parser };

const bindingPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "tree-sitter.cjs");

let cached: TreeSitterParserCtor | undefined;
let loadPromise: Promise<TreeSitterParserCtor> | undefined;

/** Load the vendored Parser constructor (singleton). */
export async function loadTreeSitter(): Promise<TreeSitterParserCtor> {
  if (cached) {
    return cached;
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const mod = (await import(pathToFileURL(bindingPath).href)) as {
        default?: TreeSitterParserCtor;
      };
      const ParserCtor = mod.default ?? (mod as unknown as TreeSitterParserCtor);
      cached = ParserCtor;
      return ParserCtor;
    })();
  }
  return loadPromise;
}

export default loadTreeSitter;
