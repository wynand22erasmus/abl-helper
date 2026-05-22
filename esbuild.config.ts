/**
 * Bundle extension entry to ESM for the VS Code extension host (package.json type: module).
 * Vendored parser/runtime (tree-sitter.cjs + compiled tree-sitter.js) copied alongside; WASM in out/assets/.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const RESOURCE_FILES = ["check-syntax.p", "abl-keywords.txt"];
const PARSER_WASM_FILES = ["tree-sitter.wasm", "tree-sitter-abl.wasm"];
const PARSER_RUNTIME_FILES = ["tree-sitter.cjs", "tree-sitter.js", "index.js"];

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

  const runtimeSrc = path.join(process.cwd(), "parser", "runtime");
  const runtimeOut = path.join(process.cwd(), "out", "parser", "runtime");
  if (fs.existsSync(runtimeSrc)) {
    fs.mkdirSync(runtimeOut, { recursive: true });
    for (const f of PARSER_RUNTIME_FILES) {
      const src = path.join(runtimeSrc, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(runtimeOut, f));
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
  format: "esm",
  sourcemap: true,
  external: ["vscode"],
  logLevel: "info",
  plugins: [copyAssetsPlugin],
});

if (watch) {
  await ctx.watch();
  console.log("[esbuild] watching (assets → out/resources/, out/assets/, out/parser/runtime/)");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
