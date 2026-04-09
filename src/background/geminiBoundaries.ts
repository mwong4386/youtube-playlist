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

const parseGeminiBoundaryResponse = (
  payload: unknown,
  maxDuration: number,
): GeminiAnalyzeSuccess | GeminiAnalyzeFailure => {
  const text =
    typeof payload === "object" &&
    payload &&
    Array.isArray((payload as any).candidates) &&
    typeof (payload as any).candidates[0]?.content?.parts?.[0]?.text === "string"
      ? (payload as any).candidates[0].content.parts[0].text
      : "";

  if (!text) {
    return invalidResponse();
  }

  let parsed: { startTimestamp?: unknown; endTimestamp?: unknown };

  try {
    parsed = JSON.parse(text);
  } catch {
    return invalidResponse();
  }

  const startTimestamp = Math.floor(Number(parsed.startTimestamp));
  const hasEndTimestamp = typeof parsed.endTimestamp !== "undefined";
  const endTimestamp = hasEndTimestamp
    ? Math.floor(Number(parsed.endTimestamp))
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
