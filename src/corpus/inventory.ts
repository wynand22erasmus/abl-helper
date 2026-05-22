/**
 * ADE corpus file inventory for parse smoke tests (deterministic sample).
 */
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const ABL_EXTENSIONS = new Set([".p", ".cls", ".w", ".i"]);

export type AdeInventoryEntry = { absPath: string; relPath: string };

/** Resolve ADE root from config, ADE_ROOT env, or corpus/ade under cwd. */
export function resolveAdeRoot(configPath: string): string | undefined {
  const trimmed = configPath.trim();
  if (trimmed) {
    return path.resolve(trimmed);
  }
  const env = process.env.ADE_ROOT?.trim();
  if (env) {
    return path.resolve(env);
  }
  const local = path.join(process.cwd(), "corpus", "ade");
  return fs.existsSync(local) ? local : undefined;
}

function walkAblFiles(root: string, maxFileBytes: number, out: AdeInventoryEntry[]): void {
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === ".git") {
          continue;
        }
        stack.push(abs);
        continue;
      }
      if (!ent.isFile()) {
        continue;
      }
      const ext = path.extname(ent.name).toLowerCase();
      if (!ABL_EXTENSIONS.has(ext)) {
        continue;
      }
      let size = 0;
      try {
        size = fs.statSync(abs).size;
      } catch {
        continue;
      }
      if (size > maxFileBytes) {
        continue;
      }
      out.push({ absPath: abs, relPath: path.relative(root, abs) });
    }
  }
}

/** Deterministic hash sort sample of ADE ABL sources under maxFileBytes. */
export function buildAdeInventory(
  adeRoot: string,
  maxFileBytes: number,
  sampleSize: number,
): AdeInventoryEntry[] {
  const all: AdeInventoryEntry[] = [];
  walkAblFiles(adeRoot, maxFileBytes, all);
  all.sort((a, b) => {
    const ha = crypto.createHash("sha256").update(a.relPath).digest();
    const hb = crypto.createHash("sha256").update(b.relPath).digest();
    return ha.compare(hb);
  });
  return all.slice(0, sampleSize);
}
