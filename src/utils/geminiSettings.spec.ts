import test from "node:test";
import {
  GEMINI_API_KEY_STORAGE_KEY,
  GeminiAnalyzeErrorCode,
} from "../models/GeminiSettings";
import {
  createRemoveGeminiApiKeyFeedback,
  createSaveGeminiApiKeyFeedback,
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
  expectEqual(getMaskedGeminiApiKeyLabel("abcd"), "Saved");
  expectEqual(getMaskedGeminiApiKeyLabel("abc"), "Saved");
});

test("createSaveGeminiApiKeyFeedback rejects blank input before saving", async () => {
  let called = false;

  const result = await createSaveGeminiApiKeyFeedback("   ", async () => {
    called = true;
  });

  expectEqual(result, {
    inputValue: "   ",
    status: "Enter an API key before saving.",
  });
  expectEqual(called, false);
});

test("createSaveGeminiApiKeyFeedback clears the field after a successful save", async () => {
  let savedValue = "";

  const result = await createSaveGeminiApiKeyFeedback(
    "  secret-key  ",
    async (value: string) => {
      savedValue = value;
    }
  );

  expectEqual(savedValue, "secret-key");
  expectEqual(result, {
    inputValue: "",
    status: "Gemini API key saved.",
  });
});

test("createSaveGeminiApiKeyFeedback preserves the input when saving fails", async () => {
  const result = await createSaveGeminiApiKeyFeedback(
    "secret-key",
    async () => {
      throw new Error("storage unavailable");
    }
  );

  expectEqual(result, {
    inputValue: "secret-key",
    status: "Couldn't save Gemini API key. Try again.",
  });
});

test("createRemoveGeminiApiKeyFeedback clears the field after a successful remove", async () => {
  let called = false;

  const result = await createRemoveGeminiApiKeyFeedback(async () => {
    called = true;
  });

  expectEqual(called, true);
  expectEqual(result, {
    inputValue: "",
    status: "Gemini API key removed.",
  });
});

test("createRemoveGeminiApiKeyFeedback preserves the input when removing fails", async () => {
  const result = await createRemoveGeminiApiKeyFeedback(
    async () => {
      throw new Error("storage unavailable");
    },
    "typed-value"
  );

  expectEqual(result, {
    inputValue: "typed-value",
    status: "Couldn't remove Gemini API key. Try again.",
  });
});

test("Gemini settings constants stay stable", () => {
  expectEqual(GEMINI_API_KEY_STORAGE_KEY, "geminiApiKey");
  expectEqual(GeminiAnalyzeErrorCode.MissingApiKey, "missing-api-key");
});
