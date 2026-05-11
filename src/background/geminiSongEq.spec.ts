import test from "node:test";
import {
  ADJUST_SONG_EQ_CAPABILITY,
  type GeminiAdjustSongEqFunctionCall,
  type GeminiCapability,
  type GeminiCapabilityName,
  type GeminiCreateEqProfileFunctionCall,
  type GeminiContextScope,
  type GeminiFunctionName,
  type GeminiSongContext,
  type GeminiSongEqResponse,
  type GeminiSongEqSuccess,
  type GeminiSongEqSuggestion,
  type GeminiSongEqSuggestionFailure,
  type GeminiSongEqUserRequest,
} from "../models/GeminiActions";
import { GeminiAnalyzeErrorCode } from "../models/GeminiSettings";
import {
  buildGeminiSongEqRequestBody,
  parseGeminiSongEqResponse,
} from "./geminiSongEq";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

test("ADJUST_SONG_EQ_CAPABILITY exposes the approved action contract", () => {
  const capabilityName: GeminiCapabilityName = "adjust-song-eq";
  const contextScope: GeminiContextScope = "existingEqProfiles";
  const functionName: GeminiFunctionName = "adjustSongEq";
  const songContext: GeminiSongContext = {
    id: "song-1",
    title: "Song Title",
    channelName: "Artist",
    videoId: "abc123",
    url: "https://www.youtube.com/watch?v=abc123",
    audioEq: {
      clearBass: 0,
      band400: 0,
      band1k: 0,
      band2k5: 0,
      band6k3: 3,
      band16k: 4,
    },
  };
  const capability: GeminiCapability = ADJUST_SONG_EQ_CAPABILITY;
  const userRequest: GeminiSongEqUserRequest = {
    userRequest: "Make this song brighter without adding harshness.",
    existingProfiles: [
      {
        id: "bright",
        name: "Bright",
        audioEq: {
          clearBass: 0,
          band400: -1,
          band1k: 1,
          band2k5: 2,
          band6k3: 3,
          band16k: 2,
        },
      },
    ],
    songContext,
  };
  const functionCall: GeminiAdjustSongEqFunctionCall = {
    functionName: "adjustSongEq",
    arguments: {
      songId: "song-1",
      audioEq: {
        clearBass: 0,
        band400: 0,
        band1k: 1,
        band2k5: 2,
        band6k3: 2,
        band16k: 3,
      },
      reason: "Adds air while keeping the upper mids controlled.",
    },
  };
  const suggestion: GeminiSongEqSuggestion = {
    songId: "song-1",
    audioEq: functionCall.arguments.audioEq,
    reason: "Adds air while keeping the upper mids controlled.",
  };
  const success: GeminiSongEqSuccess = {
    ok: true,
    suggestion,
  };
  const response: GeminiSongEqResponse = success;
  const failure: GeminiSongEqSuggestionFailure = {
    ok: false,
    code: GeminiAnalyzeErrorCode.InvalidResponse,
    message: "Gemini did not return a usable song EQ adjustment.",
  };
  const failureResponse: GeminiSongEqResponse = failure;

  expectEqual(capabilityName, "adjust-song-eq");
  expectEqual(contextScope, "existingEqProfiles");
  expectEqual(functionName, "adjustSongEq");
  expectEqual(songContext.id, "song-1");
  expectEqual(userRequest.songContext.id, "song-1");
  expectEqual(functionCall.functionName, "adjustSongEq");
  expectEqual(suggestion.songId, "song-1");
  expectEqual(success.ok, true);
  expectEqual(response.ok, true);
  expectEqual(failure.ok, false);
  expectEqual(failureResponse.ok, false);
  expectEqual(capability, {
    name: "adjust-song-eq",
    allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
    allowedFunctions: ["adjustSongEq"],
  });
});

const invalidCreateEqProfileCall: GeminiCreateEqProfileFunctionCall = {
  // @ts-expect-error create-profile calls must use the createEqProfile function.
  functionName: "adjustSongEq",
  arguments: {
    name: "Warm Vocal",
    audioEq: {
      clearBass: 2,
      band400: 1,
      band1k: 3,
      band2k5: 2,
      band6k3: 1,
      band16k: -1,
    },
  },
};

