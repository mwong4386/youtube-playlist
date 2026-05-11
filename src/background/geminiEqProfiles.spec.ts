import test from "node:test";
import {
  CREATE_EQ_PROFILE_CAPABILITY,
  type GeminiCapability,
  type GeminiCapabilityName,
  type GeminiContextScope,
  type GeminiEqProfileSuggestionFailure,
  type GeminiFunctionName,
  type GeminiSongContext,
} from "../models/GeminiActions";
import { GeminiAnalyzeErrorCode } from "../models/GeminiSettings";
import {
  buildGeminiEqProfileRequestBody,
  parseGeminiEqProfileResponse,
} from "./geminiEqProfiles";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

const validPayload = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              functionName: "createEqProfile",
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
                reason: "Adds body and presence without harsh air.",
              },
            }),
          },
        ],
      },
    },
  ],
};

test("CREATE_EQ_PROFILE_CAPABILITY exposes the approved action contract", () => {
  const capabilityName: GeminiCapabilityName = "create-eq-profile";
  const contextScope: GeminiContextScope = "eqBandContract";
  const functionName: GeminiFunctionName = "createEqProfile";
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
  const capability: GeminiCapability = CREATE_EQ_PROFILE_CAPABILITY;
  const failure: GeminiEqProfileSuggestionFailure = {
    ok: false,
    code: GeminiAnalyzeErrorCode.InvalidResponse,
    message: "Gemini did not return a usable EQ profile.",
  };

  expectEqual(capabilityName, "create-eq-profile");
  expectEqual(contextScope, "eqBandContract");
  expectEqual(functionName, "createEqProfile");
  expectEqual(songContext.videoId, "abc123");
  expectEqual(failure.ok, false);
  expectEqual(capability, {
    name: "create-eq-profile",
    allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
    allowedFunctions: ["createEqProfile"],
  });
});

test("buildGeminiEqProfileRequestBody includes only approved EQ context", () => {
  const body = buildGeminiEqProfileRequestBody({
    userRequest: "Make vocals warmer",
    existingProfiles: [
      {
        id: "metal",
        name: "Metal",
        audioEq: {
          clearBass: 6,
          band400: 3,
          band1k: -1,
          band2k5: -2,
          band6k3: 4,
          band16k: 6,
        },
      },
    ],
  });

  const text = JSON.stringify(body);
  expectEqual(text.includes("createEqProfile"), true);
  expectEqual(text.includes("askUserQuestion"), false);
  expectEqual(text.includes("eqBandContract"), true);
  expectEqual(text.includes("existingEqProfiles"), true);
  expectEqual(text.includes("allowedContext"), true);
  expectEqual(text.includes("allowedFunctions"), true);
  expectEqual(text.includes("Make vocals warmer"), true);
  expectEqual(text.includes("Metal"), true);
  expectEqual(text.includes("metal"), false);
  expectEqual(text.includes("geminiApiKey"), false);
  expectEqual(text.includes("youtube_list"), false);
});

test("buildGeminiEqProfileRequestBody includes optional current song context", () => {
  const body = buildGeminiEqProfileRequestBody({
    userRequest: "Tune this for softer treble",
    existingProfiles: [],
    songContext: {
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
    },
  });

  const text = JSON.stringify(body);
  expectEqual(text.includes("Song Title"), true);
  expectEqual(text.includes("abc123"), true);
  expectEqual(text.includes("band16k"), true);
  expectEqual(text.includes("currentSong"), true);
});

test("buildGeminiEqProfileRequestBody explains empty requests as taste-based profile suggestions", () => {
  const body = buildGeminiEqProfileRequestBody({
    userRequest: "",
    existingProfiles: [],
  });

  const text = JSON.stringify(body);
  expectEqual(text.includes("No specific user preference was provided"), true);
});

test("parseGeminiEqProfileResponse accepts a valid createEqProfile call", () => {
  expectEqual(parseGeminiEqProfileResponse(validPayload), {
    ok: true,
    suggestion: {
      name: "Warm Vocal",
      audioEq: {
        clearBass: 2,
        band400: 1,
        band1k: 3,
        band2k5: 2,
        band6k3: 1,
        band16k: -1,
      },
      reason: "Adds body and presence without harsh air.",
    },
  });
});

test("parseGeminiEqProfileResponse reads JSON wrapped in markdown fences", () => {
  expectEqual(
    parseGeminiEqProfileResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: `\`\`\`json\n${JSON.stringify({
                  functionName: "createEqProfile",
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
                })}\n\`\`\``,
              },
            ],
          },
        },
      ],
    }),
    {
      ok: true,
      suggestion: {
        name: "Warm Vocal",
        audioEq: {
          clearBass: 2,
          band400: 1,
          band1k: 3,
          band2k5: 2,
          band6k3: 1,
          band16k: -1,
        },
        reason: "",
      },
    },
  );
});

test("parseGeminiEqProfileResponse rejects wrong function names", () => {
  expectEqual(
    parseGeminiEqProfileResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  functionName: "askUserQuestion",
                  arguments: { question: "More bass?" },
                }),
              },
            ],
          },
        },
      ],
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidResponse,
      message: "Gemini did not return a usable EQ profile.",
    },
  );
});

test("parseGeminiEqProfileResponse rejects missing required bands", () => {
  expectEqual(
    parseGeminiEqProfileResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  functionName: "createEqProfile",
                  arguments: {
                    name: "Incomplete",
                    audioEq: {
                      clearBass: 2,
                      band400: 1,
                      band1k: 3,
                      band2k5: 2,
                      band6k3: 1,
                    },
                  },
                }),
              },
            ],
          },
        },
      ],
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidResponse,
      message: "Gemini did not return a usable EQ profile.",
    },
  );
});

test("parseGeminiEqProfileResponse rejects non-finite band values", () => {
  expectEqual(
    parseGeminiEqProfileResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "createEqProfile",
                  args: {
                    name: "Impossible",
                    audioEq: {
                      clearBass: Number.POSITIVE_INFINITY,
                      band400: 1,
                      band1k: 3,
                      band2k5: 2,
                      band6k3: 1,
                      band16k: Number.NaN,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.InvalidResponse,
      message: "Gemini did not return a usable EQ profile.",
    },
  );
});

test("parseGeminiEqProfileResponse clamps out-of-range bands", () => {
  expectEqual(
    parseGeminiEqProfileResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  functionName: "createEqProfile",
                  arguments: {
                    name: "Extreme",
                    audioEq: {
                      clearBass: 20,
                      band400: -20,
                      band1k: 3.4,
                      band2k5: 2,
                      band6k3: 1,
                      band16k: -1,
                    },
                  },
                }),
              },
            ],
          },
        },
      ],
    }),
    {
      ok: true,
      suggestion: {
        name: "Extreme",
        audioEq: {
          clearBass: 15,
          band400: -15,
          band1k: 3,
          band2k5: 2,
          band6k3: 1,
          band16k: -1,
        },
        reason: "",
      },
    },
  );
});
