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

const getCssBlock = (css: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(
    new RegExp(`(^|\\n)${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"),
  );

  return match?.[2] ?? "";
};

test("GeminiEqProfileBuilder exposes back and settings actions", () => {
  expectEqual(source.includes("onBack"), true);
  expectEqual(source.includes("onOpenSettings"), true);
  expectEqual(source.includes('aria-label="Back to playlist"'), true);
  expectEqual(source.includes('aria-label="Open Gemini settings"'), true);
});

test("GeminiEqProfileBuilder keeps one menu-style settings entry in the header", () => {
  expectEqual(source.includes('src="./assets/menu30.svg"'), true);
  expectEqual(source.includes(">Gemini settings<"), false);
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
  expectEqual(cssSource.includes(".backButton,\n.settingsButton"), true);
  expectEqual(cssSource.includes("width: auto;"), true);
  expectEqual(cssSource.includes("padding: 0 10px;"), true);
});

test("GeminiEqProfileBuilder panel inherits the playlist surface", () => {
  const panelBlock = getCssBlock(cssSource, ".panel");

  expectEqual(panelBlock.includes("background:"), false);
});
