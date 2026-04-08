import test from "node:test";
import { getVideoIdFromWatchUrl, shouldShowSavedBadge } from "./actionBadge";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("getVideoIdFromWatchUrl reads video ids from youtube watch pages", () => {
  expectEqual(
    getVideoIdFromWatchUrl("https://www.youtube.com/watch?v=abc123&t=90"),
    "abc123"
  );
});

test("getVideoIdFromWatchUrl ignores non-watch and invalid urls", () => {
  expectEqual(getVideoIdFromWatchUrl("https://www.youtube.com/results?search_query=test"), null);
  expectEqual(getVideoIdFromWatchUrl("notaurl"), null);
  expectEqual(getVideoIdFromWatchUrl("https://example.com/watch?v=abc123"), null);
});

test("shouldShowSavedBadge is true when the current page video is saved", () => {
  expectEqual(
    shouldShowSavedBadge("https://www.youtube.com/watch?v=saved-video", [
      { videoId: "saved-video" } as never,
    ]),
    true
  );
});

test("shouldShowSavedBadge is false when the current page video is not saved", () => {
  expectEqual(
    shouldShowSavedBadge("https://www.youtube.com/watch?v=other-video", [
      { videoId: "saved-video" } as never,
    ]),
    false
  );
});
