import { performance } from "node:perf_hooks";
import { TextDocument } from "../src/features/editor/model/text-document";

interface Fixture {
  name: string;
  text: string;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index] ?? 0;
}

function measure(name: string, iterations: number, fn: () => void): number[] {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  console.log(
    `${name}: p50=${percentile(samples, 0.5).toFixed(3)}ms p95=${percentile(samples, 0.95).toFixed(3)}ms`,
  );
  return samples;
}

function tsFixture(lines: number): string {
  return Array.from(
    { length: lines },
    (_, index) => `export const value${index} = ${index}; // fixture ${index}`,
  ).join("\n");
}

const fixtures: Fixture[] = [
  { name: "typescript-500", text: tsFixture(500) },
  { name: "typescript-5000", text: tsFixture(5000) },
  {
    name: "log-json-25000",
    text: Array.from(
      { length: 25000 },
      (_, index) => `{"level":"info","index":${index},"message":"editor perf fixture"}`,
    ).join("\n"),
  },
  { name: "long-line-20000", text: "x".repeat(20000) },
];

for (const fixture of fixtures) {
  const document = TextDocument.fromString(fixture.text);
  console.log(`\n${fixture.name}: lines=${document.lineCount()} bytes=${fixture.text.length}`);

  measure("positionAt middle", 500, () => {
    document.positionAt(Math.floor(fixture.text.length / 2));
  });

  measure("offsetAt middle line", 500, () => {
    document.offsetAt(Math.floor(document.lineCount() / 2), 8);
  });

  measure("single-char edit", 250, () => {
    document.applyEdit({
      startOffset: Math.floor(fixture.text.length / 2),
      endOffset: Math.floor(fixture.text.length / 2),
      text: "x",
    });
  });
}
