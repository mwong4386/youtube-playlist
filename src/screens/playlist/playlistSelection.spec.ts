import test from "node:test";
import {
  clearSelectedItemIds,
  filterPlaylistBySelectedIds,
  getPlaylistHeaderMode,
  toggleSelectedItemId,
} from "./playlistSelection.js";
import type MPlaylistItem from "../../models/MPlaylistItem";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("toggleSelectedItemId adds and removes ids without mutating order", () => {
  expectEqual(toggleSelectedItemId([], "song-1"), ["song-1"]);
  expectEqual(toggleSelectedItemId(["song-1"], "song-1"), []);
  expectEqual(toggleSelectedItemId(["song-1"], "song-2"), ["song-1", "song-2"]);
});

test("clearSelectedItemIds always returns an empty list", () => {
  expectEqual(clearSelectedItemIds(["song-1", "song-2"]), []);
});

test("filterPlaylistBySelectedIds removes only selected songs", () => {
  const playlist = [
    { id: "song-1" } as MPlaylistItem,
    { id: "song-2" } as MPlaylistItem,
    { id: "song-3" } as MPlaylistItem,
  ];
  expectEqual(
    filterPlaylistBySelectedIds(playlist, [playlist[1].id]).map((item) => item.id),
    [playlist[0].id, playlist[2].id]
  );
});

test("getPlaylistHeaderMode returns selection when at least one item is selected", () => {
  expectEqual(getPlaylistHeaderMode(["song-1"]), "selection");
  expectEqual(getPlaylistHeaderMode([]), "default");
});
