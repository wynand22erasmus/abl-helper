#!/usr/bin/env node
/**
 * Fail if any .js or .jsx source files exist under src/.
 * Root/tooling .mjs (esbuild, eslint, scripts/) are allowed by convention.
 */
import { readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const SRC = join(process.cwd(), "src");
const FORBIDDEN = new Set([".js", ".jsx"]);

function collectJs(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      found.push(...collectJs(full));
    } else if (FORBIDDEN.has(extname(name))) {
      found.push(relative(process.cwd(), full));
    }
  }
  return found;
}

const offenders = collectJs(SRC);
if (offenders.length > 0) {
  console.error("TypeScript-only policy: no .js/.jsx files allowed under src/");
  for (const f of offenders) {
    console.error(`  ${f}`);
  }
  process.exit(1);
}
