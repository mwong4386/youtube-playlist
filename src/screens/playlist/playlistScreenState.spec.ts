import test from "node:test";
import {
  getEffectivePlaybackItemId,
  getVisibleSelectedItemIds,
} from "./playlistScreenState.js";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("getVisibleSelectedItemIds keeps selected ids that are still visible", () => {
  expectEqual(
    getVisibleSelectedItemIds(["song-1", "song-2"], ["song-2"]),
    ["song-2"]
  );
});

test("getVisibleSelectedItemIds filters out selected ids that are no longer visible", () => {
  expectEqual(
    getVisibleSelectedItemIds(["song-1", "song-2"], ["song-2", "song-3"]),
    ["song-2"]
  );
});

test("getVisibleSelectedItemIds returns the original selected ids array when nothing changes", () => {
  const selectedItemIds = ["song-1", "song-2"];

  const visibleSelectedItemIds = getVisibleSelectedItemIds(
    ["song-1", "song-2", "song-3"],
    selectedItemIds
  );

  if (visibleSelectedItemIds !== selectedItemIds) {
    throw new Error("Expected the original selected ids array reference");
  }
});

test("getEffectivePlaybackItemId prefers the current playback id", () => {
  expectEqual(
    getEffectivePlaybackItemId("current-song", "pending-song"),
    "current-song"
  );
});

test("getEffectivePlaybackItemId falls back to the pending playback id", () => {
  expectEqual(getEffectivePlaybackItemId(undefined, "pending-song"), "pending-song");
});

test("getEffectivePlaybackItemId falls back from an empty current playback id", () => {
  expectEqual(getEffectivePlaybackItemId("", "pending-song"), "pending-song");
});

test("getEffectivePlaybackItemId returns undefined when neither id is present", () => {
  expectEqual(getEffectivePlaybackItemId(undefined, undefined), undefined);
});
