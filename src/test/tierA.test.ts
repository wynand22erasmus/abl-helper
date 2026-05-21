import { describe, expect, it } from "vitest";
import * as path from "node:path";
import {
  applyKeywordCase,
  applyTierBFormatting,
  trimTrailingWhitespace,
} from "../formatters/tierA";
import type { SyntaxNode } from "web-tree-sitter";

const root = path.join(__dirname, "..", "..");

function mockSyntaxNode(
  type: string,
  text: string,
  opts: { startIndex?: number; row?: number; children?: SyntaxNode[] } = {},
): SyntaxNode {
  const startIndex = opts.startIndex ?? 0;
  const row = opts.row ?? 0;
  const children = opts.children ?? [];
  return {
    type,
    text,
    namedChildren: children,
    startIndex,
    startPosition: { row, column: 0 },
  } as SyntaxNode;
}

describe("Tier A formatters", () => {
  it("trimTrailingWhitespace removes trailing spaces on each line", () => {
    const src = "DEFINE VARIABLE x AS INTEGER.  \r\nRUN value. \r\n";
    const out = trimTrailingWhitespace(src);
    expect(out).toBe("DEFINE VARIABLE x AS INTEGER.\nRUN value.\n");
  });

  it("applyKeywordCase uppercases known keywords", () => {
    const src = "def var x as int.\nrun value.\n";
    const out = applyKeywordCase(src, "upper", root);
    expect(out).toMatch(/\bDEF\b/);
    expect(out).toMatch(/\bVAR\b/);
    expect(out).toMatch(/\bRUN\b/);
  });

  it("applyKeywordCase lowercases known keywords", () => {
    const src = "DEF VAR x AS INT.\n";
    const out = applyKeywordCase(src, "lower", root);
    expect(out.toLowerCase()).toBe(out);
    expect(out).toContain("def");
  });

  it("applyKeywordCase none leaves source unchanged", () => {
    const src = "DEF VAR x.";
    expect(applyKeywordCase(src, "none", root)).toBe(src);
  });

  it("applyTierBFormatting inserts newline before THEN when not preceded by whitespace", () => {
    const src = "IF xTHEN DO:\n  MESSAGE x.\nEND.";
    const thenIndex = src.indexOf("THEN");
    const thenNode = mockSyntaxNode("then", "THEN", { startIndex: thenIndex, row: 0 });
    const ifNode = mockSyntaxNode("if_statement", src, { row: 0, children: [thenNode] });
    const out = applyTierBFormatting(src, ifNode);
    expect(out).toContain("IF x\nTHEN");
  });
});
