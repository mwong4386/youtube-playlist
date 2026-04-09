import {
  GeminiAnalyzeErrorCode,
  type GeminiAnalyzeFailure,
  type GeminiAnalyzeSuccess,
} from "../../models/GeminiSettings";

type GeminiAnalyzeResponse = GeminiAnalyzeSuccess | GeminiAnalyzeFailure;
type RuntimeMessageError = {
  message?: string;
} | null | undefined;

const ANALYZE_FAILURE_MESSAGE = "Couldn't analyze song boundaries. Try again.";

const createAnalyzeSongBoundariesFailure = (
  message = ANALYZE_FAILURE_MESSAGE
): GeminiAnalyzeFailure => {
  return {
    ok: false,
    code: GeminiAnalyzeErrorCode.RequestFailed,
    message,
  };
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isGeminiBoundarySuggestion = (
  value: unknown
): value is GeminiAnalyzeSuccess["suggestion"] => {
  if (!isObject(value) || typeof value.startTimestamp !== "number") {
    return false;
  }

  return (
    typeof value.endTimestamp === "undefined" ||
    typeof value.endTimestamp === "number"
  );
};

const isGeminiAnalyzeResponse = (
  response: unknown
): response is GeminiAnalyzeResponse => {
  if (!isObject(response) || typeof response.ok !== "boolean") {
    return false;
  }

  if (response.ok) {
    return isGeminiBoundarySuggestion(response.suggestion);
  }

  return (
    typeof response.code === "string" &&
    typeof response.message === "string"
  );
};

const normalizeAnalyzeSongBoundariesResponse = (
  response: unknown,
  runtimeError?: RuntimeMessageError
): GeminiAnalyzeResponse => {
  if (runtimeError) {
    return createAnalyzeSongBoundariesFailure(
      runtimeError.message || ANALYZE_FAILURE_MESSAGE
    );
  }

  if (!isGeminiAnalyzeResponse(response)) {
    return createAnalyzeSongBoundariesFailure();
  }

  return response;
};

export {
  ANALYZE_FAILURE_MESSAGE,
  createAnalyzeSongBoundariesFailure,
  normalizeAnalyzeSongBoundariesResponse,
};
