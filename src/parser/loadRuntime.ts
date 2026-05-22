/**
 * Load vendored tree-sitter ESM entry (parser/runtime/tree-sitter.js) from out/ or parser/.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { moduleDir } from "../moduleDir.js";
import type { TreeSitterParserCtor } from "./tree-sitter-types.js";

function runtimeEntryPath(): string {
  const name = "tree-sitter.js";
  const base = moduleDir(import.meta.url);
  for (const dir of [
    path.join(base, "parser", "runtime"),
    path.join(base, "..", "..", "parser", "runtime"),
  ]) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) {
      return file;
    }
  }
  throw new Error(
    "ABL Helper: vendored tree-sitter runtime missing (run npm run build).",
  );
}

let cached: TreeSitterParserCtor | undefined;
let loadPromise: Promise<TreeSitterParserCtor> | undefined;

export async function getTreeSitterParser(): Promise<TreeSitterParserCtor> {
  if (cached) {
    return cached;
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const entry = runtimeEntryPath();
      const mod = (await import(pathToFileURL(entry).href)) as {
        loadTreeSitter: () => Promise<TreeSitterParserCtor>;
        default?: () => Promise<TreeSitterParserCtor>;
      };
      const Parser = await mod.loadTreeSitter();
      cached = Parser;
      return Parser;
    })();
  }
  return loadPromise;
}
