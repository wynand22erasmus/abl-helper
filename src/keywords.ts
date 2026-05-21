import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

let keywordSet: Set<string> | undefined;
let keywordResolvedPath: string | undefined;

/**
 * Load ABL statement keywords from resources/abl-keywords.txt (chriscamicas list).
 * Parses `keywords=` lines; strips parenthetical abbreviations and adds combined forms.
 */
export function loadKeywords(extensionRoot?: string): Set<string> {
  const candidates = [
    extensionRoot && path.join(extensionRoot, "out", "resources", "abl-keywords.txt"),
    extensionRoot && path.join(extensionRoot, "resources", "abl-keywords.txt"),
    path.join(__dirname, "..", "resources", "abl-keywords.txt"),
    path.join(__dirname, "abl-keywords.txt"),
  ].filter(Boolean) as string[];
  const p = candidates.find((c) => fs.existsSync(c)) ?? candidates[0]!;
  if (keywordSet && keywordResolvedPath === p) {
    return keywordSet;
  }
  keywordResolvedPath = p;
  const s = new Set<string>();
  if (!fs.existsSync(p)) {
    keywordSet = s;
    return s;
  }
  const text = fs.readFileSync(p, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("keywords=")) {
      continue;
    }
    const rest = line.slice("keywords=".length).trim();
    for (const raw of rest.split(/\s+/)) {
      const base = raw.replace(/\(.*/, "").toLowerCase();
      if (base.length >= 2) {
        s.add(base);
      }
      // e.g. DEF(ine) → store "define" and "define" from DEF+ine abbreviation
      const paren = raw.match(/^([^(]+)\(([^)]*)/);
      if (paren && paren[1] && paren[2]) {
        const full = (paren[1] + paren[2]).toLowerCase();
        if (full.length >= 2) {
          s.add(full);
        }
      }
    }
  }
  keywordSet = s;
  return s;
}

const MAX_KEYWORD_COMPLETION_ITEMS = 80;

/** Keyword completion items filtered by prefix; sortText keeps keywords before symbols. */
export function keywordCompletionItems(
  prefix: string,
  extensionRoot: string,
  replaceRange: vscode.Range,
): vscode.CompletionItem[] {
  const low = prefix.toLowerCase();
  const items: vscode.CompletionItem[] = [];
  for (const kw of loadKeywords(extensionRoot)) {
    if (!low || kw.startsWith(low)) {
      const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
      item.insertText = kw;
      item.range = replaceRange;
      item.sortText = `0_kw_${kw}`;
      items.push(item);
      if (items.length >= MAX_KEYWORD_COMPLETION_ITEMS) {
        break;
      }
    }
  }
  return items;
}
