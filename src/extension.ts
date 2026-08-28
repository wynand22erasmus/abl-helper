/**
 * VS Code extension entry: registers ABL language providers and commands.
 * Parser uses vendored tree-sitter runtime (parser/runtime) + assets (warmed on activate).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { createAblParser, resetWasmParserInitForTests, type AblParserHandle } from "./ablParser";
import { extractDocumentSymbols } from "./symbols";
import { runCheckSyntax, type CheckSyntaxOptions } from "./checkSyntax";
import { buildCompletionList } from "./completion";
import { applyKeywordCase, applyTierBFormatting, trimTrailingWhitespace, type KeywordCase } from "./formatters/tierA";
import { requireAblEditor, replaceEntireDocument, withParseTree } from "./parseUtil";

const ABL: vscode.DocumentSelector = { language: "abl" };

const VALID_KEYWORD_CASE = new Set<KeywordCase>(["none", "upper", "lower"]);

let parserHandle: AblParserHandle | undefined;
let diagCollection: vscode.DiagnosticCollection | undefined;
let output: vscode.OutputChannel | undefined;
let warnedOutlineParserNone = false;
let warnedTierBSkipped = false;

const outlinePending = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; resolvers: Array<(symbols: vscode.DocumentSymbol[]) => void> }
>();

function getOutput(): vscode.OutputChannel {
  if (!output) {
    output = vscode.window.createOutputChannel("ABL Helper");
  }
  return output;
}

function readKeywordCase(cfg: vscode.WorkspaceConfiguration): KeywordCase {
  const raw = cfg.get<string>("format.keywordCaseOnFormatDocument") ?? "none";
  return VALID_KEYWORD_CASE.has(raw as KeywordCase) ? (raw as KeywordCase) : "none";
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
    verboseListing: c.get<boolean>("checkSyntax.verboseListing", false) ?? false,
  };
}

function formatCommandError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.startsWith("ABL Helper:") ? msg : `ABL Helper: ${msg}`;
}

/** Packaged extension uses resources/; dev builds copy assets to out/resources/ via esbuild. */
function runnerScriptPath(context: vscode.ExtensionContext): string {
  const dev = path.join(context.extensionPath, "out", "resources", "check-syntax.p");
  if (fs.existsSync(dev)) {
    return dev;
  }
  return path.join(context.extensionPath, "resources", "check-syntax.p");
}

async function ensureParser(): Promise<AblParserHandle> {
  if (!parserHandle) {
    parserHandle = await createAblParser();
    getOutput().appendLine(`ABL parser: ${parserHandle.mode}`);
  }
  return parserHandle;
}

async function computeDocumentSymbols(
  context: vscode.ExtensionContext,
  doc: vscode.TextDocument,
): Promise<vscode.DocumentSymbol[]> {
  const handle = await ensureParser();
  if (handle.mode === "none") {
    if (!warnedOutlineParserNone) {
      warnedOutlineParserNone = true;
      void vscode.window.showWarningMessage(
        "ABL Helper: Outline unavailable (tree-sitter parser could not be loaded).",
      );
    }
    return [];
  }
  const symbols = await withParseTree(handle, doc.getText(), (root) => extractDocumentSymbols(doc, root));
  return symbols ?? [];
}

function debouncedDocumentSymbols(
  context: vscode.ExtensionContext,
  doc: vscode.TextDocument,
  debounceMs: number,
): Promise<vscode.DocumentSymbol[]> {
  if (debounceMs <= 0) {
    return computeDocumentSymbols(context, doc);
  }
  const key = doc.uri.toString();
  return new Promise((resolve) => {
    let state = outlinePending.get(key);
    if (!state) {
      state = { timer: undefined as unknown as ReturnType<typeof setTimeout>, resolvers: [] };
      outlinePending.set(key, state);
    }
    state.resolvers.push(resolve);
    if (state.timer) {
      clearTimeout(state.timer);
    }
    state.timer = setTimeout(() => {
      const pending = outlinePending.get(key);
      outlinePending.delete(key);
      if (!pending) {
        resolve([]);
        return;
      }
      void computeDocumentSymbols(context, doc).then((symbols) => {
        for (const r of pending.resolvers) {
          r(symbols);
        }
      });
    }, debounceMs);
  });
}

