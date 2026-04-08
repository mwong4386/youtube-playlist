import test from "node:test";
import { sanitizeYoutubeVideoTitle } from "./bookmarkDialogViewModel";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("sanitizeYoutubeVideoTitle removes leading notification count and youtube suffix", () => {
  expectEqual(
    sanitizeYoutubeVideoTitle("(2) Amazing Track - YouTube"),
    "Amazing Track"
  );
});

test("sanitizeYoutubeVideoTitle keeps titles that do not match the youtube suffix pattern", () => {
  expectEqual(sanitizeYoutubeVideoTitle("Live Mix Session"), "Live Mix Session");
});

test("sanitizeYoutubeVideoTitle trims extra whitespace", () => {
  expectEqual(sanitizeYoutubeVideoTitle("  Song Title - youtube  "), "Song Title");
});
