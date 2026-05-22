#!/usr/bin/env node
/**
 * Fail if any .js, .jsx, or .mjs source files exist under src/ or scripts/.
 *
 * Does NOT apply to parser/ (grammar.js is generated; tree-sitter.cjs is vendored)
 * or compiled output under out/. See docs/TYPESCRIPT.md.
 */
import { readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT_DIRS = ["src", "scripts"] as const;
const FORBIDDEN = new Set([".js", ".jsx", ".mjs"]);

function collectForbidden(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      found.push(...collectForbidden(full));
    } else if (FORBIDDEN.has(extname(name))) {
      found.push(relative(process.cwd(), full));
    }
  }
  return found;
}

const offenders: string[] = [];
for (const rel of ROOT_DIRS) {
  const dir = join(process.cwd(), rel);
  offenders.push(...collectForbidden(dir));
}

if (offenders.length > 0) {
  console.error(
    "TypeScript-only policy: no .js/.jsx/.mjs files allowed under src/ or scripts/",
  );
  for (const f of offenders) {
    console.error(`  ${f}`);
  }
  process.exit(1);
}
