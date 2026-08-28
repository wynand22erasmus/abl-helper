import { describe, expect, it } from "vitest";
import {
  CHECK_SYNTAX_DIAGNOSTIC_SOURCE,
  diagnosticsFromListing,
  parseShellArgs,
  parseCompilerMessages,
  resolveCheckSyntaxStatus,
  validateCheckSyntaxPreconditions,
} from "../checkSyntax";
import { Diagnostic, TextDocument, Uri } from "./vscode-stub";

describe("parseCompilerMessages", () => {
  it("parses classic Line markers", () => {
    const txt = `** Line 3 ** Unknown statement -- DEFINE. (214)\n`;
    const m = parseCompilerMessages(txt);
    expect(m.length).toBeGreaterThanOrEqual(1);
    expect(m[0]!.line).toBe(3);
    expect(m[0]!.message).toContain("Unknown statement");
  });

  it("parses (line:col) variant", () => {
    const txt = `** Unknown keyword (12:5) **\n`;
    const m = parseCompilerMessages(txt);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ line: 12, column: 5, message: "Unknown keyword" });
  });

  it("parses Line N: message variant", () => {
    const txt = `Line 7: Something went wrong\n`;
    const m = parseCompilerMessages(txt);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ line: 7, message: "Something went wrong" });
  });

  it("maps warning messages to warning diagnostics", () => {
    const doc = TextDocument.create(Uri.file("x.p"), "DEFINE VARIABLE x AS INTEGER.\n");
    const [diagnostic] = diagnosticsFromListing(doc as never, "** Warning: deprecated syntax (1:8) **\n");
    expect((diagnostic as Diagnostic).severity).toBe(1);
    expect((diagnostic as Diagnostic).range.start.character).toBe(7);
  });
});

describe("parseShellArgs", () => {
  it("keeps quoted values together and supports escapes", () => {
    expect(parseShellArgs(`-param "path with spaces" 'single value' escaped\\ value`)).toEqual([
      "-param",
      "path with spaces",
      "single value",
      "escaped value",
    ]);
  });

  it("rejects unclosed quotes", () => {
    expect(() => parseShellArgs(`-param "unfinished`)).toThrow("Unterminated quote");
  });
});

describe("diagnosticsFromListing", () => {
  it("sets diagnostic source to ABL Helper", () => {
    const doc = TextDocument.create(Uri.file("x.p"), "** Line 1 ** Error one\n");
    const diags = diagnosticsFromListing(doc as never, "** Line 1 ** Error one\n");
    expect(diags.length).toBe(1);
    expect((diags[0] as Diagnostic).source).toBe(CHECK_SYNTAX_DIAGNOSTIC_SOURCE);
  });
});

describe("validateCheckSyntaxPreconditions", () => {
  it("returns undefined when exe, runner, and cwd exist", () => {
    const exists = (p: string) => ["/exe", "/runner", "/cwd"].includes(p);
    expect(validateCheckSyntaxPreconditions("/exe", "/runner", "/cwd", exists)).toBeUndefined();
  });

  it("reports missing executable", () => {
    const exists = (p: string) => p !== "/missing-exe";
    const msg = validateCheckSyntaxPreconditions("/missing-exe", "/runner", "/cwd", exists);
    expect(msg).toContain("executable not found");
  });

  it("reports missing runner", () => {
    const exists = (p: string) => p !== "/missing-runner";
    const msg = validateCheckSyntaxPreconditions("/exe", "/missing-runner", "/cwd", exists);
    expect(msg).toContain("runner not found");
  });

  it("reports missing working directory", () => {
    const exists = (p: string) => p !== "/missing-cwd";
    const msg = validateCheckSyntaxPreconditions("/exe", "/runner", "/missing-cwd", exists);
    expect(msg).toContain("Working directory not found");
  });
});

describe("resolveCheckSyntaxStatus", () => {
  it("returns spawn_failed when spawn error is set", () => {
    const result = resolveCheckSyntaxStatus(false, 1, 0, new Error("ENOENT"));
    expect(result.status).toBe("spawn_failed");
    expect(result.errorMessage).toContain("ENOENT");
  });

  it("returns no_listing when listing file is missing", () => {
    const result = resolveCheckSyntaxStatus(false, 1, 0);
    expect(result.status).toBe("no_listing");
    expect(result.errorMessage).toBeTruthy();
  });

  it("returns spawn_failed on non-zero exit with no diagnostics", () => {
    const result = resolveCheckSyntaxStatus(true, 2, 0);
    expect(result.status).toBe("spawn_failed");
    expect(result.errorMessage).toContain("exited with code 2");
  });

  it("returns ok when listing exists and exit is zero", () => {
    const result = resolveCheckSyntaxStatus(true, 0, 0);
    expect(result.status).toBe("ok");
  });
});
