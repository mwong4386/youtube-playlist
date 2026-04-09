const GEMINI_API_KEY_STORAGE_KEY = "geminiApiKey";

const enum GeminiAnalyzeErrorCode {
  MissingApiKey = "missing-api-key",
  ItemNotFound = "item-not-found",
  RequestFailed = "request-failed",
  InvalidResponse = "invalid-response",
  InvalidTimestamps = "invalid-timestamps",
}

type GeminiBoundarySuggestion = {
  startTimestamp: number;
  endTimestamp?: number;
};

type GeminiAnalyzeSuccess = {
  ok: true;
  suggestion: GeminiBoundarySuggestion;
};

type GeminiAnalyzeFailure = {
  ok: false;
  code: GeminiAnalyzeErrorCode;
  message: string;
};

export type {
  GeminiAnalyzeFailure,
  GeminiAnalyzeSuccess,
  GeminiBoundarySuggestion,
};
export { GEMINI_API_KEY_STORAGE_KEY, GeminiAnalyzeErrorCode };
