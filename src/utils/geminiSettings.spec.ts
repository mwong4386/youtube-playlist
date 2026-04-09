import test from "node:test";
import {
  GEMINI_API_KEY_STORAGE_KEY,
  GeminiAnalyzeErrorCode,
} from "../models/GeminiSettings";
import {
  getMaskedGeminiApiKeyLabel,
  normalizeGeminiApiKey,
  readStoredGeminiApiKey,
} from "./geminiSettings";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("normalizeGeminiApiKey trims whitespace and rejects empty values", () => {
  expectEqual(normalizeGeminiApiKey("  abc123  "), "abc123");
  expectEqual(normalizeGeminiApiKey("   "), "");
  expectEqual(normalizeGeminiApiKey(undefined), "");
});

test("readStoredGeminiApiKey returns a normalized key only from the local storage field", () => {
  expectEqual(
    readStoredGeminiApiKey({ [GEMINI_API_KEY_STORAGE_KEY]: "  secret-key  " }),
    "secret-key"
  );
  expectEqual(readStoredGeminiApiKey({ wrong: "secret-key" }), "");
});

test("getMaskedGeminiApiKeyLabel only reveals the last four characters", () => {
  expectEqual(getMaskedGeminiApiKeyLabel("abcd1234"), "Saved ••••1234");
  expectEqual(getMaskedGeminiApiKeyLabel("abc"), "Saved");
});

test("Gemini settings constants stay stable", () => {
  expectEqual(GEMINI_API_KEY_STORAGE_KEY, "geminiApiKey");
  expectEqual(GeminiAnalyzeErrorCode.MissingApiKey, "missing-api-key");
});
