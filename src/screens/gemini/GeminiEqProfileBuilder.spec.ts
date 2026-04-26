import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/screens/gemini/GeminiEqProfileBuilder.tsx"),
  "utf8",
);
const cssSource = readFileSync(
  join(process.cwd(), "src/screens/gemini/GeminiEqProfileBuilder.module.css"),
  "utf8",
);

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

test("GeminiEqProfileBuilder exposes back and settings actions", () => {
  expectEqual(source.includes("onBack"), true);
  expectEqual(source.includes("onOpenSettings"), true);
  expectEqual(source.includes('aria-label="Back to playlist"'), true);
  expectEqual(source.includes('aria-label="Open Gemini settings"'), true);
});

test("GeminiEqProfileBuilder requests Gemini before creating a profile", () => {
  expectEqual(source.includes("requestGeminiEqProfile"), true);
  expectEqual(
    source.includes("onCreateProfile(suggestion.name, suggestion.audioEq)"),
    true,
  );
  expectEqual(source.includes("if (!suggestion)"), true);
});

test("GeminiEqProfileBuilder allows optional prompt text", () => {
  expectEqual(source.includes("Describe the EQ profile you want first."), false);
  expectEqual(source.includes("Describe an optional EQ preference"), true);
  expectEqual(source.includes("userRequest: normalizedRequest"), true);
});

test("GeminiEqProfileBuilder supports optional song context", () => {
  expectEqual(source.includes("songContext?"), true);
  expectEqual(source.includes("songContext,"), true);
});

test("GeminiEqProfileBuilder clears stale previews before generating", () => {
  expectEqual(
    source.includes("setIsGenerating(true);\n    setSuggestion(null);"),
    true,
  );
});

test("GeminiEqProfileBuilder announces async status messages", () => {
  expectEqual(source.includes('role="status"'), true);
  expectEqual(source.includes('aria-live="polite"'), true);
});

test("GeminiEqProfileBuilder header actions fit text labels", () => {
  expectEqual(cssSource.includes("width: auto;"), true);
  expectEqual(cssSource.includes("padding: 0 10px;"), true);
});
