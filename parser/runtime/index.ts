/**
 * ESM barrel for the vendored tree-sitter runtime (dynamic import of tree-sitter.js only).
 */
export type { Parser, TreeSitterParserCtor } from "./tree-sitter.js";

export async function loadTreeSitter(): Promise<
  import("./tree-sitter.js").TreeSitterParserCtor
> {
  const mod = await import("./tree-sitter.js");
  return mod.loadTreeSitter();
}

export default async function loadTreeSitterDefault(): Promise<
  import("./tree-sitter.js").TreeSitterParserCtor
> {
  const mod = await import("./tree-sitter.js");
  return mod.default();
}
