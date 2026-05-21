import * as fs from "node:fs";
import * as path from "node:path";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

async function copyAssets() {
  const outDir = path.join(process.cwd(), "out");
  const resOut = path.join(outDir, "resources");
  fs.mkdirSync(resOut, { recursive: true });
  for (const f of ["check-syntax.p", "abl-keywords.txt"]) {
    const src = path.join(process.cwd(), "resources", f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(resOut, f));
    }
  }
}

const ctx = await esbuild.context({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  platform: "node",
  target: "node18",
  format: "cjs",
  sourcemap: true,
  external: ["vscode", "tree-sitter", "tree-sitter-abl"],
  logLevel: "info",
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await copyAssets();
  await ctx.dispose();
}
