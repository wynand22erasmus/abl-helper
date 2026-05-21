import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import * as vscode from "vscode";

export interface CheckSyntaxOptions {
  dlc: string;
  workingDirectory: string;
  propath: string[];
  parameterFiles: string[];
  batchExecutable: string;
  extraArgs: string;
}

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
  throw new Error("DLC is not configured. Set ablHelper.dlcPath or the DLC environment variable.");
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

/** Parse Progress compiler / listing style messages into diagnostics */
export function parseCompilerMessages(content: string): { line: number; message: string }[] {
  const out: { line: number; message: string }[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    let m = line.match(/\*\*\s+Line\s+(\d+)\s+\*\*\s*(.+)/i);
    if (m) {
      out.push({ line: Math.max(1, parseInt(m[1]!, 10)), message: m[2]!.trim() });
      continue;
    }
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

export function runCheckSyntax(
  doc: vscode.TextDocument,
  opts: CheckSyntaxOptions,
  runnerPath: string,
  log: (s: string) => void,
): vscode.Diagnostic[] {
  const workspaceRoot = vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath ?? path.dirname(doc.uri.fsPath);
  const dlc = resolveDlc(opts.dlc);
  const exe = batchExePath(dlc, opts.batchExecutable);
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
  log(`cwd: ${opts.workingDirectory.replace(/\$\{workspaceFolder\}/gi, workspaceRoot)}`);
  const res = spawnSync(exe, args, {
    encoding: "utf8",
    env,
    cwd: opts.workingDirectory.replace(/\$\{workspaceFolder\}/gi, workspaceRoot),
  });
  if (res.stdout) {
    log(res.stdout);
  }
  if (res.stderr) {
    log(res.stderr);
  }
  log(`exit: ${res.status ?? "null"}`);

  const diags: vscode.Diagnostic[] = [];
  if (fs.existsSync(listing)) {
    const txt = fs.readFileSync(listing, "utf8");
    log(`--- listing (${listing}) ---\n${txt}`);
    for (const { line, message } of parseCompilerMessages(txt)) {
      const idx = line - 1;
      const textLine = doc.lineAt(Math.min(Math.max(0, idx), doc.lineCount - 1));
      const range = new vscode.Range(idx, 0, idx, textLine.text.length);
      diags.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error));
    }
    try {
      fs.unlinkSync(listing);
    } catch {
      /* ignore */
    }
  } else {
    log("(no listing file produced — check DLC, PROPATH, and runner script)");
  }
  return diags;
}
