/**
 * ABL completion: merges tree-sitter document symbols (when parser available)
 * with static keyword list; dedupes by label, symbols sort after keywords.
 */
import * as vscode from "vscode";
import type { SyntaxNode } from "./parser/index";
import { keywordCompletionItems } from "./keywords";
import { extractDocumentSymbols } from "./symbols";

const MAX_SYMBOL_ITEMS = 40;

/** Identifier under cursor (ABL allows hyphens in names); empty word if none. */
export function wordAtPosition(
  doc: vscode.TextDocument,
  position: vscode.Position,
): { word: string; range: vscode.Range } {
  const line = doc.lineAt(position.line).text;
  const re = /[a-zA-Z_][\w-]*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (position.character >= start && position.character <= end) {
      return {
        word: match[0],
        range: new vscode.Range(position.line, start, position.line, end),
      };
    }
  }
  const col = position.character;
  return {
    word: "",
    range: new vscode.Range(position.line, col, position.line, col),
  };
}

function symbolKindToCompletion(kind: vscode.SymbolKind): vscode.CompletionItemKind {
  switch (kind) {
    case vscode.SymbolKind.Class:
      return vscode.CompletionItemKind.Class;
    case vscode.SymbolKind.Method:
      return vscode.CompletionItemKind.Method;
    case vscode.SymbolKind.Function:
      return vscode.CompletionItemKind.Function;
    case vscode.SymbolKind.Interface:
      return vscode.CompletionItemKind.Interface;
    case vscode.SymbolKind.Enum:
      return vscode.CompletionItemKind.Enum;
    case vscode.SymbolKind.EnumMember:
      return vscode.CompletionItemKind.EnumMember;
    case vscode.SymbolKind.Constructor:
      return vscode.CompletionItemKind.Constructor;
    case vscode.SymbolKind.Property:
      return vscode.CompletionItemKind.Property;
    case vscode.SymbolKind.Event:
      return vscode.CompletionItemKind.Event;
    case vscode.SymbolKind.Module:
      return vscode.CompletionItemKind.Module;
    case vscode.SymbolKind.Namespace:
      return vscode.CompletionItemKind.Module;
    case vscode.SymbolKind.Struct:
      return vscode.CompletionItemKind.Struct;
    case vscode.SymbolKind.Variable:
      return vscode.CompletionItemKind.Variable;
    default:
      return vscode.CompletionItemKind.Variable;
  }
}

function flattenSymbols(
  symbols: vscode.DocumentSymbol[],
  prefix: string,
  replaceRange: vscode.Range,
  out: vscode.CompletionItem[],
  seen: Set<string>,
): void {
  if (out.length >= MAX_SYMBOL_ITEMS) {
    return;
  }
  const low = prefix.toLowerCase();
  for (const sym of symbols) {
    const name = sym.name.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    if (!seen.has(key) && (!low || key.startsWith(low))) {
      seen.add(key);
      const item = new vscode.CompletionItem(name, symbolKindToCompletion(sym.kind));
      item.detail = vscode.SymbolKind[sym.kind];
      item.range = replaceRange;
      item.sortText = `1_sym_${name}`;
      out.push(item);
    }
    if (sym.children.length) {
      flattenSymbols(sym.children, prefix, replaceRange, out, seen);
    }
    if (out.length >= MAX_SYMBOL_ITEMS) {
      return;
    }
  }
}

/** Build merged keyword + in-document symbol completions for the given position. */
export function buildCompletionList(
  doc: vscode.TextDocument,
  position: vscode.Position,
  extensionRoot: string,
  root: SyntaxNode | null,
): vscode.CompletionItem[] {
  const { word, range } = wordAtPosition(doc, position);
  const keywordItems = keywordCompletionItems(word, extensionRoot, range);

  const symbolItems: vscode.CompletionItem[] = [];
  if (root) {
    const symbols = extractDocumentSymbols(doc, root);
    flattenSymbols(symbols, word, range, symbolItems, new Set());
  }

  const seen = new Set<string>();
  const merged: vscode.CompletionItem[] = [];
  for (const item of [...symbolItems, ...keywordItems]) {
    const label = typeof item.label === "string" ? item.label : item.label.label;
    const k = label.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(item);
    }
  }
  return merged;
}
