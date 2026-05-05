import { EDITOR_CONSTANTS } from "../config/constants";
import { TextDocument } from "../model/text-document";

export function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}

export function calculateLineHeight(
  fontSize: number,
  lineHeight: number = EDITOR_CONSTANTS.LINE_HEIGHT_MULTIPLIER,
): number {
  // Use Math.ceil to match getLineHeight() in position.ts
  // Fractional line-height causes subpixel misalignment between layers
  return Math.ceil(fontSize * lineHeight);
}

export function calculateLineOffset(lines: string[], lineIndex: number): number {
  return TextDocument.fromString(lines.join("\n")).offsetAt(lineIndex, 0);
}

export function isMarkdownFile(filePath: string): boolean {
  const extension = filePath.split(".").pop()?.toLowerCase();
  return extension === "md" || extension === "markdown";
}
