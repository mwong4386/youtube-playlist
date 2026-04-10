import MPlaylistItem from "../models/MPlaylistItem";
import {
  GeminiAnalyzeErrorCode,
  type GeminiAnalyzeFailure,
  type GeminiAnalyzeSuccess,
} from "../models/GeminiSettings";

type GeminiBoundaryDiagnosticLogger = (
  reason: string,
  details?: Record<string, unknown>,
) => void;

const buildGeminiBoundaryRequestBody = (item: MPlaylistItem) => {
  const youtubeUrl = `https://www.youtube.com/watch?v=${item.videoId}`;

  return {
    contents: [
      {
        parts: [
          {
            text: [
              "Identify the tight musical performance boundary for this YouTube song.",
              "Set startTimestamp to the first intentional musical sound, not the video intro, title card, ambient room tone, countdown, spoken intro, or silence.",
              "Set endTimestamp to the last intentional musical sound, including natural musical reverb or decay, but excluding applause, spoken outro, credits, and post-performance silence.",
              "For THE FIRST TAKE and live-session videos, prefer the performance itself over branding, setup, dialogue, applause, or after-performance reactions.",
              "Do not copy the saved timestamps unless they match the actual musical boundary.",
              "Return JSON only with numeric startTimestamp and optional endTimestamp fields.",
              "Use whole-second precision and choose the closest timestamp you can justify from the video/audio.",
              `title: ${item.title}`,
              `channelName: ${item.channelName}`,
              `videoId: ${item.videoId}`,
              `maxDuration: ${item.maxDuration}`,
            ].join("\n"),
          },
          {
            file_data: {
              file_uri: youtubeUrl,
            },
          },
        ],
      },
    ],
  };
};

const createResponseExcerpt = (text: string) => {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  return normalized.length > 500
    ? `${normalized.slice(0, 500)}...`
    : normalized;
};

const withResponseExcerpt = (message: string, responseText: string) => {
  const excerpt = createResponseExcerpt(responseText);
  return excerpt ? `${message} Response: ${excerpt}` : message;
};

const invalidResponse = (responseText = ""): GeminiAnalyzeFailure => ({
  ok: false,
  code: GeminiAnalyzeErrorCode.InvalidResponse,
  message: withResponseExcerpt(
    "Gemini returned an unreadable response.",
    responseText,
  ),
});

const invalidTimestamps = (responseText = ""): GeminiAnalyzeFailure => ({
  ok: false,
  code: GeminiAnalyzeErrorCode.InvalidTimestamps,
  message: withResponseExcerpt(
    "Gemini returned invalid timestamps.",
    responseText,
  ),
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

const readTimestampSeconds = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value !== "string") {
    return NaN;
  }

  const normalized = value.trim();
  if (!normalized) {
    return NaN;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Math.floor(Number(normalized));
  }

  if (!/^\d+(?::[0-5]?\d){1,2}$/.test(normalized)) {
    return NaN;
  }

  const parts = normalized.split(":").map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
};

const parseGeminiBoundaryResponse = (
  payload: unknown,
  maxDuration: number,
  reportDiagnostic?: GeminiBoundaryDiagnosticLogger,
): GeminiAnalyzeSuccess | GeminiAnalyzeFailure => {
  const candidateText = readCandidateText(payload);
  const text = extractJsonText(candidateText);

  if (!text) {
    reportDiagnostic?.("missing-json", { candidateText, payload });
    return invalidResponse(candidateText);
  }

  let parsed: { startTimestamp?: unknown; endTimestamp?: unknown };

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    reportDiagnostic?.("json-parse-error", { error, text });
    return invalidResponse(text);
  }

  const startTimestamp = readTimestampSeconds(parsed.startTimestamp);
  const hasEndTimestamp =
    typeof parsed.endTimestamp !== "undefined" && parsed.endTimestamp !== null;
  const endTimestamp = hasEndTimestamp
    ? readTimestampSeconds(parsed.endTimestamp)
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
    reportDiagnostic?.("invalid-timestamps", {
      parsed,
      maxDuration,
      startTimestamp,
      endTimestamp,
    });
    return invalidTimestamps(text);
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
