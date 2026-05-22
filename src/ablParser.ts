/**
 * Tree-sitter ABL parser via bundled web-tree-sitter + committed WASM under wasm/.
 * Outline, completion, and Tier B formatting all use this path (no native node bindings).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import Parser from "web-tree-sitter";

export type AblParserMode = "wasm" | "none";

/** Active parser instance; callers must delete() trees; call dispose() to reset WASM runtime. */
export interface AblParserHandle {
  mode: AblParserMode;
  parse(source: string): Parser.Tree;
  dispose(): void;
}

let initPromise: Promise<void> | undefined;
let parser: Parser | undefined;

/** Locate bundled tree-sitter.wasm and tree-sitter-abl.wasm (repo root or out/wasm after build). */
export function resolveWasmDir(extensionRoot: string): string | undefined {
  for (const dir of [path.join(extensionRoot, "wasm"), path.join(extensionRoot, "out", "wasm")]) {
    const core = path.join(dir, "tree-sitter.wasm");
    const lang = path.join(dir, "tree-sitter-abl.wasm");
    if (fs.existsSync(core) && fs.existsSync(lang)) {
      return dir;
    }
  }
  return undefined;
}

async function initWasmParser(wasmDir: string): Promise<void> {
  if (parser) {
    return;
  }
  const coreWasm = path.join(wasmDir, "tree-sitter.wasm");
  if (!initPromise) {
    initPromise = Parser.init({
      locateFile: () => coreWasm,
    });
  }
  await initPromise;
  const language = await Parser.Language.load(path.join(wasmDir, "tree-sitter-abl.wasm"));
  const p = new Parser();
  p.setLanguage(language);
  parser = p;
}

function noneHandle(): AblParserHandle {
  return {
    mode: "none",
    parse() {
      throw new Error("ABL Helper: WASM parser files missing (run npm run fetch:wasm).");
    },
    dispose() {
      /* noop */
    },
  };
}

function wasmHandle(): AblParserHandle {
  return {
    mode: "wasm",
    parse(source: string) {
      return parser!.parse(source);
    },
    dispose() {
      try {
        parser?.delete();
      } catch {
        /* ignore */
      }
      parser = undefined;
      initPromise = undefined;
    },
  };
}

/** Create or return the shared WASM parser for this extension host. */
export async function createAblParser(extensionRoot: string): Promise<AblParserHandle> {
  const wasmDir = resolveWasmDir(extensionRoot);
  if (!wasmDir) {
    return noneHandle();
  }
  await initWasmParser(wasmDir);
  return wasmHandle();
}

/** Eagerly load WASM so first outline/completion avoids cold-start latency. */
export async function warmAblParser(extensionRoot: string): Promise<AblParserHandle> {
  return createAblParser(extensionRoot);
}

/** Clear WASM init so tests or "Reload parser" can re-bind paths. */
export function resetWasmParserInitForTests(): void {
  try {
    parser?.delete();
  } catch {
    /* ignore */
  }
  parser = undefined;
  initPromise = undefined;
}
