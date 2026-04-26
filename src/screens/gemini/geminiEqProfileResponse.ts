import type { GeminiEqProfileResponse } from "../../models/GeminiActions";
import type AudioEqSettings from "../../models/AudioEq";
import { GeminiAnalyzeErrorCode } from "../../models/GeminiSettings";
import { AUDIO_EQ_BANDS, normalizeAudioEqSettings } from "../../utils/audioEq";

type RuntimeMessageError = {
  message?: string;
} | null | undefined;

const EQ_PROFILE_FAILURE_MESSAGE = "Couldn't generate an EQ profile. Try again.";

const ALLOWED_FAILURE_CODES = [
  GeminiAnalyzeErrorCode.MissingApiKey,
  GeminiAnalyzeErrorCode.RequestFailed,
  GeminiAnalyzeErrorCode.InvalidResponse,
];

const createGeminiEqProfileFailure = (
  message = EQ_PROFILE_FAILURE_MESSAGE,
): GeminiEqProfileResponse => {
  return {
    ok: false,
    code: GeminiAnalyzeErrorCode.RequestFailed,
    message,
  };
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isAllowedFailureCode = (
  value: unknown,
): value is GeminiAnalyzeErrorCode => {
  return (
    typeof value === "string" &&
    ALLOWED_FAILURE_CODES.includes(value as GeminiAnalyzeErrorCode)
  );
};

const hasCompleteFiniteAudioEq = (
  value: unknown,
): value is Partial<AudioEqSettings> => {
  return (
    isObject(value) &&
    AUDIO_EQ_BANDS.every((band) => {
      const bandValue = value[band.key];
      return typeof bandValue === "number" && Number.isFinite(bandValue);
    })
  );
};

const normalizeGeminiEqProfileResponse = (
  response: unknown,
  runtimeError?: RuntimeMessageError,
): GeminiEqProfileResponse => {
  if (runtimeError) {
    return createGeminiEqProfileFailure(
      runtimeError.message || EQ_PROFILE_FAILURE_MESSAGE,
    );
  }

  if (!isObject(response) || typeof response.ok !== "boolean") {
    return createGeminiEqProfileFailure();
  }

  if (!response.ok) {
    if (
      isAllowedFailureCode(response.code) &&
      typeof response.message === "string"
    ) {
      return {
        ok: false,
        code: response.code,
        message: response.message,
      };
    }

    return createGeminiEqProfileFailure();
  }

  if (!isObject(response.suggestion)) {
    return createGeminiEqProfileFailure();
  }

  const { suggestion } = response;
  const name = typeof suggestion.name === "string" ? suggestion.name.trim() : "";

  if (name.length === 0 || !hasCompleteFiniteAudioEq(suggestion.audioEq)) {
    return createGeminiEqProfileFailure();
  }

  return {
    ok: true,
    suggestion: {
      name,
      audioEq: normalizeAudioEqSettings(suggestion.audioEq),
      reason: typeof suggestion.reason === "string" ? suggestion.reason : "",
    },
  };
};

export {
  EQ_PROFILE_FAILURE_MESSAGE,
  createGeminiEqProfileFailure,
  normalizeGeminiEqProfileResponse,
};
