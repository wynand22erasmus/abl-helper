/**
 * Types for the vendored tree-sitter web binding (parser/runtime/tree-sitter-web.d.ts).
 */
import type Parser from "abl-helper-tree-sitter";

export type TreeSitterParserCtor = typeof Parser;
export type SyntaxNode = Parser.SyntaxNode;
export type ParseTree = Parser.Tree;
export type Point = Parser.Point;
