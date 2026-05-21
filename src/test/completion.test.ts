import { describe, expect, it } from "vitest";
import { loadKeywords } from "../keywords";
import { wordAtPosition, buildCompletionList } from "../completion";
import path from "node:path";
import { Position, Range, TextDocument, Uri } from "./vscode-stub";

const root = path.join(__dirname, "..", "..");

describe("completion", () => {
  it("loads keywords from resources", () => {
    const kw = loadKeywords(root);
    expect(kw.has("def")).toBe(true);
    expect(kw.has("run")).toBe(true);
  });

  it("wordAtPosition finds partial word", () => {
    const doc = TextDocument.create(Uri.file("x.p"), "DEF VAR x AS INT");
    const pos = new Position(0, 3);
    const { word, range } = wordAtPosition(doc, pos);
    expect(word).toBe("DEF");
    expect(range.start.character).toBe(0);
    expect(range.end.character).toBe(3);
  });

  it("buildCompletionList includes keyword matches without parser", () => {
    const doc = TextDocument.create(Uri.file("x.p"), "def");
    const pos = new Position(0, 3);
    const items = buildCompletionList(doc, pos, root, null);
    const labels = items.map((i) =>
      typeof i.label === "string" ? i.label : i.label,
    );
    expect(labels.some((l) => String(l).toLowerCase().startsWith("def"))).toBe(true);
  });
});
