/**
 * Document symbol outline from tree-sitter ABL grammar node types.
 * Maps declarations and labeled blocks to VS Code SymbolKind (aligned with TypeScript/Java outlines).
 */
import * as vscode from "vscode";
import type { SyntaxNode } from "web-tree-sitter";

/** Named declarations and triggers shown in the outline. */
const SYMBOL_KINDS: Record<string, vscode.SymbolKind> = {
  class_statement: vscode.SymbolKind.Class,
  interface_statement: vscode.SymbolKind.Interface,
  procedure_statement: vscode.SymbolKind.Function,
  function_statement: vscode.SymbolKind.Function,
  method_statement: vscode.SymbolKind.Method,
  constructor_statement: vscode.SymbolKind.Constructor,
  destructor_statement: vscode.SymbolKind.Method,
  enum_statement: vscode.SymbolKind.Enum,
  enum_member: vscode.SymbolKind.EnumMember,
  variable_definition: vscode.SymbolKind.Variable,
  property_definition: vscode.SymbolKind.Property,
  parameter_definition: vscode.SymbolKind.Variable,
  event_definition: vscode.SymbolKind.Event,
  variable: vscode.SymbolKind.Variable,
  temp_table_definition: vscode.SymbolKind.Struct,
  buffer_definition: vscode.SymbolKind.Struct,
  dataset_definition: vscode.SymbolKind.Struct,
  data_source_definition: vscode.SymbolKind.Struct,
  query_definition: vscode.SymbolKind.Struct,
  browse_definition: vscode.SymbolKind.Struct,
  frame_definition: vscode.SymbolKind.Struct,
  stream_definition: vscode.SymbolKind.Struct,
  workfile_definition: vscode.SymbolKind.Struct,
  rectangle_definition: vscode.SymbolKind.Struct,
  include: vscode.SymbolKind.Module,
  using_statement: vscode.SymbolKind.Module,
  on_statement: vscode.SymbolKind.Event,
};

/** Labeled control blocks (optional outline entries, like named regions). */
const LABELED_BLOCK_KINDS: Record<string, vscode.SymbolKind> = {
  do_block: vscode.SymbolKind.Namespace,
  repeat_statement: vscode.SymbolKind.Namespace,
  for_statement: vscode.SymbolKind.Namespace,
};

const NAME_FIELDS = ["name", "buffer", "table", "function", "label", "query"] as const;

const NAME_CHILD_TYPES = ["identifier", "file_name", "qualified_name", "object_type"] as const;

function positionAt(node: SyntaxNode): vscode.Position {
  return new vscode.Position(node.startPosition.row, node.startPosition.column);
}

function toRange(node: SyntaxNode): vscode.Range {
  return new vscode.Range(positionAt(node), new vscode.Position(node.endPosition.row, node.endPosition.column));
}

function childByField(node: SyntaxNode, field: string): SyntaxNode | null {
  try {
    return node.childForFieldName(field);
  } catch {
    return null;
  }
}

function firstNamedChild(node: SyntaxNode, ...types: string[]): SyntaxNode | undefined {
  return node.namedChildren.find((c) => types.includes(c.type));
}

/** Resolve the narrowest node for selectionRange (identifier / name field). */
function nameNodeForSymbol(node: SyntaxNode): SyntaxNode {
  for (const field of NAME_FIELDS) {
    const ch = childByField(node, field);
    if (ch) {
      return ch;
    }
  }
  for (const type of NAME_CHILD_TYPES) {
    const ch = firstNamedChild(node, type);
    if (ch) {
      return ch;
    }
  }
  return node;
}

function formatIncludeName(node: SyntaxNode): string {
  const file = firstNamedChild(node, "file_name", "identifier");
  if (file) {
    const t = file.text.trim();
    return t.startsWith("{") ? t : `{${t}}`;
  }
  return node.text.trim().split(/\r?\n/)[0]!.trim().slice(0, 80);
}

function formatOnStatementName(node: SyntaxNode): string {
  const parts: string[] = ["ON"];
  const fn = childByField(node, "function");
  const label = childByField(node, "label");
  if (fn) {
    parts.push(fn.text.trim());
  }
  if (label) {
    parts.push(label.text.trim());
  }
  if (parts.length === 1) {
    const id = firstNamedChild(node, "identifier", "qualified_name", "constant");
    if (id) {
      parts.push(id.text.trim());
    }
  }
  return parts.join(" ").slice(0, 80);
}

