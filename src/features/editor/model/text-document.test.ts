import { describe, expect, it } from "vite-plus/test";
import { TextDocument } from "./text-document";

describe("TextDocument", () => {
  it("maps offsets to positions with binary-searchable line offsets", () => {
    const document = TextDocument.fromString("alpha\nbeta\ngamma");

    expect(document.lineCount()).toBe(3);
    expect(document.positionAt(0)).toEqual({ line: 0, column: 0, offset: 0 });
    expect(document.positionAt(6)).toEqual({ line: 1, column: 0, offset: 6 });
    expect(document.positionAt(10)).toEqual({ line: 1, column: 4, offset: 10 });
    expect(document.positionAt(999)).toEqual({ line: 2, column: 5, offset: 16 });
  });

  it("maps positions to offsets and clamps invalid input", () => {
    const document = TextDocument.fromString("one\ntwo\nthree");

    expect(document.offsetAt(0, 2)).toBe(2);
    expect(document.offsetAt(1, 0)).toBe(4);
    expect(document.offsetAt(2, 50)).toBe(13);
    expect(document.offsetAt(99, 1)).toBe(9);
    expect(document.offsetAt(-1, 1)).toBe(1);
  });

  it("handles empty files, trailing newlines, tabs, unicode, and CRLF", () => {
    expect(TextDocument.fromString("").lineAt(0)).toBe("");
    expect(TextDocument.fromString("a\n").lineCount()).toBe(2);
    expect(TextDocument.fromString("\tλ\r\nnext").lineAt(0)).toBe("\tλ");
  });

  it("applies edits and reports changed line ranges", () => {
    const document = TextDocument.fromString("one\ntwo\nthree", 7);
    const result = document.applyEdit({
      startOffset: document.offsetAt(1, 0),
      endOffset: document.offsetAt(1, 3),
      text: "TWO\nextra",
    });

    expect(result.document.toString()).toBe("one\nTWO\nextra\nthree");
    expect(result.document.version).toBe(8);
    expect(result.changedRange).toEqual({ startLine: 1, endLine: 1, newEndLine: 2 });
    expect(result.newCursorOffset).toBe("one\nTWO\nextra".length);
  });

  it("keeps large-file line lookups stable", () => {
    const text = Array.from({ length: 25000 }, (_, index) => `line-${index}`).join("\n");
    const document = TextDocument.fromString(text);

    expect(document.lineCount()).toBe(25000);
    expect(document.lineAt(24999)).toBe("line-24999");
    expect(document.positionAt(document.offsetAt(20000, 4))).toEqual({
      line: 20000,
      column: 4,
      offset: document.offsetAt(20000, 4),
    });
  });
});
