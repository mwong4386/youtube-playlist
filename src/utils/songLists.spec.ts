import test from "node:test";
import type MPlaylistItem from "../models/MPlaylistItem";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";
import {
  buildActiveSongListStorageUpdate,
  buildDefaultSongListsState,
  createSongList,
  normalizeSongListsState,
  readActiveSongListItems,
  readActiveSongListItemsFromStorageMap,
  renameSongList,
  updateActiveSongListRecord,
  updateActiveSongListItems,
  writeActiveSongListItems,
} from "./songLists";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

const expect = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createPlaylistItem = (id: string): MPlaylistItem => ({
  id,
  title: `Song ${id}`,
  channelName: `Channel ${id}`,
  url: `https://www.youtube.com/watch?v=${id}`,
  videoId: id,
  timestamp: 0,
  endTimestamp: undefined,
  maxDuration: 0,
  volume: 100,
  audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
});

test("normalizeSongListsState creates an empty default list when storage is missing", () => {
  expectEqual(normalizeSongListsState({}), buildDefaultSongListsState());
});

test("normalizeSongListsState recreates a fallback default list when storage has no lists", () => {
  expectEqual(
    normalizeSongListsState({
      songLists: {},
      activeSongListName: "missing",
    }),
    buildDefaultSongListsState()
  );
});

