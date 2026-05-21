import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { buildAdeInventory, resolveAdeRoot } from "../corpus/inventory";
import { createAblParser, resetWasmParserInitForTests } from "../ablParser";

/** Defaults aligned with package.json ablHelper.corpus.* settings. */
const DEFAULT_CORPUS_MAX_FILE_BYTES = 1048576;
const DEFAULT_CORPUS_SAMPLE_SIZE = 400;

function corpusMaxFileBytes(): number {
  const env = process.env.ABL_CORPUS_MAX_FILE_BYTES?.trim();
  if (env) {
    const n = Number(env);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return DEFAULT_CORPUS_MAX_FILE_BYTES;
}

function corpusSampleSize(): number {
  const env = process.env.ABL_CORPUS_SAMPLE_SIZE?.trim();
  if (env) {
    const n = Number(env);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return DEFAULT_CORPUS_SAMPLE_SIZE;
}

describe("ADE corpus smoke", () => {
  const root = path.resolve(__dirname, "..", "..");
  const adeRootConfig = process.env.ABL_CORPUS_ADE_ROOT?.trim() ?? "";
  const ade = resolveAdeRoot(adeRootConfig);

  beforeAll(() => {
    resetWasmParserInitForTests();
  });

  afterAll(() => {
    resetWasmParserInitForTests();
  });

  it("parses sampled ADE files when corpus is present", async () => {
    if (!ade || !fs.existsSync(ade)) {
      expect(true).toBe(true);
      return;
    }
    const files = buildAdeInventory(ade, corpusMaxFileBytes(), corpusSampleSize());
    expect(files.length).toBeGreaterThan(0);
    const parser = await createAblParser(root);
    if (parser.mode === "none") {
      throw new Error("Parser required for corpus tests");
    }
    for (const f of files) {
      const src = fs.readFileSync(f.absPath, "utf8");
      const tree = parser.parse(src);
      expect(tree.rootNode).toBeTruthy();
      tree.delete();
    }
    parser.dispose();
  });
});
