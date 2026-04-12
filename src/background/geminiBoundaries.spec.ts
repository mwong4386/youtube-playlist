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
  expectEqual(text.includes('"file_uri":"https://www.youtube.com/watch?v=abc123"'), true);
  expectEqual(text.includes("startTimestamp"), true);
  expectEqual(text.includes("endTimestamp"), true);
  expectEqual(text.includes("240"), true);
});

test("buildGeminiBoundaryRequestBody sends a normalized YouTube URL as video input after the prompt", () => {
  const body = buildGeminiBoundaryRequestBody({
    title: "Song Title",
    channelName: "Artist",
    url: "https://www.youtube.com/watch?v=abc123&t=42s&list=playlist-id",
    videoId: "abc123",
    maxDuration: 240,
    timestamp: 0,
    endTimestamp: undefined,
  } as never) as any;

  expectEqual(typeof body.contents[0].parts[0].text, "string");
  expectEqual(body.contents[0].parts[1], {
    file_data: {
      file_uri: "https://www.youtube.com/watch?v=abc123",
    },
  });
});

test("buildGeminiBoundaryRequestBody asks for tight musical performance boundaries", () => {
  const body = buildGeminiBoundaryRequestBody({
    title: "Song Title / THE FIRST TAKE",
    channelName: "Artist",
    url: "https://www.youtube.com/watch?v=abc123",
    videoId: "abc123",
    maxDuration: 240,
    timestamp: 0,
    endTimestamp: undefined,
  } as never);

  const text = JSON.stringify(body);
  expectEqual(text.includes("first intentional musical sound"), true);
  expectEqual(text.includes("not the video intro"), true);
  expectEqual(text.includes("spoken intro"), true);
  expectEqual(text.includes("applause"), true);
  expectEqual(text.includes("last intentional musical sound"), true);
  expectEqual(text.includes("post-performance silence"), true);
});

test("buildGeminiBoundaryRequestBody avoids anchoring Gemini to existing saved timestamps", () => {
  const body = buildGeminiBoundaryRequestBody({
    title: "Song Title",
    channelName: "Artist",
    url: "https://www.youtube.com/watch?v=abc123",
    videoId: "abc123",
    maxDuration: 240,
    timestamp: 42,
    endTimestamp: 120,
  } as never);

  const text = JSON.stringify(body);
  expectEqual(text.includes("savedStartTimestamp"), false);
  expectEqual(text.includes("savedEndTimestamp"), false);
  expectEqual(text.includes("42"), false);
  expectEqual(text.includes("120"), false);
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

test("parseGeminiBoundaryResponse reads JSON wrapped in markdown code fences", () => {
  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '```json\n{"startTimestamp":12,"endTimestamp":96}\n```',
                },
              ],
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

test("parseGeminiBoundaryResponse reads JSON split across multiple parts", () => {
  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                { text: '{"startTimestamp":' },
                { text: "12," },
                { text: '"endTimestamp":96}' },
              ],
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

test("parseGeminiBoundaryResponse reads JSON surrounded by prose", () => {
  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Best guess:\n{"startTimestamp":12,"endTimestamp":96}\nUse these values.',
                },
              ],
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

test("parseGeminiBoundaryResponse accepts timestamp strings and null until-end values", () => {
  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [{ text: '{"startTimestamp":"0:34","endTimestamp":null}' }],
            },
          },
        ],
      },
      180
    ),
    {
      ok: true,
      suggestion: {
        startTimestamp: 34,
      },
    }
  );

  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [{ text: '{"startTimestamp":"34","endTimestamp":"2:10"}' }],
            },
          },
        ],
      },
      180
    ),
    {
      ok: true,
      suggestion: {
        startTimestamp: 34,
        endTimestamp: 130,
      },
    }
  );
});

test("parseGeminiBoundaryResponse normalizes compact numeric clock values when plain seconds are out of range", () => {
  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [{ text: '{"startTimestamp":46,"endTimestamp":500}' }],
            },
          },
        ],
      },
      301
    ),
    {
      ok: true,
      suggestion: {
        startTimestamp: 46,
        endTimestamp: 300,
      },
    }
  );
});

test("parseGeminiBoundaryResponse returns InvalidResponse for unreadable payloads", () => {
  expectEqual(parseGeminiBoundaryResponse({ candidates: [] }, 180), {
    ok: false,
    code: GeminiAnalyzeErrorCode.InvalidResponse,
    message: "Gemini returned an unreadable response.",
  });
});

test("parseGeminiBoundaryResponse reports why payload parsing failed", () => {
  const diagnostics: unknown[] = [];

  const result = parseGeminiBoundaryResponse(
    {
      candidates: [
        {
          content: {
            parts: [{ text: "I cannot determine the song boundaries." }],
          },
        },
      ],
    },
    180,
    (reason: unknown) => {
      diagnostics.push(reason);
    }
  );

  expectEqual(result, {
    ok: false,
    code: GeminiAnalyzeErrorCode.InvalidResponse,
    message:
      "Gemini returned an unreadable response. Response: I cannot determine the song boundaries.",
  });
  expectEqual(diagnostics, ["missing-json"]);
});

test("parseGeminiBoundaryResponse rejects invalid timestamp values", () => {
  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [{ text: '{"startTimestamp":"twelve","endTimestamp":96}' }],
            },
          },
        ],
      },
      180
    ),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidTimestamps,
      message:
        'Gemini returned invalid timestamps. Response: {"startTimestamp":"twelve","endTimestamp":96}',
    }
  );

  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [{ text: '{"startTimestamp":12,"endTimestamp":true}' }],
            },
          },
        ],
      },
      180
    ),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidTimestamps,
      message:
        'Gemini returned invalid timestamps. Response: {"startTimestamp":12,"endTimestamp":true}',
    }
  );

  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [{ text: '{"startTimestamp":null,"endTimestamp":96}' }],
            },
          },
        ],
      },
      180
    ),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidTimestamps,
      message:
        'Gemini returned invalid timestamps. Response: {"startTimestamp":null,"endTimestamp":96}',
    }
  );
});

test("parseGeminiBoundaryResponse includes response text when timestamps are invalid", () => {
  expectEqual(
    parseGeminiBoundaryResponse(
      {
        candidates: [
          {
            content: {
              parts: [{ text: '{"startTimestamp":"twelve","endTimestamp":96}' }],
            },
          },
        ],
      },
      180
    ),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidTimestamps,
      message:
        'Gemini returned invalid timestamps. Response: {"startTimestamp":"twelve","endTimestamp":96}',
    }
  );
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
      message:
        'Gemini returned invalid timestamps. Response: {"startTimestamp":120,"endTimestamp":60}',
    }
  );
});
