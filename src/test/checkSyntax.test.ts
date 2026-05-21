import { describe, expect, it } from "vitest";
import { parseCompilerMessages } from "../checkSyntax";

describe("parseCompilerMessages", () => {
  it("parses Line markers", () => {
    const txt = `** Line 3 ** Unknown statement -- DEFINE. (214)\n`;
    const m = parseCompilerMessages(txt);
    expect(m.length).toBeGreaterThanOrEqual(1);
    expect(m[0]!.line).toBe(3);
  });
});
