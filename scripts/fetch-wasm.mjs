#!/usr/bin/env node
/**
 * Download tree-sitter runtime + ABL grammar WASM into wasm/ (for CI and Windows dev without native build).
 * Sources: tree-sitter v0.24.7 release assets; tree-sitter-abl@0.1.2 on unpkg.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const loc = res.headers.location;
          file.close();
          fs.unlinkSync(dest);
          if (!loc) {
            reject(new Error("Redirect without location"));
            return;
          }
          download(loc, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", (err) => {
        file.close();
        try {
          fs.unlinkSync(dest);
        } catch {
          /* ignore */
        }
        reject(err);
      });
  });
}

const root = process.cwd();
const wasmDir = path.join(root, "wasm");
fs.mkdirSync(wasmDir, { recursive: true });

const coreUrl = "https://github.com/tree-sitter/tree-sitter/releases/download/v0.24.7/tree-sitter.wasm";
const ablUrl = "https://unpkg.com/tree-sitter-abl@0.1.2/tree-sitter-abl.wasm";

await download(coreUrl, path.join(wasmDir, "tree-sitter.wasm"));
await download(ablUrl, path.join(wasmDir, "tree-sitter-abl.wasm"));
console.log("Wrote wasm/ tree-sitter.wasm and tree-sitter-abl.wasm");
