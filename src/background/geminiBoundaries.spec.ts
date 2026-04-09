import test from "node:test";
import { GeminiAnalyzeErrorCode } from "../models/GeminiSettings";
import {
  buildGeminiBoundaryRequestBody,
  parseGeminiBoundaryResponse,
} from "./geminiBoundaries";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("buildGeminiBoundaryRequestBody includes video metadata and structured-output instructions", () => {
  const body = buildGeminiBoundaryRequestBody({
    title: "Song Title",
    channelName: "Artist",
    url: "https://www.youtube.com/watch?v=abc123",
    videoId: "abc123",
    maxDuration: 240,
    timestamp: 0,
    endTimestamp: undefined,
  } as never);

  const text = JSON.stringify(body);
  expectEqual(text.includes("Song Title"), true);
  expectEqual(text.includes("startTimestamp"), true);
  expectEqual(text.includes("endTimestamp"), true);
  expectEqual(text.includes("240"), true);
});

test("parseGeminiBoundaryResponse accepts valid timestamps in range", () => {
  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [{ text: '{"startTimestamp":12,"endTimestamp":96}' }],
            },
          },
        ],
      },
      180
    ),
    {
      ok: true,
      suggestion: {
        startTimestamp: 12,
        endTimestamp: 96,
      },
    }
  );
});

test("parseGeminiBoundaryResponse keeps endTimestamp undefined when Gemini says play until the end", () => {
  const result = parseGeminiBoundaryResponse(
    {
      candidates: [
        {
          content: {
            parts: [{ text: '{"startTimestamp":8}' }],
          },
        },
      ],
    },
    180
  );

  expectEqual(result, {
    ok: true,
    suggestion: {
      startTimestamp: 8,
    },
  });

  if (!result.ok) {
    throw new Error("Expected a successful Gemini boundary suggestion.");
  }

  expectEqual(Object.hasOwn(result.suggestion, "endTimestamp"), false);
});

test("parseGeminiBoundaryResponse rejects invalid timestamps", () => {
  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [{ text: '{"startTimestamp":120,"endTimestamp":60}' }],
            },
          },
        ],
      },
      180
    ),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidTimestamps,
      message: "Gemini returned invalid timestamps.",
    }
  );
});
