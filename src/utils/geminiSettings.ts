import { GEMINI_API_KEY_STORAGE_KEY } from "../models/GeminiSettings";

const normalizeGeminiApiKey = (value: unknown) => {
  return typeof value === "string" ? value.trim() : "";
};

const readStoredGeminiApiKey = (value: Record<string, unknown>) => {
  return normalizeGeminiApiKey(value[GEMINI_API_KEY_STORAGE_KEY]);
};

const getMaskedGeminiApiKeyLabel = (value: string) => {
  const normalized = normalizeGeminiApiKey(value);
  if (normalized.length <= 4) {
    return normalized ? "Saved" : "";
  }

  return `Saved ••••${normalized.slice(-4)}`;
};

export {
  getMaskedGeminiApiKeyLabel,
  normalizeGeminiApiKey,
  readStoredGeminiApiKey,
};
