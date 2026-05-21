import * as vscode from "vscode";
import type { SyntaxNode } from "web-tree-sitter";

const CONTAINER_TYPES: Record<string, vscode.SymbolKind> = {
  class_statement: vscode.SymbolKind.Class,
  procedure_statement: vscode.SymbolKind.Function,
  function_statement: vscode.SymbolKind.Function,
  method_statement: vscode.SymbolKind.Method,
  constructor_statement: vscode.SymbolKind.Constructor,
  destructor_statement: vscode.SymbolKind.Method,
  temp_table_definition: vscode.SymbolKind.Struct,
  buffer_definition: vscode.SymbolKind.Struct,
  dataset_definition: vscode.SymbolKind.Struct,
  enum_statement: vscode.SymbolKind.Enum,
  interface_statement: vscode.SymbolKind.Interface,
};

function nodeName(node: SyntaxNode): string {
  const id = node.namedChildren.find((c) => c.type === "identifier" || c.type === "object_type");
  if (id) {
    return id.text.trim();
  }
  const q = node.namedChildren.find((c) => c.type === "qualified_name");
  if (q) {
    return q.text.trim();
  }
  const t = node.text.trim().split(/\s+/).filter(Boolean);
  if (t.length > 1) {
    return t.slice(0, 4).join(" ");
  }
  return node.type;
}

function toRange(node: SyntaxNode): vscode.Range {
  return new vscode.Range(
    new vscode.Position(node.startPosition.row, node.startPosition.column),
    new vscode.Position(node.endPosition.row, node.endPosition.column),
  );
}

function collectSymbols(_doc: vscode.TextDocument, node: SyntaxNode, out: vscode.DocumentSymbol[]): void {
  const kind = CONTAINER_TYPES[node.type];
  if (kind !== undefined && node.hasError === false) {
    const range = toRange(node);
    const sym = new vscode.DocumentSymbol(nodeName(node), "", kind, range, range);
    out.push(sym);
    const bucket = sym.children;
    for (const child of node.namedChildren) {
      collectSymbols(_doc, child, bucket);
    }
    return;
  }
  for (const child of node.namedChildren) {
    collectSymbols(_doc, child, out);
  }
}

export function extractDocumentSymbols(doc: vscode.TextDocument, root: SyntaxNode): vscode.DocumentSymbol[] {
  const symbols: vscode.DocumentSymbol[] = [];
  for (const child of root.namedChildren) {
    collectSymbols(doc, child, symbols);
  }
  return symbols;
}
