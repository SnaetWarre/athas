import { memo, useEffect, useMemo, useRef } from "react";
import { TextDocument } from "../../model/text-document";
import { useEditorSettingsStore } from "../../stores/settings-store";
import type { Token } from "../../utils/html";

interface MinimapCanvasProps {
  content: string;
  tokens: Token[];
  width: number;
  height: number;
  scale: number;
  lineHeight: number;
}

const CSS_VAR_MAP: Record<string, string> = {
  "token-keyword": "--syntax-keyword",
  "token-string": "--syntax-string",
  "token-comment": "--syntax-comment",
  "token-number": "--syntax-number",
  "token-function": "--syntax-function",
  "token-variable": "--syntax-variable",
  "token-type": "--syntax-type",
  "token-property": "--syntax-property",
  "token-punctuation": "--syntax-punctuation",
  "token-operator": "--syntax-punctuation",
  "token-constant": "--syntax-constant",
  "token-tag": "--syntax-tag",
  "token-attribute": "--syntax-attribute",
};

const MAX_TOKEN_COLORED_LINES = 20000;
const MAX_TOKEN_COLORED_TOKENS = 100000;

function resolveTokenColors(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const colors: Record<string, string> = {};
  for (const [tokenClass, cssVar] of Object.entries(CSS_VAR_MAP)) {
    colors[tokenClass] = style.getPropertyValue(cssVar).trim() || "#d4d4d4";
  }
  return colors;
}

function resolveDefaultColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#d4d4d4";
}

function MinimapCanvasComponent({
  content,
  tokens,
  width,
  height,
  scale,
  lineHeight,
}: MinimapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useEditorSettingsStore.use.theme();
  const documentModel = useMemo(() => TextDocument.fromString(content), [content]);
  const lineOffsets = documentModel.getLineOffsets();
  const lineCount = documentModel.lineCount();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tokenColors = resolveTokenColors();
    const defaultColor = resolveDefaultColor();

    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const scaledLineHeight = lineHeight * scale;
    const charWidth = 1.5;
    const maxDrawableLines = Math.min(lineCount, Math.ceil(height / scaledLineHeight) + 1);
    const useTokenColors =
      lineCount < MAX_TOKEN_COLORED_LINES && tokens.length < MAX_TOKEN_COLORED_TOKENS;

    const tokensByLine = new Map<number, Token[]>();
    if (useTokenColors) {
      let tokenIndex = 0;
      const sortedTokens = [...tokens].sort((a, b) => a.start - b.start);

      for (
        let lineIndex = 0;
        lineIndex < maxDrawableLines && tokenIndex < sortedTokens.length;
        lineIndex++
      ) {
        const lineStart = lineOffsets[lineIndex] ?? 0;
        const lineEnd =
          lineIndex + 1 < lineOffsets.length
            ? Math.max(lineStart, (lineOffsets[lineIndex + 1] ?? lineStart) - 1)
            : content.length;

        while (tokenIndex < sortedTokens.length && sortedTokens[tokenIndex].end <= lineStart) {
          tokenIndex++;
        }

        let scanIndex = tokenIndex;
        while (scanIndex < sortedTokens.length && sortedTokens[scanIndex].start < lineEnd) {
          const token = sortedTokens[scanIndex];
          if (token.end > lineStart) {
            const lineTokens = tokensByLine.get(lineIndex);
            if (lineTokens) {
              lineTokens.push(token);
            } else {
              tokensByLine.set(lineIndex, [token]);
            }
          }
          scanIndex++;
        }
      }
    }

    for (let lineIndex = 0; lineIndex < maxDrawableLines; lineIndex++) {
      const line = documentModel.lineAt(lineIndex);
      const y = lineIndex * scaledLineHeight;

      // Skip if outside visible area
      if (y > height) break;
      if (y + scaledLineHeight < 0) continue;

      const lineTokens = tokensByLine.get(lineIndex) || [];
      const lineStart = lineOffsets[lineIndex] ?? 0;

      // Draw tokens as colored rectangles
      if (lineTokens.length > 0) {
        for (const token of lineTokens) {
          const tokenStartInLine = Math.max(0, token.start - lineStart);
          const tokenEndInLine = Math.min(line.length, token.end - lineStart);

          if (tokenEndInLine <= tokenStartInLine) continue;

          const x = tokenStartInLine * charWidth * scale;
          const tokenWidth = (tokenEndInLine - tokenStartInLine) * charWidth * scale;

          ctx.fillStyle = tokenColors[token.class_name] || defaultColor;
          ctx.fillRect(x, y, Math.max(tokenWidth, 1), Math.max(scaledLineHeight - 1, 1));
        }
      } else if (line.trim().length > 0) {
        // Draw line without tokens as default color
        const trimStart = line.length - line.trimStart().length;
        const trimEnd = line.trimEnd().length;
        const x = trimStart * charWidth * scale;
        const lineWidth = (trimEnd - trimStart) * charWidth * scale;

        ctx.fillStyle = defaultColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, Math.max(lineWidth, 1), Math.max(scaledLineHeight - 1, 1));
        ctx.globalAlpha = 1;
      }
    }
  }, [
    content,
    documentModel,
    height,
    lineCount,
    lineHeight,
    lineOffsets,
    scale,
    theme,
    tokens,
    width,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}

export const MinimapCanvas = memo(MinimapCanvasComponent);
