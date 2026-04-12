import test from "node:test";
import type MPlaylistItem from "../models/MPlaylistItem";
import {
  buildDefaultSongListsState,
  createSongList,
  normalizeSongListsState,
  updateActiveSongListItems,
} from "./songLists";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("normalizeSongListsState creates an empty default list when storage is missing", () => {
  expectEqual(normalizeSongListsState({}), buildDefaultSongListsState());
});

test("normalizeSongListsState falls back to default when the active list name is invalid", () => {
  expectEqual(
    normalizeSongListsState({
      songLists: {
        default: { items: [] },
        aimer: { items: [] },
      },
      activeSongListName: "missing",
    }),
    {
      songLists: {
        default: { items: [] },
        aimer: { items: [] },
      },
      activeSongListName: "default",
    }
  );
});

test("normalizeSongListsState drops malformed stored items instead of preserving them", () => {
  expectEqual(
    normalizeSongListsState({
      songLists: {
        default: {
          items: [
            {
              id: "song-1",
              title: "Song 1",
              channelName: "Channel",
              url: "https://youtube.com/watch?v=song-1",
              videoId: "song-1",
              timestamp: 12,
              endTimestamp: 24,
              maxDuration: 60,
              volume: 50,
              audioEq: {
                clearBass: 0,
                band400: 0,
                band1k: 0,
                band2k5: 0,
                band6k3: 0,
                band16k: 0,
              },
            },
            { title: "Missing id" },
          ],
        },
      },
    }),
    {
      songLists: {
        default: {
          items: [
            {
              id: "song-1",
              title: "Song 1",
              channelName: "Channel",
              url: "https://youtube.com/watch?v=song-1",
              videoId: "song-1",
              timestamp: 12,
              endTimestamp: 24,
              maxDuration: 60,
              volume: 50,
              audioEq: {
                clearBass: 0,
                band400: 0,
                band1k: 0,
                band2k5: 0,
                band6k3: 0,
                band16k: 0,
              },
            },
          ],
        },
      },
      activeSongListName: "default",
    }
  );
});

test("normalizeSongListsState keeps valid stored items with an undefined end timestamp", () => {
  expectEqual(
    normalizeSongListsState({
      songLists: {
        default: {
          items: [
            {
              id: "song-1",
              title: "Song 1",
              channelName: "Channel",
              url: "https://youtube.com/watch?v=song-1",
              videoId: "song-1",
              timestamp: 12,
              endTimestamp: undefined,
              maxDuration: 60,
              volume: 50,
              audioEq: {
                clearBass: 0,
                band400: 0,
                band1k: 0,
                band2k5: 0,
                band6k3: 0,
                band16k: 0,
              },
            },
          ],
        },
      },
    }),
    {
      songLists: {
        default: {
          items: [
            {
              id: "song-1",
              title: "Song 1",
              channelName: "Channel",
              url: "https://youtube.com/watch?v=song-1",
              videoId: "song-1",
              timestamp: 12,
              endTimestamp: undefined,
              maxDuration: 60,
              volume: 50,
              audioEq: {
                clearBass: 0,
                band400: 0,
                band1k: 0,
                band2k5: 0,
                band6k3: 0,
                band16k: 0,
              },
            },
          ],
        },
      },
      activeSongListName: "default",
    }
  );
});

test("normalizeSongListsState ignores prototype properties when validating the active list", () => {
  expectEqual(
    normalizeSongListsState({
      songLists: {
        default: { items: [] },
      },
      activeSongListName: "constructor",
    }),
    {
      songLists: {
        default: { items: [] },
      },
      activeSongListName: "default",
    }
  );
});

test("createSongList trims the name, adds an empty list, and switches active list", () => {
  expectEqual(
    createSongList(buildDefaultSongListsState(), "  aimer  "),
    {
      songLists: {
        default: { items: [] },
        aimer: { items: [] },
      },
      activeSongListName: "aimer",
    }
  );
});

test("createSongList allows prototype-property names like constructor", () => {
  expectEqual(
    createSongList(buildDefaultSongListsState(), "constructor"),
    {
      songLists: {
        default: { items: [] },
        constructor: { items: [] },
      },
      activeSongListName: "constructor",
    }
  );
});

test("createSongList rejects duplicate names", () => {
  let error = "";

  try {
    createSongList(
      {
        songLists: {
          default: { items: [] },
          aimer: { items: [] },
        },
        activeSongListName: "default",
      },
      "aimer"
    );
  } catch (value) {
    error = value instanceof Error ? value.message : String(value);
  }

  expectEqual(error, "A song list with that name already exists.");
});

test("updateActiveSongListItems only replaces the active list items", () => {
  const nextItems = [{ id: "three" } as MPlaylistItem];

  expectEqual(
    updateActiveSongListItems(
      {
        songLists: {
          default: { items: [{ id: "one" } as MPlaylistItem] },
          aimer: { items: [{ id: "two" } as MPlaylistItem] },
        },
        activeSongListName: "aimer",
      },
      nextItems
    ),
    {
      songLists: {
        default: { items: [{ id: "one" } as MPlaylistItem] },
        aimer: { items: nextItems },
      },
      activeSongListName: "aimer",
    }
  );
});
