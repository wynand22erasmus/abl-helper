/**
 * Tree-sitter ABL parser with a three-tier fallback:
 * 1) node-tree-sitter + tree-sitter-abl (fastest, requires native build),
 * 2) web-tree-sitter + bundled WASM under extension wasm/,
 * 3) mode "none" when WASM is missing (symbols/completion degrade gracefully).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type Parser from "web-tree-sitter";

export type AblParserMode = "native" | "wasm" | "none";

/** Active parser instance; callers must delete() trees and dispose() WASM parsers when done. */
export interface AblParserHandle {
  mode: AblParserMode;
  parse(source: string): Parser.Tree;
  dispose(): void;
}

let wasmInitPromise: Promise<void> | undefined;

/** Prefer native bindings when available (e.g. dev machines with compiled tree-sitter-abl). */
function tryNativeParser(): AblParserHandle | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TreeSitter = require("tree-sitter") as typeof import("tree-sitter");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AblLanguage = require("tree-sitter-abl");
    const parser = new TreeSitter();
    parser.setLanguage(AblLanguage);
    return {
      mode: "native",
      parse(source: string) {
        return parser.parse(source) as unknown as Parser.Tree;
      },
      dispose() {
        /* node-tree-sitter Parser has no delete(); GC handles native parser */
      },
    };
  } catch {
    return undefined;
  }
}

/** Create the best available parser for this host; WASM init is shared across calls. */
export async function createAblParser(extensionRoot: string): Promise<AblParserHandle> {
  const native = tryNativeParser();
  if (native) {
    return native;
  }

  const wasmDir = path.join(extensionRoot, "wasm");
  const coreWasm = path.join(wasmDir, "tree-sitter.wasm");
  const langWasm = path.join(wasmDir, "tree-sitter-abl.wasm");
  if (!fs.existsSync(coreWasm) || !fs.existsSync(langWasm)) {
    return {
      mode: "none",
      parse() {
        throw new Error("ABL Helper: WASM files missing under wasm/ (run npm run fetch:wasm).");
      },
      dispose() {
        /* noop */
      },
    };
  }

  const web = await import("web-tree-sitter");
  const Parser = web.default;
  if (!wasmInitPromise) {
    wasmInitPromise = Parser.init({
      locateFile: () => coreWasm,
    });
  }
  await wasmInitPromise;
  const language = await Parser.Language.load(langWasm);
  const parser = new Parser();
  parser.setLanguage(language);
  return {
    mode: "wasm",
    parse(source: string) {
      return parser.parse(source);
    },
    dispose() {
      try {
        parser.delete();
      } catch {
        /* ignore */
      }
    },
  };
}

/** Clear one-shot WASM init so tests can re-bind locateFile / language paths. */
export function resetWasmParserInitForTests(): void {
  wasmInitPromise = undefined;
}
