import test from "node:test";
import { GeminiAnalyzeErrorCode } from "../../models/GeminiSettings";
import { normalizeAnalyzeSongBoundariesResponse } from "./geminiAnalyzeResponse";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("normalizeAnalyzeSongBoundariesResponse returns a handled failure for runtime errors", () => {
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse(undefined, {
      message: "The message port closed before a response was received.",
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.RequestFailed,
      message: "The message port closed before a response was received.",
    }
  );
});

test("normalizeAnalyzeSongBoundariesResponse returns a handled failure for missing responses", () => {
  expectEqual(normalizeAnalyzeSongBoundariesResponse(undefined), {
    ok: false,
    code: GeminiAnalyzeErrorCode.RequestFailed,
    message: "Couldn't analyze song boundaries. Try again.",
  });
});

test("normalizeAnalyzeSongBoundariesResponse returns a handled failure for empty callback payloads", () => {
  expectEqual(normalizeAnalyzeSongBoundariesResponse({}), {
    ok: false,
    code: GeminiAnalyzeErrorCode.RequestFailed,
    message: "Couldn't analyze song boundaries. Try again.",
  });
});

test("normalizeAnalyzeSongBoundariesResponse rejects malformed typed-looking success payloads", () => {
  const expected = {
    ok: false,
    code: GeminiAnalyzeErrorCode.RequestFailed,
    message: "Couldn't analyze song boundaries. Try again.",
  };

  expectEqual(normalizeAnalyzeSongBoundariesResponse({ ok: true }), expected);
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: true,
      suggestion: {},
    }),
    expected
  );
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: true,
      suggestion: {
        startTimestamp: "12",
      },
    }),
    expected
  );
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: true,
      suggestion: {
        startTimestamp: 12,
        endTimestamp: "96",
      },
    }),
    expected
  );
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: true,
      suggestion: {
        startTimestamp: NaN,
      },
    }),
    expected
  );
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: true,
      suggestion: {
        startTimestamp: Infinity,
      },
    }),
    expected
  );
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: true,
      suggestion: {
        startTimestamp: -1,
      },
    }),
    expected
  );
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: true,
      suggestion: {
        startTimestamp: 12,
        endTimestamp: -5,
      },
    }),
    expected
  );
});

test("normalizeAnalyzeSongBoundariesResponse rejects malformed typed-looking failure payloads", () => {
  const expected = {
    ok: false,
    code: GeminiAnalyzeErrorCode.RequestFailed,
    message: "Couldn't analyze song boundaries. Try again.",
  };

  expectEqual(normalizeAnalyzeSongBoundariesResponse({ ok: false }), expected);
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: false,
      code: "x",
    }),
    expected
  );
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: false,
      message: "no code",
    }),
    expected
  );
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: false,
      code: "x",
      message: 123,
    }),
    expected
  );
});

test("normalizeAnalyzeSongBoundariesResponse preserves successful responses", () => {
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: true,
      suggestion: {
        startTimestamp: 12,
      },
    }),
    {
      ok: true,
      suggestion: {
        startTimestamp: 12,
      },
    }
  );
});

test("normalizeAnalyzeSongBoundariesResponse preserves failure responses", () => {
  expectEqual(
    normalizeAnalyzeSongBoundariesResponse({
      ok: false,
      code: GeminiAnalyzeErrorCode.ItemNotFound,
      message: "Song not found.",
    }),
    {
      ok: false,
      code: GeminiAnalyzeErrorCode.ItemNotFound,
      message: "Song not found.",
    }
  );
});
