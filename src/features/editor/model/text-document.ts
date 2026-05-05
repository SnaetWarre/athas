import type { Position } from "../types/editor";

export interface TextEdit {
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface EditResult {
  document: TextDocument;
  changedRange: {
    startLine: number;
    endLine: number;
    newEndLine: number;
  };
  newCursorOffset: number;
}

function buildLineOffsets(text: string): number[] {
  const offsets = [0];

  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      offsets.push(i + 1);
    }
  }

  return offsets;
}

function findLineForOffset(offset: number, lineOffsets: readonly number[]): number {
  let low = 0;
  let high = lineOffsets.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lineOffsets[mid] <= offset) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

export class TextDocument {
  private constructor(
    private readonly text: string,
    private readonly lineOffsets: number[],
    readonly version: number,
  ) {}

  static fromString(text: string, version = 0): TextDocument {
    return new TextDocument(text, buildLineOffsets(text), version);
  }

  toString(): string {
    return this.text;
  }

  lineCount(): number {
    return this.lineOffsets.length;
  }

  lineAt(line: number): string {
    const clampedLine = Math.max(0, Math.min(line, this.lineOffsets.length - 1));
    const start = this.lineOffsets[clampedLine] ?? 0;
    const nextStart = this.lineOffsets[clampedLine + 1];
    const rawEnd = nextStart === undefined ? this.text.length : nextStart - 1;
    const end = rawEnd > start && this.text.charCodeAt(rawEnd - 1) === 13 ? rawEnd - 1 : rawEnd;
    return this.text.slice(start, end);
  }

  offsetAt(line: number, column: number): number {
    const clampedLine = Math.max(0, Math.min(line, this.lineOffsets.length - 1));
    const lineStart = this.lineOffsets[clampedLine] ?? 0;
    const lineLength = this.lineAt(clampedLine).length;
    return lineStart + Math.max(0, Math.min(column, lineLength));
  }

  positionAt(offset: number): Position {
    const clampedOffset = Math.max(0, Math.min(offset, this.text.length));
    const line = findLineForOffset(clampedOffset, this.lineOffsets);
    const lineStart = this.lineOffsets[line] ?? 0;
    const column = Math.min(clampedOffset - lineStart, this.lineAt(line).length);

    return {
      line,
      column,
      offset: clampedOffset,
    };
  }

  applyEdit(edit: TextEdit): EditResult {
    const startOffset = Math.max(0, Math.min(edit.startOffset, this.text.length));
    const endOffset = Math.max(startOffset, Math.min(edit.endOffset, this.text.length));
    const startLine = this.positionAt(startOffset).line;
    const endLine = this.positionAt(endOffset).line;
    const nextText = this.text.slice(0, startOffset) + edit.text + this.text.slice(endOffset);
    const document = TextDocument.fromString(nextText, this.version + 1);
    const newCursorOffset = startOffset + edit.text.length;
    const newEndLine = document.positionAt(newCursorOffset).line;

    return {
      document,
      changedRange: {
        startLine,
        endLine,
        newEndLine,
      },
      newCursorOffset,
    };
  }

  getLineOffsets(): readonly number[] {
    return this.lineOffsets;
  }
}

export function positionAtOffset(offset: number, lines: readonly string[]): Position {
  return TextDocument.fromString(lines.join("\n")).positionAt(offset);
}
