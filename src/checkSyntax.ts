/**
 * OpenEdge batch check-syntax: spawns DLC bin executable with -b -p runner,
 * passes ABL_CHECK_FILE / ABL_LISTING via env, and maps listing output to VS Code diagnostics.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import * as vscode from "vscode";

export const CHECK_SYNTAX_DIAGNOSTIC_SOURCE = "ABL Helper";

const LISTING_TRUNCATE_BYTES = 8 * 1024;

export interface CheckSyntaxOptions {
  dlc: string;
  workingDirectory: string;
  propath: string[];
  parameterFiles: string[];
  batchExecutable: string;
  extraArgs: string;
  verboseListing?: boolean;
}

export type CheckSyntaxStatus = "ok" | "no_listing" | "spawn_failed" | "validation_failed";

export interface CheckSyntaxResult {
  diagnostics: vscode.Diagnostic[];
  status: CheckSyntaxStatus;
  errorMessage?: string;
}

/** Build PROPATH for the OE process; always includes workspace so local includes resolve. */
function joinPropath(entries: string[], workspaceRoot: string): string {
  const parts = entries.map((p) => p.replace(/\$\{workspaceFolder\}/gi, workspaceRoot));
  if (!parts.includes(workspaceRoot)) {
    parts.push(workspaceRoot);
  }
  return parts.join(path.delimiter);
}

function resolveDlc(configPath: string): string {
  const p = configPath.trim();
  if (p) {
    return p;
  }
  const env = process.env.DLC;
  if (env && env.trim()) {
    return env.trim();
  }
  throw new Error("ABL Helper: DLC is not configured. Set ablHelper.dlcPath or the DLC environment variable.");
}

function batchExePath(dlc: string, name: string): string {
  const bin = path.join(dlc, "bin");
  if (process.platform === "win32") {
    const withExe = path.join(bin, `${name}.exe`);
    if (fs.existsSync(withExe)) {
      return withExe;
    }
  }
  return path.join(bin, name);
}

function buildPfArgs(parameterFiles: string[], workspaceRoot: string): string[] {
  const args: string[] = [];
  for (const pf of parameterFiles) {
    const resolved = pf.replace(/\$\{workspaceFolder\}/gi, workspaceRoot);
    if (resolved) {
      args.push("-pf", resolved);
    }
  }
  return args;
}

function makeDiagnostic(doc: vscode.TextDocument, line: number, message: string): vscode.Diagnostic {
  const idx = line - 1;
  const textLine = doc.lineAt(Math.min(Math.max(0, idx), doc.lineCount - 1));
  const range = new vscode.Range(idx, 0, idx, textLine.text.length);
  const diag = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
  diag.source = CHECK_SYNTAX_DIAGNOSTIC_SOURCE;
  return diag;
}

/**
 * Parse Progress compiler / listing lines into line + message pairs.
 * Supports `** Line N ** msg`, `** msg (N:col) **`, and `Line N: msg` variants.
 */
export function parseCompilerMessages(content: string): { line: number; message: string }[] {
  const out: { line: number; message: string }[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    // Classic batch listing: ** Line 42 ** Unknown keyword ...
    let m = line.match(/\*\*\s+Line\s+(\d+)\s+\*\*\s*(.+)/i);
    if (m) {
      out.push({ line: Math.max(1, parseInt(m[1]!, 10)), message: m[2]!.trim() });
      continue;
    }
    // Alternate: ** message (42:1) **
    m = line.match(/\*\*\s+(.+?)\s+\((\d+)\s*:\s*\d+\s*\)\s*\*\*/i);
    if (m) {
      out.push({ line: Math.max(1, parseInt(m[2]!, 10)), message: m[1]!.trim() });
      continue;
    }
    m = line.match(/Line\s+(\d+)\s*[:-]\s*(.+)/i);
    if (m) {
      out.push({ line: Math.max(1, parseInt(m[1]!, 10)), message: m[2]!.trim() });
    }
  }
  return out;
}

/** Map listing text to diagnostics for the given document. */
export function diagnosticsFromListing(
  doc: vscode.TextDocument,
  listingText: string,
): vscode.Diagnostic[] {
  const diags: vscode.Diagnostic[] = [];
  for (const { line, message } of parseCompilerMessages(listingText)) {
    diags.push(makeDiagnostic(doc, line, message));
  }
  return diags;
}

/** Pre-spawn checks for executable, runner script, and working directory. */
export function validateCheckSyntaxPreconditions(
  exe: string,
  runnerPath: string,
  cwd: string,
  existsSync: (p: string) => boolean = fs.existsSync,
): string | undefined {
  if (!existsSync(exe)) {
    return `OpenEdge executable not found: ${exe}`;
  }
  if (!existsSync(runnerPath)) {
    return `Check-syntax runner not found: ${runnerPath}`;
  }
  if (!existsSync(cwd)) {
    return `Working directory not found: ${cwd}`;
  }
  return undefined;
}

