import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as path from "node:path";
import { createAblParser, resetWasmParserInitForTests } from "../ablParser";
import { extractDocumentSymbols, flattenDocumentSymbols } from "../symbols";
import { SymbolKind, TextDocument, Uri } from "./vscode-stub";
import { OUTLINE_SAMPLE } from "./symbols-outline.sample";

function findSymbol(
  symbols: ReturnType<typeof extractDocumentSymbols>,
  name: string,
): ReturnType<typeof extractDocumentSymbols>[number] | undefined {
  return flattenDocumentSymbols(symbols).find((s) => s.name === name || s.name.includes(name));
}

describe("symbols", () => {
  const root = path.resolve(__dirname, "..", "..");

  beforeAll(() => {
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
    const tree = parser.parse(OUTLINE_SAMPLE);
    const doc = TextDocument.create(Uri.file(path.join(root, "sample.p")), OUTLINE_SAMPLE);
    const syms = extractDocumentSymbols(doc as never, tree.rootNode as never);
    expect(syms.some((s) => s.name === "proc1")).toBe(true);
    expect(syms.some((s) => s.name === "Foo")).toBe(true);
    tree.delete();
    parser.dispose();
  });

  it("includes declarations, includes, and nested members like mainstream outlines", async () => {
    const parser = await createAblParser(root);
    if (parser.mode === "none") {
      throw new Error("Parser unavailable");
    }
    const tree = parser.parse(OUTLINE_SAMPLE);
    const doc = TextDocument.create(Uri.file(path.join(root, "sample.p")), OUTLINE_SAMPLE);
    const syms = extractDocumentSymbols(doc as never, tree.rootNode as never);
    const flat = flattenDocumentSymbols(syms);

    const proc1 = syms.find((s) => s.name === "proc1");
    expect(proc1?.kind).toBe(SymbolKind.Function);
    expect(proc1?.children.some((c) => c.name === "i" && c.kind === SymbolKind.Variable)).toBe(true);
    expect(proc1?.children.some((c) => c.name === "tt" && c.kind === SymbolKind.Struct)).toBe(true);

    expect(flat.some((s) => s.kind === SymbolKind.Module && s.name.includes("shared.i"))).toBe(true);
    expect(flat.some((s) => s.kind === SymbolKind.Module && s.name.includes("OpenEdge"))).toBe(true);

    const foo = syms.find((s) => s.name === "Foo");
    expect(foo?.kind).toBe(SymbolKind.Class);
    expect(foo?.children.some((c) => c.name === "bar" && c.kind === SymbolKind.Method)).toBe(true);
    expect(foo?.children.some((c) => c.name === "pName" && c.kind === SymbolKind.Property)).toBe(true);

    for (const sym of flat) {
      expect(sym.selectionRange.start.line).toBeGreaterThanOrEqual(0);
      expect(sym.range.start.line).toBeLessThanOrEqual(sym.selectionRange.start.line);
    }

    tree.delete();
    parser.dispose();
  });

  it("shows labeled DO blocks as namespace symbols", async () => {
    const parser = await createAblParser(root);
    if (parser.mode === "none") {
      throw new Error("Parser unavailable");
    }
    const tree = parser.parse(OUTLINE_SAMPLE);
    const doc = TextDocument.create(Uri.file(path.join(root, "sample.p")), OUTLINE_SAMPLE);
    const syms = extractDocumentSymbols(doc as never, tree.rootNode as never);
    const labeled = findSymbol(syms, "myBlock");
    expect(labeled?.kind).toBe(SymbolKind.Namespace);
    tree.delete();
    parser.dispose();
  });
});
