/** Minimal vscode API surface for Vitest (Node) — not used at runtime in VS Code. */
export enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 14,
  Number = 15,
  Boolean = 16,
  Array = 17,
  Object = 18,
  Key = 19,
  Null = 20,
  EnumMember = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export class Position {
  constructor(
    public line: number,
    public character: number,
  ) {}
}

export class Range {
  start: Position;
  end: Position;

  constructor(
    startLineOrStart: number | Position,
    startColOrEnd?: number | Position,
    endLine?: number,
    endCol?: number,
  ) {
    if (startLineOrStart instanceof Position) {
      this.start = startLineOrStart;
      this.end = startColOrEnd as Position;
    } else {
      this.start = new Position(startLineOrStart, startColOrEnd as number);
      this.end = new Position(endLine!, endCol!);
    }
  }
}

export class DocumentSymbol {
  constructor(
    public name: string,
    public detail: string,
    public kind: SymbolKind,
    public range: Range,
    public selectionRange: Range,
    public children: DocumentSymbol[] = [],
  ) {}
}

export const Uri = {
  file: (p: string) => ({ fsPath: p, path: p, scheme: "file" }),
};

export class TextDocument {
  constructor(
    public uri: { fsPath: string },
    public languageId: string,
    public version: number,
    private _text: string,
  ) {}

  get lineCount(): number {
    return this._text.split(/\r?\n/).length;
  }

  getText(_range?: Range): string {
    return this._text;
  }

  lineAt(line: number): { text: string } {
    const lines = this._text.split(/\r?\n/);
    return { text: lines[line] ?? "" };
  }

  static create(uri: { fsPath: string }, text: string): TextDocument {
    return new TextDocument(uri, "abl", 1, text);
  }
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export class Diagnostic {
  source?: string;

  constructor(
    public range: Range,
    public message: string,
    public severity?: DiagnosticSeverity,
  ) {}
}

export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  File = 16,
  Reference = 17,
  Folder = 18,
  EnumMember = 19,
  Constant = 20,
  Struct = 21,
  Event = 22,
  Operator = 23,
  TypeParameter = 24,
}

export class CompletionItem {
  constructor(
    public label: string,
    public kind?: CompletionItemKind,
  ) {}
  insertText?: string;
  detail?: string;
  range?: Range;
  sortText?: string;
}