/** Classify spawn outcome when listing is present or absent. */
export function resolveCheckSyntaxStatus(
  listingExists: boolean,
  exitStatus: number | null,
  diagnosticCount: number,
  spawnError?: Error,
): CheckSyntaxResult {
  if (spawnError) {
    return {
      diagnostics: [],
      status: "spawn_failed",
      errorMessage: spawnError.message,
    };
  }
  if (!listingExists) {
    return {
      diagnostics: [],
      status: "no_listing",
      errorMessage:
        "No listing file produced — check DLC, PROPATH, ablHelper.workingDirectory, and the check-syntax runner.",
    };
  }
  if (diagnosticCount === 0 && exitStatus !== 0 && exitStatus !== null) {
    return {
      diagnostics: [],
      status: "spawn_failed",
      errorMessage: `OpenEdge exited with code ${exitStatus} but no compiler messages were parsed.`,
    };
  }
  return { diagnostics: [], status: "ok" };
}

function formatListingForLog(txt: string, verbose: boolean): string {
  if (verbose) {
    return txt;
  }
  const buf = Buffer.from(txt, "utf8");
  if (buf.length <= LISTING_TRUNCATE_BYTES) {
    return txt;
  }
  return `${buf.subarray(0, LISTING_TRUNCATE_BYTES).toString("utf8")}\n… (listing truncated, enable ablHelper.checkSyntax.verboseListing for full output)`;
}

export interface CheckSyntaxRunDeps {
  existsSync?: (p: string) => boolean;
  spawnSync?: typeof spawnSync;
  readFileSync?: typeof fs.readFileSync;
  unlinkSync?: typeof fs.unlinkSync;
}

/**
 * Run check-syntax.p against the active document; returns diagnostics and run status.
 */
export function runCheckSyntax(
  doc: vscode.TextDocument,
  opts: CheckSyntaxOptions,
  runnerPath: string,
  log: (s: string) => void,
  deps: CheckSyntaxRunDeps = {},
): CheckSyntaxResult {
  const existsSync = deps.existsSync ?? fs.existsSync;
  const spawn = deps.spawnSync ?? spawnSync;
  const readFileSync = deps.readFileSync ?? fs.readFileSync;
  const unlinkSync = deps.unlinkSync ?? fs.unlinkSync;

  const workspaceRoot = vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath ?? path.dirname(doc.uri.fsPath);
  const dlc = resolveDlc(opts.dlc);
  const exe = batchExePath(dlc, opts.batchExecutable);
  const cwd = opts.workingDirectory.replace(/\$\{workspaceFolder\}/gi, workspaceRoot);
  const validationError = validateCheckSyntaxPreconditions(exe, runnerPath, cwd, existsSync);
  if (validationError) {
    return {
      diagnostics: [],
      status: "validation_failed",
      errorMessage: validationError,
    };
  }

  const listing = path.join(os.tmpdir(), `abl-helper-${Date.now()}.lst`);
  const env = {
    ...process.env,
    DLC: dlc,
    PROPATH: joinPropath(opts.propath, workspaceRoot),
    ABL_CHECK_FILE: doc.uri.fsPath,
    ABL_LISTING: listing,
  };
  const args = ["-b", ...buildPfArgs(opts.parameterFiles, workspaceRoot), "-p", runnerPath];
  if (opts.extraArgs.trim()) {
    args.push(...opts.extraArgs.trim().split(/\s+/).filter(Boolean));
  }
  log(`> "${exe}" ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")}`);
  log(`cwd: ${cwd}`);
  const res: SpawnSyncReturns<string> = spawn(exe, args, {
    encoding: "utf8",
    env,
    cwd,
  });
  if (res.stdout) {
    log(res.stdout);
  }
  if (res.stderr) {
    log(res.stderr);
  }
  log(`exit: ${res.status ?? "null"}`);

  if (res.error) {
    log(res.error.message);
    return resolveCheckSyntaxStatus(false, res.status, 0, res.error);
  }

  const verboseListing = opts.verboseListing ?? false;
  if (existsSync(listing)) {
    const txt = readFileSync(listing, "utf8");
    log(`--- listing (${listing}) ---\n${formatListingForLog(txt, verboseListing)}`);
    const diags = diagnosticsFromListing(doc, txt);
    try {
      unlinkSync(listing);
    } catch {
      /* ignore */
    }
    if (diags.length > 0) {
      return { diagnostics: diags, status: "ok" };
    }
    const fallback = resolveCheckSyntaxStatus(true, res.status, 0);
    return { diagnostics: [], status: fallback.status, errorMessage: fallback.errorMessage };
  }

  log("(no listing file produced — check DLC, PROPATH, and runner script)");
  const fallback = resolveCheckSyntaxStatus(false, res.status, 0);
  return { diagnostics: [], status: fallback.status, errorMessage: fallback.errorMessage };
}
