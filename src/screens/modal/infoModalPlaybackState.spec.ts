import test from "node:test";
import {
  getInfoModalPresentation,
  shouldShowInfoModalTransport,
} from "./infoModalPlaybackState.js";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

type InfoModalPlaybackContext = {
  currentPlaybackItemId?: string | null;
  itemId?: string | null;
};

test("current playback item opens collapsed and shows transport", () => {
  const playbackContext = {
    currentPlaybackItemId: "song-1",
    itemId: "song-1",
  };

  const presentation = getInfoModalPresentation(playbackContext);

  expectEqual(presentation, "collapsed");
  expectEqual(shouldShowInfoModalTransport(playbackContext), true);
});

test("non-playing item opens expanded and hides transport", () => {
  const playbackContext = {
    currentPlaybackItemId: "song-2",
    itemId: "song-1",
  };

  const presentation = getInfoModalPresentation(playbackContext);

  expectEqual(presentation, "expanded");
  expectEqual(shouldShowInfoModalTransport(playbackContext), false);
});

test("missing playback context falls back to editor-only expanded mode", () => {
  const playbackContext = {
    currentPlaybackItemId: undefined,
    itemId: "song-1",
  };

  const presentation = getInfoModalPresentation(playbackContext);

  expectEqual(presentation, "expanded");
  expectEqual(shouldShowInfoModalTransport(playbackContext), false);
});