const invalidAdjustSongEqCall: GeminiAdjustSongEqFunctionCall = {
  // @ts-expect-error song EQ calls must use the adjustSongEq function.
  functionName: "createEqProfile",
  arguments: {
    songId: "song-1",
    audioEq: {
      clearBass: 0,
      band400: 0,
      band1k: 1,
      band2k5: 2,
      band6k3: 2,
      band16k: 3,
    },
  },
};

void invalidCreateEqProfileCall;
void invalidAdjustSongEqCall;

const invalidSongEqResponse = {
  ok: false,
  code: GeminiAnalyzeErrorCode.InvalidResponse,
  message: "Gemini did not return a usable song EQ adjustment.",
};

test("buildGeminiSongEqRequestBody includes only approved song EQ context", () => {
  const body = buildGeminiSongEqRequestBody({
    userRequest: "Make this less harsh",
    existingProfiles: [
      {
        id: "profile-1",
        name: "Warm Vocal",
        audioEq: {
          clearBass: 4,
          band400: 2,
          band1k: 1,
          band2k5: 0,
          band6k3: -1,
          band16k: -2,
        },
      },
    ],
    songContext: {
      id: "song-1",
      title: "Bright Song",
      channelName: "Artist",
      videoId: "abc123",
      url: "https://www.youtube.com/watch?v=abc123",
      audioEq: {
        clearBass: 0,
        band400: 0,
        band1k: 0,
        band2k5: 0,
        band6k3: 12,
        band16k: -12,
      },
    },
  });

  const text = JSON.stringify(body);
  expectEqual(text.includes("adjustSongEq"), true);
  expectEqual(text.includes("createEqProfile"), false);
  expectEqual(text.includes("askUserQuestion"), false);
  expectEqual(text.includes("eqBandContract"), true);
  expectEqual(text.includes("existingEqProfiles"), true);
  expectEqual(text.includes("currentSong"), true);
  expectEqual(text.includes("Make this less harsh"), true);
  expectEqual(text.includes("Bright Song"), true);
  expectEqual(text.includes("Warm Vocal"), true);
  expectEqual(text.includes("profile-1"), false);
  expectEqual(text.includes("geminiApiKey"), false);
  expectEqual(text.includes("youtube_list"), false);
});

test("buildGeminiSongEqRequestBody explains empty requests as song-context EQ suggestions", () => {
  const body = buildGeminiSongEqRequestBody({
    userRequest: "",
    existingProfiles: [],
    songContext: {
      id: "song-1",
      title: "Song One",
      channelName: "Artist",
      videoId: "abc123",
      url: "https://www.youtube.com/watch?v=abc123",
      audioEq: {
        clearBass: 0,
        band400: 0,
        band1k: 0,
        band2k5: 0,
        band6k3: 0,
        band16k: 0,
      },
    },
  });

  const text = JSON.stringify(body);
  expectEqual(text.includes("No specific user preference was provided"), true);
  expectEqual(text.includes("infer a tasteful EQ from currentSong"), true);
  expectEqual(text.includes("Song One"), true);
});

test("parseGeminiSongEqResponse accepts valid JSON text", () => {
  expectEqual(
    parseGeminiSongEqResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    functionName: "adjustSongEq",
                    arguments: {
                      songId: "song-1",
                      audioEq: {
                        clearBass: 1,
                        band400: 0,
                        band1k: -1,
                        band2k5: -2,
                        band6k3: -3,
                        band16k: -4,
                      },
                      reason: "Tames the bright top end.",
                    },
                  }),
                },
              ],
            },
          },
        ],
      },
      "song-1",
    ),
    {
      ok: true,
      suggestion: {
        songId: "song-1",
        audioEq: {
          clearBass: 1,
          band400: 0,
          band1k: -1,
          band2k5: -2,
          band6k3: -3,
          band16k: -4,
        },
        reason: "Tames the bright top end.",
      },
    },
  );
});

