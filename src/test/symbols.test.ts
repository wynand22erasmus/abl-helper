import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as path from "node:path";
import { createAblParser, resetWasmParserInitForTests } from "../ablParser";
import { extractDocumentSymbols } from "../symbols";
import { TextDocument, Uri } from "./vscode-stub";

const SAMPLE = `
procedure proc1:
  define variable i as integer no-undo.
  message i.
end procedure.

class Foo:
  method public void bar ():
    return.
  end method.
end class.
`;

describe("symbols", () => {
  const root = path.resolve(__dirname, "..", "..");

  beforeAll(async () => {
    resetWasmParserInitForTests();
  });

  afterAll(() => {
    resetWasmParserInitForTests();
  });

  it("extracts procedure and class symbols from tree-sitter", async () => {
    const parser = await createAblParser(root);
    if (parser.mode === "none") {
      throw new Error("Parser unavailable (install wasm under wasm/ or native tree-sitter-abl)");
    }
    const tree = parser.parse(SAMPLE);
    const doc = TextDocument.create(Uri.file(path.join(root, "sample.p")), SAMPLE);
    const syms = extractDocumentSymbols(doc as never, tree.rootNode as never);
    expect(syms.some((s) => s.name === "proc1")).toBe(true);
    expect(syms.some((s) => s.name === "Foo")).toBe(true);
    tree.delete();
    parser.dispose();
  });
});
