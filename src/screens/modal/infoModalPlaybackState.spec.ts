import test from "node:test";
import {
  shouldShowInfoModalTransport,
} from "./infoModalPlaybackState.js";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

test("current playback item shows transport", () => {
  const playbackContext = {
    currentPlaybackItemId: "song-1",
    itemId: "song-1",
  };

  expectEqual(shouldShowInfoModalTransport(playbackContext), true);
});

test("non-playing item hides transport", () => {
  const playbackContext = {
    currentPlaybackItemId: "song-2",
    itemId: "song-1",
  };

  expectEqual(shouldShowInfoModalTransport(playbackContext), false);
});

test("missing playback context hides transport", () => {
  const playbackContext = {
    currentPlaybackItemId: undefined,
    itemId: "song-1",
  };

  expectEqual(shouldShowInfoModalTransport(playbackContext), false);
});
