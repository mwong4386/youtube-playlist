import test from "node:test";
import { GeminiAnalyzeErrorCode } from "../../models/GeminiSettings";
import { normalizeGeminiSongEqResponse } from "./geminiSongEqResponse";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("normalizeGeminiSongEqResponse returns handled failure for runtime errors", () => {
  expectEqual(
    normalizeGeminiSongEqResponse(undefined, "song-1", {
      message: "The message port closed before a response was received.",
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.RequestFailed,
      message: "The message port closed before a response was received.",
    }
  );
});

test("normalizeGeminiSongEqResponse rejects malformed successes", () => {
  const expected = {
    ok: false,
    code: GeminiAnalyzeErrorCode.RequestFailed,
    message: "Couldn't adjust song EQ. Try again.",
  };

  expectEqual(
    normalizeGeminiSongEqResponse({ ok: true }, "song-1"),
    expected
  );
  expectEqual(
    normalizeGeminiSongEqResponse(
      {
        ok: true,
        suggestion: {
          songId: "song-1",
          audioEq: { clearBass: 1 },
        },
      },
      "song-1"
    ),
    expected
  );
});

test("normalizeGeminiSongEqResponse rejects song id mismatches", () => {
  expectEqual(
    normalizeGeminiSongEqResponse(
      {
        ok: true,
        suggestion: {
          songId: "other-song",
          audioEq: {
            clearBass: 1,
            band400: 1,
            band1k: 2,
            band2k5: 2,
            band6k3: 0,
            band16k: -1,
          },
          reason: "Warmer vocal profile.",
        },
      },
      "song-1"
    ),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.RequestFailed,
      message: "Couldn't adjust song EQ. Try again.",
    }
  );
});

test("normalizeGeminiSongEqResponse preserves valid successes", () => {
  expectEqual(
    normalizeGeminiSongEqResponse(
      {
        ok: true,
        suggestion: {
          songId: "song-1",
          audioEq: {
            clearBass: 1,
            band400: 1,
            band1k: 2,
            band2k5: 2,
            band6k3: 0,
            band16k: -1,
          },
          reason: "Warmer vocal profile.",
        },
      },
      "song-1"
    ),
    {
      ok: true,
      suggestion: {
        songId: "song-1",
        audioEq: {
          clearBass: 1,
          band400: 1,
          band1k: 2,
          band2k5: 2,
          band6k3: 0,
          band16k: -1,
        },
        reason: "Warmer vocal profile.",
      },
    }
  );
});

test("normalizeGeminiSongEqResponse accepts native Gemini function calls", () => {
  expectEqual(
    normalizeGeminiSongEqResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "adjustSongEq",
                    args: {
                      audioEq: {
                        band1k: 3,
                        band400: 2,
                        band6k3: 2,
                        band2k5: 3,
                        clearBass: 2,
                        band16k: 1,
                      },
                      reason:
                        "The boosts were moderated to reduce harshness.",
                      songId: "song-1",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      "song-1"
    ),
    {
      ok: true,
      suggestion: {
        songId: "song-1",
        audioEq: {
          clearBass: 2,
          band400: 2,
          band1k: 3,
          band2k5: 3,
          band6k3: 2,
          band16k: 1,
        },
        reason: "The boosts were moderated to reduce harshness.",
      },
    }
  );
});

test("normalizeGeminiSongEqResponse preserves valid failures", () => {
  expectEqual(
    normalizeGeminiSongEqResponse(
      {
        ok: false,
        code: GeminiAnalyzeErrorCode.MissingApiKey,
        message: "Add a key.",
      },
      "song-1"
    ),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.MissingApiKey,
      message: "Add a key.",
    }
  );
});
