import {
  ADJUST_SONG_EQ_CAPABILITY,
  type GeminiAdjustSongEqFunctionCall,
  type GeminiSongEqResponse,
  type GeminiSongEqUserRequest,
} from "../models/GeminiActions";
import AudioEqSettings from "../models/AudioEq";
import { GeminiAnalyzeErrorCode } from "../models/GeminiSettings";
import {
  AUDIO_EQ_BANDS,
  AUDIO_EQ_MAX,
  AUDIO_EQ_MIN,
  normalizeAudioEqSettings,
} from "../utils/audioEq";

const INVALID_SONG_EQ_MESSAGE =
  "Gemini did not return a usable song EQ adjustment.";

const invalidSongEq = (): GeminiSongEqResponse => ({
  ok: false,
  code: GeminiAnalyzeErrorCode.InvalidResponse,
  message: INVALID_SONG_EQ_MESSAGE,
});

const EQ_BAND_CONTRACT = {
  min: AUDIO_EQ_MIN,
  max: AUDIO_EQ_MAX,
  requiredBands: AUDIO_EQ_BANDS.map((band) => band.key),
};

const getAdjustSongEqFunctionName = () =>
  ADJUST_SONG_EQ_CAPABILITY.allowedFunctions[0];

const buildGeminiSongEqRequestBody = ({
  userRequest,
  existingProfiles,
  songContext,
}: GeminiSongEqUserRequest) => {
  const approvedContext = {
    capability: ADJUST_SONG_EQ_CAPABILITY,
    eqBandContract: EQ_BAND_CONTRACT,
    existingEqProfiles: existingProfiles.map(({ name, audioEq }) => ({
      name,
      audioEq: normalizeAudioEqSettings(audioEq),
    })),
    currentSong: {
      id: songContext.id,
      title: songContext.title,
      channelName: songContext.channelName,
      videoId: songContext.videoId,
      url: songContext.url,
      audioEq: normalizeAudioEqSettings(songContext.audioEq),
    },
    userRequest,
  };

  return {
    contents: [
      {
        parts: [
          {
            text: [
              "Suggest one reviewable audio EQ adjustment for the selected song.",
              "Use only the approved EQ context below.",
              "Return JSON only as a function call object.",
              `functionName must be "${getAdjustSongEqFunctionName()}".`,
              "arguments.songId must exactly match currentSong.id.",
              "arguments.audioEq must include clearBass, band400, band1k, band2k5, band6k3, and band16k values from -10 to 10.",
              "arguments.reason should briefly explain the EQ choice.",
              JSON.stringify(approvedContext),
            ].join("\n"),
          },
        ],
      },
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: getAdjustSongEqFunctionName(),
            description: "Suggest audio EQ settings for one selected song.",
            parameters: {
              type: "object",
              properties: {
                songId: { type: "string" },
                audioEq: {
                  type: "object",
                  properties: Object.fromEntries(
                    AUDIO_EQ_BANDS.map((band) => [
                      band.key,
                      {
                        type: "number",
                        minimum: AUDIO_EQ_MIN,
                        maximum: AUDIO_EQ_MAX,
                      },
                    ]),
                  ),
                  required: AUDIO_EQ_BANDS.map((band) => band.key),
                },
                reason: { type: "string" },
              },
              required: ["songId", "audioEq"],
            },
          },
        ],
      },
    ],
  };
};

const readCandidateText = (payload: unknown) => {
  if (
    typeof payload !== "object" ||
    !payload ||
    !Array.isArray((payload as any).candidates)
  ) {
    return "";
  }

  const parts = (payload as any).candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
};

const readFunctionCall = (
  payload: unknown,
): Partial<GeminiAdjustSongEqFunctionCall> | null => {
  if (
    typeof payload !== "object" ||
    !payload ||
    !Array.isArray((payload as any).candidates)
  ) {
    return null;
  }

  const parts = (payload as any).candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  for (const part of parts) {
    const functionCall = part?.functionCall;
    if (typeof functionCall !== "object" || !functionCall) {
      continue;
    }

    return {
      functionName:
        typeof functionCall.name === "string" ? functionCall.name : undefined,
      arguments:
        typeof functionCall.args === "object" && functionCall.args
          ? functionCall.args
          : undefined,
    };
  }

  return null;
};

const extractJsonText = (text: string) => {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const normalized = fencedMatch ? fencedMatch[1].trim() : text.trim();

  if (normalized.startsWith("{") && normalized.endsWith("}")) {
    return normalized;
  }

  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return "";
  }

  return normalized.slice(firstBrace, lastBrace + 1).trim();
};

const hasRequiredAudioEqBands = (
  value: unknown,
): value is Partial<AudioEqSettings> => {
  return (
    typeof value === "object" &&
    !!value &&
    AUDIO_EQ_BANDS.every((band) => Number.isFinite((value as any)[band.key]))
  );
};

const parseGeminiSongEqResponse = (
  payload: unknown,
  expectedSongId: string,
): GeminiSongEqResponse => {
  const functionCall = readFunctionCall(payload);
  let parsed: Partial<GeminiAdjustSongEqFunctionCall> | null = functionCall;

  if (!parsed) {
    const candidateText = readCandidateText(payload);
    const text = extractJsonText(candidateText);

    if (!text) {
      return invalidSongEq();
    }

    try {
      parsed = JSON.parse(text);
    } catch {
      return invalidSongEq();
    }
  }

  if (!parsed) {
    return invalidSongEq();
  }

  const parsedCall = parsed;
  const args = parsedCall.arguments;

  if (
    parsedCall.functionName !== getAdjustSongEqFunctionName() ||
    typeof args !== "object" ||
    !args ||
    args.songId !== expectedSongId ||
    !hasRequiredAudioEqBands(args.audioEq)
  ) {
    return invalidSongEq();
  }

  return {
    ok: true,
    suggestion: {
      songId: args.songId,
      audioEq: normalizeAudioEqSettings(args.audioEq),
      reason: typeof args.reason === "string" ? args.reason.trim() : "",
    },
  };
};

export {
  INVALID_SONG_EQ_MESSAGE,
  buildGeminiSongEqRequestBody,
  parseGeminiSongEqResponse,
};
