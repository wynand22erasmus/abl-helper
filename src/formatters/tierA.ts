import type { SyntaxNode } from "web-tree-sitter";
import { loadKeywords } from "../keywords";

export type KeywordCase = "none" | "upper" | "lower";

export function applyKeywordCase(source: string, kc: KeywordCase, extensionRoot?: string): string {
  if (kc === "none") {
    return source;
  }
  const kw = loadKeywords(extensionRoot);
  const re = /\b[a-zA-Z][\w-]*\b/g;
  return source.replace(re, (w) => {
    const low = w.toLowerCase();
    if (!kw.has(low)) {
      return w;
    }
    return kc === "upper" ? w.toUpperCase() : w.toLowerCase();
  });
}

export function trimTrailingWhitespace(source: string): string {
  return source
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n");
}

/** Tier B: minimal structural tweak — insert newline before THEN when enabled (experimental). */
export function applyTierBFormatting(source: string, root: SyntaxNode): string {
  const edits: { start: number; end: number; text: string }[] = [];
  const visit = (n: SyntaxNode) => {
    if (n.type === "if_statement") {
      for (const ch of n.namedChildren) {
        if (ch.text.trim().toLowerCase() === "then" && ch.startPosition.row === n.startPosition.row) {
          const beforeThen = source.slice(0, ch.startIndex);
          if (!/\s$/.test(beforeThen)) {
            edits.push({ start: ch.startIndex, end: ch.startIndex, text: "\n" });
          }
        }
      }
    }
    for (const c of n.namedChildren) {
      visit(c);
    }
  };
  visit(root);
  if (edits.length === 0) {
    return source;
  }
  edits.sort((a, b) => b.start - a.start);
  let out = source;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  return out;
}
