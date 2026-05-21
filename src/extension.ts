import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { createAblParser, resetWasmParserInitForTests, type AblParserHandle } from "./ablParser";
import { extractDocumentSymbols } from "./symbols";
import { runCheckSyntax, type CheckSyntaxOptions } from "./checkSyntax";
import { buildCompletionList } from "./completion";
import { applyKeywordCase, applyTierBFormatting, trimTrailingWhitespace, type KeywordCase } from "./formatters/tierA";
import type { SyntaxNode } from "web-tree-sitter";

const ABL: vscode.DocumentSelector = { language: "abl" };

let parserHandle: AblParserHandle | undefined;
let diagCollection: vscode.DiagnosticCollection | undefined;
let output: vscode.OutputChannel | undefined;

function getOutput(): vscode.OutputChannel {
  if (!output) {
    output = vscode.window.createOutputChannel("ABL Helper");
  }
  return output;
}

function readCheckOptions(): CheckSyntaxOptions {
  const c = vscode.workspace.getConfiguration("ablHelper");
  return {
    dlc: c.get<string>("dlcPath", "") ?? "",
    workingDirectory: c.get<string>("workingDirectory", "${workspaceFolder}") ?? "${workspaceFolder}",
    propath: c.get<string[]>("propath", []) ?? [],
    parameterFiles: c.get<string[]>("parameterFiles", []) ?? [],
    batchExecutable: c.get<string>("batchExecutable", "_progres") ?? "_progres",
    extraArgs: c.get<string>("checkSyntaxExtraArgs", "") ?? "",
  };
}

function runnerScriptPath(context: vscode.ExtensionContext): string {
  const dev = path.join(context.extensionPath, "out", "resources", "check-syntax.p");
  if (fs.existsSync(dev)) {
    return dev;
  }
  return path.join(context.extensionPath, "resources", "check-syntax.p");
}

async function ensureParser(context: vscode.ExtensionContext): Promise<AblParserHandle> {
  if (!parserHandle) {
    parserHandle = await createAblParser(context.extensionPath);
    getOutput().appendLine(`ABL parser: ${parserHandle.mode}`);
  }
  return parserHandle;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const log = (s: string) => getOutput().appendLine(s);
  log("ABL Helper activated.");

  diagCollection = vscode.languages.createDiagnosticCollection("ablHelper");
  context.subscriptions.push(diagCollection);

  context.subscriptions.push(
    vscode.commands.registerCommand("ablHelper.showOutput", () => {
      getOutput().show(true);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ablHelper.restartParser", async () => {
      resetWasmParserInitForTests();
      parserHandle?.dispose();
      parserHandle = undefined;
      await ensureParser(context);
      vscode.window.showInformationMessage("ABL Helper: parser reloaded.");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ablHelper.checkSyntax", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "abl") {
        vscode.window.showWarningMessage("Open an ABL file first.");
        return;
      }
      const doc = editor.document;
      try {
        const opts = readCheckOptions();
        const runner = runnerScriptPath(context);
        const diags = runCheckSyntax(doc, opts, runner, log);
        diagCollection!.set(doc.uri, diags);
        vscode.window.showInformationMessage(
          diags.length ? `Check syntax: ${diags.length} issue(s).` : "Check syntax: no issues reported.",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(msg);
        log(msg);
      }
    }),
  );

  const runFormat = async (kc: KeywordCase) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "abl") {
      return;
    }
    const text = editor.document.getText();
    const next = applyKeywordCase(trimTrailingWhitespace(text), kc, context.extensionPath);
    const endLine = editor.document.lineCount - 1;
    const endChar = editor.document.lineAt(endLine).text.length;
    await editor.edit((eb) => eb.replace(new vscode.Range(0, 0, endLine, endChar), next));
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("ablHelper.formatKeywordsUpper", () => runFormat("upper")),
    vscode.commands.registerCommand("ablHelper.formatKeywordsLower", () => runFormat("lower")),
    vscode.commands.registerCommand("ablHelper.formatTrimRight", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "abl") {
        return;
      }
      const text = editor.document.getText();
      const next = trimTrailingWhitespace(text);
      const endLine = editor.document.lineCount - 1;
      const endChar = editor.document.lineAt(endLine).text.length;
      await editor.edit((eb) => eb.replace(new vscode.Range(0, 0, endLine, endChar), next));
    }),
  );

  const provider: vscode.DocumentSymbolProvider = {
    provideDocumentSymbols: async (doc) => {
      if (doc.languageId !== "abl") {
        return [];
      }
      const handle = await ensureParser(context);
      if (handle.mode === "none") {
        return [];
      }
      const tree = handle.parse(doc.getText());
      try {
        const root = tree.rootNode as import("web-tree-sitter").SyntaxNode;
        return extractDocumentSymbols(doc, root);
      } finally {
        try {
          tree.delete();
        } catch {
          /* ignore */
        }
      }
    },
  };

  context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(ABL, provider));

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      ABL,
      {
        provideCompletionItems: async (doc, position) => {
          if (doc.languageId !== "abl") {
            return [];
          }
          const handle = await ensureParser(context);
          let root: SyntaxNode | null = null;
          if (handle.mode !== "none") {
            const tree = handle.parse(doc.getText());
            try {
              root = tree.rootNode as SyntaxNode;
            } finally {
              try {
                tree.delete();
              } catch {
                /* ignore */
              }
            }
          }
          return buildCompletionList(doc, position, context.extensionPath, root);
        },
      },
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-".split(""),
    ),
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(ABL, {
      provideDocumentFormattingEdits: async (doc) => {
        const cfg = vscode.workspace.getConfiguration("ablHelper");
        const kc = (cfg.get<string>("format.keywordCaseOnFormatDocument") ?? "none") as KeywordCase;
        const trim = cfg.get<boolean>("format.trimTrailingWhitespace", true);
        const tierB = cfg.get<boolean>("format.enableTreeSitterPass", false);
        let text = doc.getText();
        if (trim) {
          text = trimTrailingWhitespace(text);
        }
        text = applyKeywordCase(text, kc, context.extensionPath);
        if (tierB) {
          const handle = await ensureParser(context);
          if (handle.mode !== "none") {
            const tree = handle.parse(text);
            try {
              const root = tree.rootNode as import("web-tree-sitter").SyntaxNode;
              text = applyTierBFormatting(text, root);
            } finally {
              try {
                tree.delete();
              } catch {
                /* ignore */
              }
            }
          }
        }
        const last = doc.lineCount - 1;
        const full = new vscode.Range(0, 0, last, doc.lineAt(last).text.length);
        return [vscode.TextEdit.replace(full, text)];
      },
    }),
  );

  context.subscriptions.push({
    dispose() {
      parserHandle?.dispose();
      parserHandle = undefined;
    },
  });
}

export function deactivate(): void {
  parserHandle?.dispose();
  parserHandle = undefined;
}