/** Wire diagnostics, check-syntax, formatting commands, symbols, completion, and document format. */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const log = (s: string) => getOutput().appendLine(s);
  log("ABL Helper activated.");

  try {
    await ensureParser();
  } catch (e) {
    log(`ABL parser warm-up failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  diagCollection = vscode.languages.createDiagnosticCollection("ablHelper");
  context.subscriptions.push(diagCollection);

  context.subscriptions.push(
    vscode.commands.registerCommand("ablHelper.showOutput", () => {
      getOutput().show(true);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ablHelper.restartParser", () => {
      void (async () => {
        try {
          resetWasmParserInitForTests();
          parserHandle?.dispose();
          parserHandle = undefined;
          warnedOutlineParserNone = false;
          warnedTierBSkipped = false;
          const handle = await ensureParser();
          if (handle.mode === "none") {
            vscode.window.showWarningMessage(
              "ABL Helper: Parser still unavailable (run npm run build:parser and rebuild the extension).",
            );
          } else {
            vscode.window.showInformationMessage("ABL Helper: parser reloaded.");
          }
        } catch (e) {
          const msg = formatCommandError(e);
          vscode.window.showErrorMessage(msg);
          log(msg);
        }
      })();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("ablHelper.checkSyntax", () => {
      void (async () => {
        const editor = requireAblEditor();
        if (!editor) {
          return;
        }
        const doc = editor.document;
        try {
          const opts = readCheckOptions();
          const runner = runnerScriptPath(context);
          const result = await runCheckSyntax(doc, opts, runner, log);
          diagCollection!.set(doc.uri, result.diagnostics);
          if (result.status === "ok" && result.diagnostics.length === 0) {
            vscode.window.showInformationMessage("ABL Helper: Check syntax — no issues reported.");
          } else if (result.diagnostics.length > 0) {
            vscode.window.showInformationMessage(
              `ABL Helper: Check syntax — ${result.diagnostics.length} issue(s).`,
            );
          } else {
            const msg =
              result.errorMessage ??
              `ABL Helper: Check syntax failed (${result.status.replace(/_/g, " ")}).`;
            vscode.window.showErrorMessage(msg);
            log(msg);
          }
        } catch (e) {
          diagCollection!.set(doc.uri, []);
          const msg = formatCommandError(e);
          vscode.window.showErrorMessage(msg);
          log(msg);
        }
      })();
    }),
  );

  const runFormat = async (kc: KeywordCase) => {
    const editor = requireAblEditor();
    if (!editor) {
      return;
    }
    const text = editor.document.getText();
    const next = applyKeywordCase(trimTrailingWhitespace(text), kc, context.extensionPath);
    await replaceEntireDocument(editor, next);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("ablHelper.formatKeywordsUpper", () => {
      void runFormat("upper").catch((e) => {
        const msg = formatCommandError(e);
        vscode.window.showErrorMessage(msg);
        log(msg);
      });
    }),
    vscode.commands.registerCommand("ablHelper.formatKeywordsLower", () => {
      void runFormat("lower").catch((e) => {
        const msg = formatCommandError(e);
        vscode.window.showErrorMessage(msg);
        log(msg);
      });
    }),
    vscode.commands.registerCommand("ablHelper.formatTrimRight", () => {
      void (async () => {
        const editor = requireAblEditor();
        if (!editor) {
          return;
        }
        try {
          const next = trimTrailingWhitespace(editor.document.getText());
          await replaceEntireDocument(editor, next);
        } catch (e) {
          const msg = formatCommandError(e);
          vscode.window.showErrorMessage(msg);
          log(msg);
        }
      })();
    }),
  );

  const provider: vscode.DocumentSymbolProvider = {
    provideDocumentSymbols: async (doc) => {
      if (doc.languageId !== "abl") {
        return [];
      }
      const debounceMs = vscode.workspace.getConfiguration("ablHelper").get<number>("outline.debounceMs", 200) ?? 200;
      return debouncedDocumentSymbols(context, doc, debounceMs);
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
          const handle = await ensureParser();
          const root = await withParseTree(handle, doc.getText(), (r) => r);
          return buildCompletionList(doc, position, context.extensionPath, root ?? null);
        },
      },
      // Re-invoke on identifier chars so keyword/symbol prefix filtering stays in sync while typing.
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-".split(""),
    ),
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(ABL, {
      provideDocumentFormattingEdits: async (doc) => {
        const cfg = vscode.workspace.getConfiguration("ablHelper");
        const kc = readKeywordCase(cfg);
        const trim = cfg.get<boolean>("format.trimTrailingWhitespace", true);
        const tierB = cfg.get<boolean>("format.enableTreeSitterPass", false);
        let text = doc.getText();
        if (trim) {
          text = trimTrailingWhitespace(text);
        }
        text = applyKeywordCase(text, kc, context.extensionPath);
        if (tierB) {
          const handle = await ensureParser();
          const formatted = await withParseTree(handle, text, (root) => applyTierBFormatting(text, root));
          if (formatted !== undefined) {
            text = formatted;
          } else if (!warnedTierBSkipped) {
            warnedTierBSkipped = true;
            void vscode.window.showWarningMessage(
              "ABL Helper: Tier B formatting skipped (tree-sitter parser unavailable).",
            );
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
      for (const state of outlinePending.values()) {
        clearTimeout(state.timer);
      }
      outlinePending.clear();
      parserHandle?.dispose();
      parserHandle = undefined;
    },
  });
}

export function deactivate(): void {
  for (const state of outlinePending.values()) {
    clearTimeout(state.timer);
  }
  outlinePending.clear();
  parserHandle?.dispose();
  parserHandle = undefined;
}
