/**
 * Shared parse-tree and editor helpers for extension providers.
 */
import * as vscode from "vscode";
import type { SyntaxNode } from "./parser/index";
import type { AblParserHandle } from "./ablParser";

export async function withParseTree<T>(
  handle: AblParserHandle,
  text: string,
  fn: (root: SyntaxNode) => T,
): Promise<T | undefined> {
  if (handle.mode === "none") {
    return undefined;
  }
  const tree = handle.parse(text);
  try {
    return fn(tree.rootNode as SyntaxNode);
  } finally {
    try {
      tree.delete();
    } catch {
      /* ignore */
    }
  }
}

/** Active editor when the document language is ABL; otherwise shows a warning and returns undefined. */
export function requireAblEditor(): vscode.TextEditor | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "abl") {
    vscode.window.showWarningMessage("ABL Helper: Open an ABL file first.");
    return undefined;
  }
  return editor;
}

/** Replace the full document text in one edit. */
export async function replaceEntireDocument(editor: vscode.TextEditor, next: string): Promise<void> {
  const endLine = editor.document.lineCount - 1;
  const endChar = editor.document.lineAt(endLine).text.length;
  await editor.edit((eb) => eb.replace(new vscode.Range(0, 0, endLine, endChar), next));
}
