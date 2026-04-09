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

const isGeminiAnalyzeResponse = (
  response: unknown
): response is GeminiAnalyzeResponse => {
  const candidate = response as { ok?: unknown } | null;

  return (
    typeof response === "object" &&
    response !== null &&
    "ok" in response &&
    typeof candidate?.ok === "boolean"
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
