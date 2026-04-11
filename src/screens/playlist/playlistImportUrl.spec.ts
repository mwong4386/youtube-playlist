import test from "node:test";
import {
  isYoutubePlaylistUrl,
  normalizeYoutubePlaylistUrl,
} from "../../background/youtubePlaylistImport";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("isYoutubePlaylistUrl accepts a watch url with a playlist id", () => {
  expectEqual(
    isYoutubePlaylistUrl(
      "https://www.youtube.com/watch?v=abc123&list=PL123"
    ),
    true
  );
});

test("isYoutubePlaylistUrl accepts a playlist url with a playlist id", () => {
  expectEqual(
    isYoutubePlaylistUrl("https://www.youtube.com/playlist?list=PL123"),
    true
  );
});

test("normalizeYoutubePlaylistUrl strips unrelated params", () => {
  expectEqual(
    normalizeYoutubePlaylistUrl(
      "https://www.youtube.com/watch?v=abc123&list=PL123&t=42s&foo=bar"
    ),
    "https://www.youtube.com/playlist?list=PL123"
  );
});

test("normalizeYoutubePlaylistUrl rejects urls without a playlist id", () => {
  let error: unknown;

  try {
    normalizeYoutubePlaylistUrl("https://www.youtube.com/watch?v=abc123");
  } catch (caught) {
    error = caught;
  }

  expectEqual(error instanceof Error, true);
  expectEqual((error as Error).message, "Invalid YouTube playlist URL.");
});

test("isYoutubePlaylistUrl rejects urls without a playlist id", () => {
  expectEqual(
    isYoutubePlaylistUrl("https://www.youtube.com/watch?v=abc123"),
    false
  );
});