function formatBlockName(node: SyntaxNode, keyword: string): string {
  const label = childByField(node, "label") ?? firstNamedChild(node, "label");
  if (label) {
    return `${keyword} ${label.text.trim()}`;
  }
  const table = childByField(node, "table");
  if (table && node.type === "for_statement") {
    return `FOR ${table.text.trim().slice(0, 40)}`;
  }
  return keyword;
}

/** Human-readable detail for outline rows (access, return type, modifiers). */
function symbolDetail(node: SyntaxNode, kind: vscode.SymbolKind): string {
  if (kind === vscode.SymbolKind.Method || kind === vscode.SymbolKind.Function) {
    const access = firstNamedChild(node, "access_tuning", "member_modifier");
    const ret = firstNamedChild(node, "return_type");
    const parts: string[] = [];
    if (access) {
      parts.push(access.text.trim());
    }
    if (ret) {
      parts.push(ret.text.trim());
    }
    return parts.join(" ");
  }
  if (kind === vscode.SymbolKind.Variable || kind === vscode.SymbolKind.Property) {
    const typeTuning = firstNamedChild(node, "type_tuning", "primitive_type", "class_type");
    return typeTuning?.text.trim() ?? "";
  }
  if (kind === vscode.SymbolKind.Struct) {
    return node.type.replace(/_definition$/, "").replace(/_/g, " ");
  }
  return "";
}

function nodeName(node: SyntaxNode, _kind: vscode.SymbolKind): string {
  if (node.type === "include") {
    return formatIncludeName(node);
  }
  if (node.type === "on_statement") {
    return formatOnStatementName(node);
  }
  if (node.type in LABELED_BLOCK_KINDS) {
    const kw = node.type === "do_block" ? "DO" : node.type === "repeat_statement" ? "REPEAT" : "FOR";
    return formatBlockName(node, kw);
  }
  const nameField = nameNodeForSymbol(node);
  if (nameField !== node) {
    return nameField.text.trim();
  }
  const tokens = node.text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.slice(0, 5).join(" ");
  }
  return node.type.replace(/_statement$/, "").replace(/_definition$/, "").replace(/_/g, " ");
}

function symbolKindForNode(node: SyntaxNode): vscode.SymbolKind | undefined {
  if (node.type in SYMBOL_KINDS) {
    return SYMBOL_KINDS[node.type];
  }
  if (node.type in LABELED_BLOCK_KINDS) {
    const hasLabel = childByField(node, "label") ?? firstNamedChild(node, "label");
    return hasLabel ? LABELED_BLOCK_KINDS[node.type] : undefined;
  }
  return undefined;
}

/** Include declaration nodes even when the subtree has parse errors (common in real ABL files). */
function includeInOutline(node: SyntaxNode): boolean {
  if (!node.hasError) {
    return true;
  }
  const name = nameNodeForSymbol(node);
  return name !== node && !name.hasError;
}

function shouldSkipNode(node: SyntaxNode): boolean {
  // VAR groups surface child `variable` nodes only (like field groups in C#).
  return node.type === "var_statement" || node.type === "enum_definition" || node.type === "body";
}

function makeDocumentSymbol(node: SyntaxNode): vscode.DocumentSymbol {
  const kind = symbolKindForNode(node)!;
  const name = nodeName(node, kind);
  const range = toRange(node);
  const selection = toRange(nameNodeForSymbol(node));
  return new vscode.DocumentSymbol(name, symbolDetail(node, kind), kind, range, selection);
}

function collectSymbols(_doc: vscode.TextDocument, node: SyntaxNode, out: vscode.DocumentSymbol[]): void {
  if (shouldSkipNode(node)) {
    for (const child of node.namedChildren) {
      collectSymbols(_doc, child, out);
    }
    return;
  }

  const kind = symbolKindForNode(node);
  if (kind !== undefined && includeInOutline(node)) {
    const sym = makeDocumentSymbol(node);
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

/** Walk the parse tree and return top-level document symbols (nested via children). */
export function extractDocumentSymbols(doc: vscode.TextDocument, root: SyntaxNode): vscode.DocumentSymbol[] {
  const symbols: vscode.DocumentSymbol[] = [];
  for (const child of root.namedChildren) {
    collectSymbols(doc, child, symbols);
  }
  return symbols;
}

/** Flatten symbol tree for completion / search helpers. */
export function flattenDocumentSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
  const out: vscode.DocumentSymbol[] = [];
  const walk = (list: vscode.DocumentSymbol[]) => {
    for (const s of list) {
      out.push(s);
      if (s.children.length) {
        walk(s.children);
      }
    }
  };
  walk(symbols);
  return out;
}