test("normalizeSongListsState does not recreate default when storage already has lists", () => {
  expectEqual(
    normalizeSongListsState({
      songLists: {
        renamed: { items: [] },
      },
      activeSongListName: "renamed",
    }),
    {
      songLists: {
        renamed: { items: [] },
      },
      activeSongListName: "renamed",
    }
  );
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

test("normalizeSongListsState preserves valid playlist source metadata", () => {
  const pendingItem = createPlaylistItem("new-video");

  expectEqual(
    normalizeSongListsState({
      songLists: {
        default: {
          items: [],
          playlistSources: [
            {
              url: "https://www.youtube.com/playlist?list=PL123",
              lastCheckedAt: "2026-05-02T12:00:00.000Z",
              lastSeenVideoIds: ["old-video"],
              pendingNewItems: [pendingItem],
              pendingSnapshotVideoIds: ["new-video", "old-video"],
            },
          ],
        },
      },
      activeSongListName: "default",
    }),
    {
      songLists: {
        default: {
          items: [],
          playlistSources: [
            {
              url: "https://www.youtube.com/playlist?list=PL123",
              lastCheckedAt: "2026-05-02T12:00:00.000Z",
              lastSeenVideoIds: ["old-video"],
              pendingNewItems: [pendingItem],
              pendingSnapshotVideoIds: ["new-video", "old-video"],
            },
          ],
        },
      },
      activeSongListName: "default",
    }
  );
});

test("normalizeSongListsState drops malformed playlist sources", () => {
  expectEqual(
    normalizeSongListsState({
      songLists: {
        default: {
          items: [],
          playlistSources: [
            { url: "", lastSeenVideoIds: ["old-video"] },
            {
              url: "https://www.youtube.com/playlist?list=PL123",
              lastSeenVideoIds: ["old-video", 42],
            },
            {
              url: "https://www.youtube.com/playlist?list=PL456",
              lastSeenVideoIds: ["safe-video"],
            },
          ],
        },
      },
      activeSongListName: "default",
    }),
    {
      songLists: {
        default: {
          items: [],
          playlistSources: [
            {
              url: "https://www.youtube.com/playlist?list=PL456",
              lastSeenVideoIds: ["safe-video"],
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

test("createSongList rejects reserved key names like __proto__", () => {
  let error = "";

  try {
    createSongList(buildDefaultSongListsState(), "__proto__");
  } catch (value) {
    error = value instanceof Error ? value.message : String(value);
  }

  expectEqual(error, "That song list name is reserved.");
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

test("renameSongList trims the new name, preserves the record, and updates the active list", () => {
  const record = { items: [createPlaylistItem("aimer-song")] };
  const state = {
    songLists: {
      default: { items: [] },
      aimer: record,
    },
    activeSongListName: "aimer",
  };

  const nextState = renameSongList(state, "aimer", "  renaud  ");

  expectEqual(nextState, {
    songLists: {
      default: { items: [] },
      renaud: record,
    },
    activeSongListName: "renaud",
  });
  expect(nextState.songLists.renaud === record, "Expected rename to preserve the record.");
  expect(
    !Object.prototype.hasOwnProperty.call(nextState.songLists, "aimer"),
    "Expected the old list name to be removed."
  );
});

test("renameSongList rejects blank names", () => {
  let error = "";

  try {
    renameSongList(buildDefaultSongListsState(), "default", "   ");
  } catch (value) {
    error = value instanceof Error ? value.message : String(value);
  }

  expectEqual(error, "Song list name is required.");
});

test("renameSongList rejects duplicate names", () => {
  let error = "";

  try {
    renameSongList(
      {
        songLists: {
          default: { items: [] },
          aimer: { items: [] },
        },
        activeSongListName: "default",
      },
      "default",
      "aimer"
    );
  } catch (value) {
    error = value instanceof Error ? value.message : String(value);
  }

  expectEqual(error, "A song list with that name already exists.");
});

test("renameSongList preserves the existing order when renaming a list", () => {
  const nextState = renameSongList(
    {
      songLists: {
        first: { items: [] },
        middle: { items: [] },
        last: { items: [] },
      },
      activeSongListName: "middle",
    },
    "middle",
    "renamed"
  );

  expectEqual(Object.keys(nextState.songLists), ["first", "renamed", "last"]);
});

test("renameSongList allows a trimmed no-op rename for the current name", () => {
  const state = {
    songLists: {
      default: { items: [] },
      aimer: { items: [] },
    },
    activeSongListName: "aimer",
  };

  expectEqual(renameSongList(state, "aimer", "  aimer  "), state);
});

test("renameSongList rejects reserved names like __proto__", () => {
  let error = "";

  try {
    renameSongList(buildDefaultSongListsState(), "default", "__proto__");
  } catch (value) {
    error = value instanceof Error ? value.message : String(value);
  }

  expectEqual(error, "That song list name is reserved.");
});

test("updateActiveSongListItems only replaces the active list items", () => {
  const nextItems = [{ id: "three" } as MPlaylistItem];
  const playlistSources = [
    {
      url: "https://www.youtube.com/playlist?list=PL123",
      lastSeenVideoIds: ["two"],
    },
  ];

  expectEqual(
    updateActiveSongListItems(
      {
        songLists: {
          default: { items: [{ id: "one" } as MPlaylistItem] },
          aimer: {
            items: [{ id: "two" } as MPlaylistItem],
            playlistSources,
          },
        },
        activeSongListName: "aimer",
      },
      nextItems
    ),
    {
      songLists: {
        default: { items: [{ id: "one" } as MPlaylistItem] },
        aimer: { items: nextItems, playlistSources },
      },
      activeSongListName: "aimer",
    }
  );
});

test("updateActiveSongListRecord updates items and preserves source metadata", () => {
  const state = {
    songLists: {
      default: {
        items: [createPlaylistItem("old")],
        playlistSources: [
          {
            url: "https://www.youtube.com/playlist?list=PL123",
            lastSeenVideoIds: ["old"],
          },
        ],
      },
    },
    activeSongListName: "default",
  };

  expectEqual(
    updateActiveSongListRecord(state, (record) => ({
      ...record,
      items: [...record.items, createPlaylistItem("new")],
    })),
    {
      songLists: {
        default: {
          items: [createPlaylistItem("old"), createPlaylistItem("new")],
          playlistSources: [
            {
              url: "https://www.youtube.com/playlist?list=PL123",
              lastSeenVideoIds: ["old"],
            },
          ],
        },
      },
      activeSongListName: "default",
    }
  );
});

test("readActiveSongListItemsFromStorageMap returns the active named song list items", () => {
  const defaultItem = createPlaylistItem("default-song");
  const aimerItem = createPlaylistItem("aimer-song");

  expectEqual(
    readActiveSongListItemsFromStorageMap({
      songLists: {
        default: { items: [defaultItem] },
        aimer: { items: [aimerItem] },
      },
      activeSongListName: "aimer",
    }),
    [aimerItem]
  );
});

test("buildActiveSongListStorageUpdate only replaces the active named song list items", () => {
  const defaultItem = createPlaylistItem("default-song");
  const aimerItem = createPlaylistItem("aimer-song");
  const newItem = createPlaylistItem("new-song");
  const playlistSources = [
    {
      url: "https://www.youtube.com/playlist?list=PL123",
      lastSeenVideoIds: [aimerItem.videoId],
    },
  ];

  expectEqual(
    buildActiveSongListStorageUpdate(
      {
        songLists: {
          default: { items: [defaultItem] },
          aimer: { items: [aimerItem], playlistSources },
        },
        activeSongListName: "aimer",
      },
      [newItem]
    ),
    {
      songLists: {
        default: { items: [defaultItem] },
        aimer: { items: [newItem], playlistSources },
      },
    }
  );
});

test("buildActiveSongListStorageUpdate seeds the default song list when storage is missing", () => {
  const newItem = createPlaylistItem("new-song");

  expectEqual(buildActiveSongListStorageUpdate({}, [newItem]), {
    songLists: {
      default: { items: [newItem] },
    },
  });
});

test("normalizeSongListsState does not let __proto__ mutate the returned songLists prototype", () => {
  const protoItem = createPlaylistItem("proto-song");
  const storedSongLists = Object.create(null) as Record<string, unknown>;

  storedSongLists.default = { items: [] };
  storedSongLists["__proto__"] = { items: [protoItem] };

  const state = normalizeSongListsState({
    songLists: storedSongLists,
    activeSongListName: "default",
  });

  expect(
    Object.getPrototypeOf(state.songLists) === null,
    "Expected songLists to keep a null prototype."
  );
  expectEqual(state.songLists.default.items, []);
  expectEqual(state.songLists["__proto__"]?.items, [protoItem]);
});

test("buildActiveSongListStorageUpdate does not let __proto__ mutate the persisted songLists prototype", () => {
  const protoItem = createPlaylistItem("proto-song");
  const replacementItem = createPlaylistItem("replacement-song");
  const storedSongLists = Object.create(null) as Record<string, unknown>;

  storedSongLists.default = { items: [createPlaylistItem("default-song")] };
  storedSongLists["__proto__"] = { items: [protoItem] };

  const nextStorage = buildActiveSongListStorageUpdate(
    {
      songLists: storedSongLists,
      activeSongListName: "default",
    },
    [replacementItem]
  );
  const nextSongLists = nextStorage.songLists as Record<string, { items: MPlaylistItem[] }>;

  expect(
    Object.getPrototypeOf(nextSongLists) === null,
    "Expected persisted songLists to keep a null prototype."
  );
  expectEqual(nextSongLists.default.items, [replacementItem]);
  expectEqual(nextSongLists["__proto__"]?.items, [protoItem]);
});

test("readActiveSongListItems reads from storage maps using the shared storage model", async () => {
  const aimerItem = createPlaylistItem("aimer-song");
  let requestedKeys: string[] = [];

  const items = await readActiveSongListItems(async (keys: string[]) => {
    requestedKeys = keys;
    return {
      songLists: {
        default: { items: [] },
        aimer: { items: [aimerItem] },
      },
      activeSongListName: "aimer",
    };
  });

  expectEqual(requestedKeys, ["songLists", "activeSongListName"]);
  expectEqual(items, [aimerItem]);
});

test("writeActiveSongListItems updates the active named song list without rewriting activeSongListName", async () => {
  const defaultItem = createPlaylistItem("default-song");
  const aimerItem = createPlaylistItem("aimer-song");
  const replacementItem = createPlaylistItem("replacement-song");
  const playlistSources = [
    {
      url: "https://www.youtube.com/playlist?list=PL123",
      lastSeenVideoIds: [aimerItem.videoId],
    },
  ];
  const writes: Record<string, unknown>[] = [];

  await writeActiveSongListItems(
    [replacementItem],
    async () => ({
      songLists: {
        default: { items: [defaultItem] },
        aimer: { items: [aimerItem], playlistSources },
      },
      activeSongListName: "aimer",
    }),
    async (items: Record<string, unknown>) => {
      writes.push(items);
    }
  );

  expectEqual(writes, [
    {
      songLists: {
        default: { items: [defaultItem] },
        aimer: { items: [replacementItem], playlistSources },
      },
    },
  ]);
  expect(
    !Object.prototype.hasOwnProperty.call(writes[0] ?? {}, "activeSongListName"),
    "Expected writes to avoid persisting activeSongListName."
  );
});
