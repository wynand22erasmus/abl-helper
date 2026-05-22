/**
 * Ambient types for tree-sitter grammar DSL globals (provided by tree-sitter-cli at load time).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

declare function grammar(spec: Record<string, unknown>): unknown;

declare function seq(...args: unknown[]): unknown;
declare function choice(...args: unknown[]): unknown;
declare function prec(left: number | unknown, right?: unknown): unknown;
declare function token(rule: unknown): unknown;
declare function repeat(rule: unknown): unknown;
declare function repeat1(rule: unknown): unknown;
declare function optional(rule: unknown): unknown;
declare function alias(rule: unknown, name: string): unknown;
declare function field(name: string, rule: unknown): unknown;
declare function pattern(regex: RegExp | string): unknown;
