import type { GeminiSongEqResponse } from "../../models/GeminiActions";
import type AudioEqSettings from "../../models/AudioEq";
import { GeminiAnalyzeErrorCode } from "../../models/GeminiSettings";
import { AUDIO_EQ_BANDS, normalizeAudioEqSettings } from "../../utils/audioEq";

type RuntimeMessageError = {
  message?: string;
} | null | undefined;

const SONG_EQ_FAILURE_MESSAGE = "Couldn't adjust song EQ. Try again.";

const ALLOWED_FAILURE_CODES = [
  GeminiAnalyzeErrorCode.MissingApiKey,
  GeminiAnalyzeErrorCode.RequestFailed,
  GeminiAnalyzeErrorCode.InvalidResponse,
];

const createGeminiSongEqFailure = (
  message = SONG_EQ_FAILURE_MESSAGE,
): GeminiSongEqResponse => {
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

const readNativeAdjustSongEqArgs = (
  response: unknown,
): Record<string, unknown> | null => {
  if (!isObject(response) || !Array.isArray(response.candidates)) {
    return null;
  }

  const parts = response.candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  for (const part of parts) {
    const functionCall = part?.functionCall;
    if (!isObject(functionCall) || functionCall.name !== "adjustSongEq") {
      continue;
    }

    return isObject(functionCall.args) ? functionCall.args : null;
  }

  return null;
};

const normalizeGeminiSongEqResponse = (
  response: unknown,
  expectedSongId: string,
  runtimeError?: RuntimeMessageError,
): GeminiSongEqResponse => {
  if (runtimeError) {
    return createGeminiSongEqFailure(
      runtimeError.message || SONG_EQ_FAILURE_MESSAGE,
    );
  }

  const nativeFunctionArgs = readNativeAdjustSongEqArgs(response);
  if (nativeFunctionArgs) {
    if (
      nativeFunctionArgs.songId !== expectedSongId ||
      !hasCompleteFiniteAudioEq(nativeFunctionArgs.audioEq)
    ) {
      return createGeminiSongEqFailure();
    }

    return {
      ok: true,
      suggestion: {
        songId: nativeFunctionArgs.songId,
        audioEq: normalizeAudioEqSettings(nativeFunctionArgs.audioEq),
        reason:
          typeof nativeFunctionArgs.reason === "string"
            ? nativeFunctionArgs.reason
            : "",
      },
    };
  }

  if (!isObject(response) || typeof response.ok !== "boolean") {
    return createGeminiSongEqFailure();
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

    return createGeminiSongEqFailure();
  }

  if (!isObject(response.suggestion)) {
    return createGeminiSongEqFailure();
  }

  const { suggestion } = response;

  if (
    suggestion.songId !== expectedSongId ||
    !hasCompleteFiniteAudioEq(suggestion.audioEq)
  ) {
    return createGeminiSongEqFailure();
  }

  return {
    ok: true,
    suggestion: {
      songId: suggestion.songId,
      audioEq: normalizeAudioEqSettings(suggestion.audioEq),
      reason: typeof suggestion.reason === "string" ? suggestion.reason : "",
    },
  };
};

export {
  SONG_EQ_FAILURE_MESSAGE,
  createGeminiSongEqFailure,
  normalizeGeminiSongEqResponse,
};
