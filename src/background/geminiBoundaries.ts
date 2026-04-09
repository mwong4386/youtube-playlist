import MPlaylistItem from "../models/MPlaylistItem";
import {
  GeminiAnalyzeErrorCode,
  type GeminiAnalyzeFailure,
  type GeminiAnalyzeSuccess,
} from "../models/GeminiSettings";

const buildGeminiBoundaryRequestBody = (item: MPlaylistItem) => {
  return {
    contents: [
      {
        parts: [
          {
            text: [
              "Identify the most likely music start and stop timestamps for this YouTube song.",
              "Return JSON only with numeric startTimestamp and optional endTimestamp fields.",
              `title: ${item.title}`,
              `channelName: ${item.channelName}`,
              `url: ${item.url}`,
              `videoId: ${item.videoId}`,
              `maxDuration: ${item.maxDuration}`,
              `savedStartTimestamp: ${item.timestamp}`,
              `savedEndTimestamp: ${item.endTimestamp ?? "until-end"}`,
            ].join("\n"),
          },
        ],
      },
    ],
  };
};

const invalidResponse = (): GeminiAnalyzeFailure => ({
  ok: false,
  code: GeminiAnalyzeErrorCode.InvalidResponse,
  message: "Gemini returned an unreadable response.",
});

const invalidTimestamps = (): GeminiAnalyzeFailure => ({
  ok: false,
  code: GeminiAnalyzeErrorCode.InvalidTimestamps,
  message: "Gemini returned invalid timestamps.",
});

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

const parseGeminiBoundaryResponse = (
  payload: unknown,
  maxDuration: number,
): GeminiAnalyzeSuccess | GeminiAnalyzeFailure => {
  const text = extractJsonText(readCandidateText(payload));

  if (!text) {
    return invalidResponse();
  }

  let parsed: { startTimestamp?: unknown; endTimestamp?: unknown };

  try {
    parsed = JSON.parse(text);
  } catch {
    return invalidResponse();
  }

  const startTimestamp =
    typeof parsed.startTimestamp === "number" &&
    Number.isFinite(parsed.startTimestamp)
      ? Math.floor(parsed.startTimestamp)
      : NaN;
  const hasEndTimestamp = typeof parsed.endTimestamp !== "undefined";
  const endTimestamp = hasEndTimestamp
    ? typeof parsed.endTimestamp === "number" &&
      Number.isFinite(parsed.endTimestamp)
      ? Math.floor(parsed.endTimestamp)
      : NaN
    : undefined;

  const hasValidStart =
    Number.isFinite(startTimestamp) &&
    startTimestamp >= 0 &&
    startTimestamp < maxDuration;
  const hasValidEnd =
    typeof endTimestamp === "undefined" ||
    (Number.isFinite(endTimestamp) &&
      endTimestamp > startTimestamp &&
      endTimestamp <= maxDuration);

  if (!hasValidStart || !hasValidEnd) {
    return invalidTimestamps();
  }

  return {
    ok: true,
    suggestion: {
      startTimestamp,
      ...(typeof endTimestamp === "undefined" ? {} : { endTimestamp }),
    },
  };
};

export { buildGeminiBoundaryRequestBody, parseGeminiBoundaryResponse };
