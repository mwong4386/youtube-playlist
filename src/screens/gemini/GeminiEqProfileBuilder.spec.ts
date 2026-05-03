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

test("GeminiEqProfileBuilder exposes close action in modal chrome", () => {
  expectEqual(source.includes("onBack"), true);
  expectEqual(source.includes("onOpenSettings"), true);
  expectEqual(source.includes('import ModalChromeHeader from "../modal/ModalChromeHeader"'), true);
  expectEqual(source.includes('closeLabel="Close Gemini EQ"'), true);
  expectEqual(source.includes(">Back<"), false);
  expectEqual(source.includes("action={"), false);
});

test("GeminiEqProfileBuilder does not render a separate key icon action", () => {
  expectEqual(source.includes('src="./assets/menu30.svg"'), false);
  expectEqual(source.includes('import GeminiKeyIcon from "../icons/GeminiKeyIcon"'), false);
  expectEqual(source.includes("<GeminiKeyIcon className={styles.settingsIcon} />"), false);
  expectEqual(source.includes('aria-label="Open Gemini settings"'), false);
  expectEqual(source.includes("<circle cx=\"8\" cy=\"12\" r=\"4\" />"), false);
  expectEqual(source.includes("<path d=\"M12 12h10\" />"), false);
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
  expectEqual(source.includes(">Describe an optional EQ preference"), false);
  expectEqual(source.includes('aria-label="Describe an optional EQ preference"'), true);
  expectEqual(source.includes("Describe an optional EQ preference"), true);
  expectEqual(source.includes("userRequest: normalizedRequest"), true);
});

test("GeminiEqProfileBuilder turns generation into a key action without a saved key", () => {
  expectEqual(source.includes("geminiApiKey:"), true);
  expectEqual(source.includes("const hasGeminiApiKey = geminiApiKey.trim().length > 0;"), true);
  expectEqual(source.includes("disabled={!hasGeminiApiKey}"), true);
  expectEqual(
    source.includes("Add a Gemini API key first, then describe an optional EQ preference."),
    true,
  );
  expectEqual(source.includes("onClick={hasGeminiApiKey ? onGenerate : onOpenSettings}"), true);
  expectEqual(source.includes('hasGeminiApiKey ? "Generate" : "Key"'), true);
});

test("embedded Gemini action lives beside the Ask Gemini title", () => {
  const embeddedHeaderBlock = getCssBlock(cssSource, ".embeddedHeader");
  const embeddedActionBlock = getCssBlock(cssSource, ".embeddedActionButton");

  expectEqual(source.includes("const primaryAction = ("), true);
  expectEqual(source.includes('<h3 className={styles.embeddedTitle}>Ask Gemini</h3>\n          {primaryAction}'), true);
  expectEqual(source.includes("{!embedded && <div className={styles.actions}>{primaryAction}</div>}"), true);
  expectEqual(source.includes("styles.embeddedActionButton"), true);
  expectEqual(embeddedHeaderBlock.includes("margin-bottom: 8px;"), true);
  expectEqual(embeddedActionBlock.includes("border-radius: 999px;"), true);
  expectEqual(embeddedActionBlock.includes("background:"), false);
  expectEqual(embeddedActionBlock.includes("color: #ffffff;"), true);
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

test("GeminiEqProfileBuilder does not keep unused settings icon styles", () => {
  expectEqual(cssSource.includes(".backButton"), false);
  expectEqual(cssSource.includes("width: auto;"), false);
  expectEqual(cssSource.includes(".settingsButton"), false);
  expectEqual(cssSource.includes(".settingsIcon"), false);
});

test("GeminiEqProfileBuilder panel inherits the playlist surface", () => {
  const panelBlock = getCssBlock(cssSource, ".panel");

  expectEqual(panelBlock.includes("background:"), false);
});

test("GeminiEqProfileBuilder can embed inside another profile creation view", () => {
  expectEqual(source.includes("embedded?:"), true);
  expectEqual(source.includes("onPreviewProfile?:"), true);
  expectEqual(source.includes("!embedded &&"), true);
  expectEqual(source.includes("Gemini assisted profile creation"), true);
});

test("embedded Gemini preview hydrates the host editor instead of duplicating bands", () => {
  expectEqual(source.includes("onPreviewProfile(response.suggestion)"), true);
  expectEqual(source.includes("{suggestion && !embedded && ("), true);
  expectEqual(source.includes("Review and edit the EQ profile below."), true);
});
