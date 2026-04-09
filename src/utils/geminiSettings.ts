import { GEMINI_API_KEY_STORAGE_KEY } from "../models/GeminiSettings";

type GeminiApiKeyFeedback = {
  inputValue: string;
  status: string;
};

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

const createSaveGeminiApiKeyFeedback = async (
  inputValue: string,
  onSaveGeminiApiKey: (value: string) => Promise<void>
): Promise<GeminiApiKeyFeedback> => {
  const normalized = normalizeGeminiApiKey(inputValue);
  if (!normalized) {
    return {
      inputValue,
      status: "Enter an API key before saving.",
    };
  }

  try {
    await onSaveGeminiApiKey(normalized);
    return {
      inputValue: "",
      status: "Gemini API key saved.",
    };
  } catch {
    return {
      inputValue,
      status: "Couldn't save Gemini API key. Try again.",
    };
  }
};

const createRemoveGeminiApiKeyFeedback = async (
  onRemoveGeminiApiKey: () => Promise<void>,
  inputValue = ""
): Promise<GeminiApiKeyFeedback> => {
  try {
    await onRemoveGeminiApiKey();
    return {
      inputValue: "",
      status: "Gemini API key removed.",
    };
  } catch {
    return {
      inputValue,
      status: "Couldn't remove Gemini API key. Try again.",
    };
  }
};

export {
  createRemoveGeminiApiKeyFeedback,
  createSaveGeminiApiKeyFeedback,
  getMaskedGeminiApiKeyLabel,
  normalizeGeminiApiKey,
  readStoredGeminiApiKey,
};