test("parseGeminiSongEqResponse accepts native Gemini function calls", () => {
  expectEqual(
    parseGeminiSongEqResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "adjustSongEq",
                    args: {
                      songId: "song-1",
                      audioEq: {
                        clearBass: 1,
                        band400: 0,
                        band1k: -1,
                        band2k5: -2,
                        band6k3: -3,
                        band16k: -4,
                      },
                      reason: "Tames the bright top end.",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      "song-1",
    ),
    {
      ok: true,
      suggestion: {
        songId: "song-1",
        audioEq: {
          clearBass: 1,
          band400: 0,
          band1k: -1,
          band2k5: -2,
          band6k3: -3,
          band16k: -4,
        },
        reason: "Tames the bright top end.",
      },
    },
  );
});

test("parseGeminiSongEqResponse reads markdown-fenced JSON", () => {
  expectEqual(
    parseGeminiSongEqResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: `\`\`\`json\n${JSON.stringify({
                    functionName: "adjustSongEq",
                    arguments: {
                      songId: "song-1",
                      audioEq: {
                        clearBass: 1,
                        band400: 0,
                        band1k: -1,
                        band2k5: -2,
                        band6k3: -3,
                        band16k: -4,
                      },
                    },
                  })}\n\`\`\``,
                },
              ],
            },
          },
        ],
      },
      "song-1",
    ),
    {
      ok: true,
      suggestion: {
        songId: "song-1",
        audioEq: {
          clearBass: 1,
          band400: 0,
          band1k: -1,
          band2k5: -2,
          band6k3: -3,
          band16k: -4,
        },
        reason: "",
      },
    },
  );
});

test("parseGeminiSongEqResponse rejects non-finite band values", () => {
  expectEqual(
    parseGeminiSongEqResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "adjustSongEq",
                    args: {
                      songId: "song-1",
                      audioEq: {
                        clearBass: Number.POSITIVE_INFINITY,
                        band400: 0,
                        band1k: -1,
                        band2k5: -2,
                        band6k3: -3,
                        band16k: Number.NaN,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      "song-1",
    ),
    invalidSongEqResponse,
  );
});

test("parseGeminiSongEqResponse clamps and rounds band values", () => {
  expectEqual(
    parseGeminiSongEqResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    functionName: "adjustSongEq",
                    arguments: {
                      songId: "song-1",
                      audioEq: {
                        clearBass: 15,
                        band400: -12,
                        band1k: 1.6,
                        band2k5: -1.4,
                        band6k3: 0.49,
                        band16k: 9.5,
                      },
                    },
                  }),
                },
              ],
            },
          },
        ],
      },
      "song-1",
    ),
    {
      ok: true,
      suggestion: {
        songId: "song-1",
        audioEq: {
          clearBass: 15,
          band400: -12,
          band1k: 2,
          band2k5: -1,
          band6k3: 0,
          band16k: 10,
        },
        reason: "",
      },
    },
  );
});

test("parseGeminiSongEqResponse rejects wrong function names", () => {
  expectEqual(
    parseGeminiSongEqResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    functionName: "createEqProfile",
                    arguments: {
                      songId: "song-1",
                      audioEq: {
                        clearBass: 1,
                        band400: 0,
                        band1k: -1,
                        band2k5: -2,
                        band6k3: -3,
                        band16k: -4,
                      },
                    },
                  }),
                },
              ],
            },
          },
        ],
      },
      "song-1",
    ),
    invalidSongEqResponse,
  );
});

test("parseGeminiSongEqResponse rejects mismatched song ids", () => {
  expectEqual(
    parseGeminiSongEqResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    functionName: "adjustSongEq",
                    arguments: {
                      songId: "other-song",
                      audioEq: {
                        clearBass: 1,
                        band400: 0,
                        band1k: -1,
                        band2k5: -2,
                        band6k3: -3,
                        band16k: -4,
                      },
                    },
                  }),
                },
              ],
            },
          },
        ],
      },
      "song-1",
    ),
    invalidSongEqResponse,
  );
});

test("parseGeminiSongEqResponse rejects missing required bands", () => {
  expectEqual(
    parseGeminiSongEqResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    functionName: "adjustSongEq",
                    arguments: {
                      songId: "song-1",
                      audioEq: {
                        clearBass: 1,
                        band400: 0,
                        band1k: -1,
                        band2k5: -2,
                        band6k3: -3,
                      },
                    },
                  }),
                },
              ],
            },
          },
        ],
      },
      "song-1",
    ),
    invalidSongEqResponse,
  );
});
