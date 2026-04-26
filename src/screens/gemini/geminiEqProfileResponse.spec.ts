import test from "node:test";
import { GeminiAnalyzeErrorCode } from "../../models/GeminiSettings";
import { normalizeGeminiEqProfileResponse } from "./geminiEqProfileResponse";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("normalizeGeminiEqProfileResponse returns handled failure for runtime errors", () => {
  expectEqual(
    normalizeGeminiEqProfileResponse(undefined, {
      message: "The message port closed before a response was received.",
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.RequestFailed,
      message: "The message port closed before a response was received.",
    }
  );
});

test("normalizeGeminiEqProfileResponse rejects malformed successes", () => {
  const expected = {
    ok: false,
    code: GeminiAnalyzeErrorCode.RequestFailed,
    message: "Couldn't generate an EQ profile. Try again.",
  };

  expectEqual(normalizeGeminiEqProfileResponse({ ok: true }), expected);
  expectEqual(
    normalizeGeminiEqProfileResponse({
      ok: true,
      suggestion: {
        name: "Warm",
        audioEq: { clearBass: 1 },
      },
    }),
    expected
  );
});

test("normalizeGeminiEqProfileResponse preserves valid successes", () => {
  expectEqual(
    normalizeGeminiEqProfileResponse({
      ok: true,
      suggestion: {
        name: "Warm",
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
    }),
    {
      ok: true,
      suggestion: {
        name: "Warm",
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

test("normalizeGeminiEqProfileResponse preserves valid failures", () => {
  expectEqual(
    normalizeGeminiEqProfileResponse({
      ok: false,
      code: GeminiAnalyzeErrorCode.MissingApiKey,
      message: "Add a key.",
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.MissingApiKey,
      message: "Add a key.",
    }
  );
});
