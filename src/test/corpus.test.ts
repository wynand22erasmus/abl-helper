import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { buildAdeInventory, resolveAdeRoot } from "../corpus/inventory";
import { createAblParser, resetWasmParserInitForTests } from "../ablParser";

describe("ADE corpus smoke", () => {
  const root = path.resolve(__dirname, "..", "..");
  const ade = resolveAdeRoot("");

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
    const files = buildAdeInventory(ade, 512 * 1024, 50);
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
