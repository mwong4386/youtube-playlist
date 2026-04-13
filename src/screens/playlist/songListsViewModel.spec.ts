import { deepStrictEqual } from "node:assert/strict";
import test from "node:test";
import type MPlaylistItem from "../../models/MPlaylistItem";
import {
  buildSongListMenuItems,
  buildSongListSheetRows,
  getSongListCreationError,
  getSongListOptions,
  getVisiblePlaylistForActiveList,
} from "./songListsViewModel.js";

const expectDeepEqual: typeof deepStrictEqual = deepStrictEqual;

test("getSongListOptions returns selector options from two list names", () => {
  expectDeepEqual(
    getSongListOptions({
      default: { items: [] },
      aimer: { items: [] },
    }),
    ["default", "aimer"]
  );
});

test("getSongListOptions trims padded names and filters blank keys", () => {
  expectDeepEqual(
    getSongListOptions({
      "  default  ": { items: [] },
      "   ": { items: [] },
      aimer: { items: [] },
    }),
    ["default", "aimer"]
  );
});

test("getVisiblePlaylistForActiveList returns the active list when it exists", () => {
  const activeItems = [{ id: "song-2" } as MPlaylistItem];

  expectDeepEqual(
    getVisiblePlaylistForActiveList(
      {
        default: { items: [{ id: "song-1" } as MPlaylistItem] },
        aimer: { items: activeItems },
      },
      "aimer"
    ),
    activeItems
  );
});

test("getVisiblePlaylistForActiveList falls back to the default list when the active name is missing", () => {
  const defaultItems = [{ id: "song-1" } as MPlaylistItem];

  expectDeepEqual(
    getVisiblePlaylistForActiveList(
      {
        default: { items: defaultItems },
        aimer: { items: [{ id: "song-2" } as MPlaylistItem] },
      },
      "missing"
    ),
    defaultItems
  );
});

test("getVisiblePlaylistForActiveList returns an empty list when neither the active nor default list exists", () => {
  expectDeepEqual(
    getVisiblePlaylistForActiveList(
      {
        aimer: { items: [{ id: "song-2" } as MPlaylistItem] },
      },
      "missing"
    ),
    []
  );
});

test("getSongListCreationError rejects blank names after trimming", () => {
  expectDeepEqual(
    getSongListCreationError("   ", ["default"]),
    "Song list name is required."
  );
});

test("getSongListCreationError rejects duplicate names after trimming", () => {
  expectDeepEqual(
    getSongListCreationError("  aimer  ", ["default", "  aimer  "]),
    "A song list with that name already exists."
  );
});

test("getSongListCreationError returns no error for a unique name", () => {
  expectDeepEqual(
    getSongListCreationError("  future  ", ["default", "aimer"]),
    ""
  );
});

test("getSongListCreationError ignores blank and padded existing names when checking duplicates", () => {
  expectDeepEqual(
    getSongListCreationError("aimer", ["", "   ", "  aimer  "]),
    "A song list with that name already exists."
  );
});

test("buildSongListMenuItems returns a selector row for the active list", () => {
  expectDeepEqual(
    buildSongListMenuItems({
      activeSongListName: "aimer",
      songLists: {
        aimer: { items: [] },
        anisong: { items: [] },
      },
    }),
    [
      {
        id: "song-list-selector",
        kind: "song-list-selector",
        description: "aimer",
        trailingIcon: "chevron-down",
      },
    ]
  );
});

test("buildSongListSheetRows includes new-list action and edit affordances", () => {
  expectDeepEqual(
    buildSongListSheetRows({
      activeSongListName: "aimer",
      editingSongListName: null,
      songLists: {
        aimer: { items: [] },
        anisong: { items: [] },
      },
    }),
    [
      {
        id: "new-song-list",
        kind: "song-list-action",
        description: "New Song List",
        leadingIcon: "plus",
      },
      {
        id: "song-list-aimer",
        kind: "song-list-row",
        songListName: "aimer",
        description: "aimer",
        isActive: true,
        trailingIcon: "edit",
      },
      {
        id: "song-list-anisong",
        kind: "song-list-row",
        songListName: "anisong",
        description: "anisong",
        isActive: false,
        trailingIcon: "edit",
      },
    ]
  );
});

test("buildSongListSheetRows swaps one row into inline edit mode", () => {
  expectDeepEqual(
    buildSongListSheetRows({
      activeSongListName: "aimer",
      editingSongListName: "anisong",
      songLists: {
        aimer: { items: [] },
        anisong: { items: [] },
      },
    }),
    [
      {
        id: "new-song-list",
        kind: "song-list-action",
        description: "New Song List",
        leadingIcon: "plus",
      },
      {
        id: "song-list-aimer",
        kind: "song-list-row",
        songListName: "aimer",
        description: "aimer",
        isActive: true,
        trailingIcon: "edit",
      },
      {
        id: "edit-song-list-anisong",
        kind: "song-list-inline-edit",
        songListName: "anisong",
        description: "anisong",
        isActive: false,
        saveIcon: "check",
        cancelIcon: "x",
      },
    ]
  );
});
