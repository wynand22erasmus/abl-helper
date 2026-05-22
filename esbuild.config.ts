/**
 * Bundle extension entry to CommonJS for Node (VS Code extension host).
 * web-tree-sitter is bundled; parser WASM lives in out/assets/ (from src/assets/).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const RESOURCE_FILES = ["check-syntax.p", "abl-keywords.txt"];
const PARSER_WASM_FILES = ["tree-sitter.wasm", "tree-sitter-abl.wasm"];

async function copyAssets() {
  const resOut = path.join(process.cwd(), "out", "resources");
  fs.mkdirSync(resOut, { recursive: true });
  for (const f of RESOURCE_FILES) {
    const src = path.join(process.cwd(), "resources", f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(resOut, f));
    }
  }

  const wasmSrc = path.join(process.cwd(), "src", "assets");
  const wasmOut = path.join(process.cwd(), "out", "assets");
  if (fs.existsSync(wasmSrc)) {
    fs.mkdirSync(wasmOut, { recursive: true });
    for (const f of PARSER_WASM_FILES) {
      const src = path.join(wasmSrc, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(wasmOut, f));
      }
    }
  }
}

const copyAssetsPlugin = {
  name: "copy-abl-assets",
  setup(build: esbuild.PluginBuild) {
    build.onEnd(async (result) => {
      if (result.errors.length === 0) {
        await copyAssets();
      }
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  platform: "node",
  target: "node18",
  format: "cjs",
  sourcemap: true,
  external: ["vscode"],
  logLevel: "info",
  plugins: [copyAssetsPlugin],
});

if (watch) {
  await ctx.watch();
  console.log("[esbuild] watching src/extension.ts (assets → out/resources/, out/assets/)");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
