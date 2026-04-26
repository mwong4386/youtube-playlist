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
