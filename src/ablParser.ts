/**
 * Tree-sitter ABL parser: local vendored runtime (parser/runtime) + WASM bytes.
 */
import { getTreeSitterParser } from "./parser/loadRuntime";
import type { ParseTree, TreeSitterParserCtor } from "./parser/tree-sitter-types";
import { getParserWasmBytes } from "./parserWasm";

export type AblParserMode = "wasm" | "none";

export interface AblParserHandle {
  mode: AblParserMode;
  parse(source: string): ParseTree;
  dispose(): void;
}

type ParserInstance = InstanceType<TreeSitterParserCtor>;

let initPromise: Promise<ParserInstance> | undefined;
let activeParser: ParserInstance | undefined;

async function getParser(): Promise<ParserInstance> {
  if (activeParser) {
    return activeParser;
  }
  if (!initPromise) {
    initPromise = (async () => {
      const Parser = await getTreeSitterParser();
      const { core, abl } = getParserWasmBytes();
      await Parser.init({ wasmBinary: core });
      const language = await Parser.Language.load(abl);
      const p = new Parser();
      p.setLanguage(language);
      activeParser = p;
      return p;
    })();
  }
  return initPromise;
}

function resetParserState(): void {
  try {
    activeParser?.delete();
  } catch {
    /* ignore */
  }
  activeParser = undefined;
  initPromise = undefined;
}

/** Shared WASM parser for outline, completion, and Tier B formatting. */
export async function createAblParser(): Promise<AblParserHandle> {
  try {
    const p = await getParser();
    return {
      mode: "wasm",
      parse(source: string) {
        return p.parse(source);
      },
      dispose() {
        resetParserState();
      },
    };
  } catch {
    return {
      mode: "none",
      parse() {
        throw new Error("ABL Helper: parser WASM could not be loaded.");
      },
      dispose() {
        /* noop */
      },
    };
  }
}

/** Reset parser state for tests or Reload Tree-sitter Parser. */
export function resetWasmParserInitForTests(): void {
  resetParserState();
}
