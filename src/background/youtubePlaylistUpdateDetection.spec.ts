import test from "node:test";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";
import type MPlaylistItem from "../models/MPlaylistItem";
import type { SongListsState } from "../models/SongList";
import { refreshActivePlaylistSource } from "./youtubePlaylistUpdateDetection";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

const item = (id: string): MPlaylistItem => ({
  id,
  title: `Song ${id}`,
  channelName: "Channel",
  url: `https://www.youtube.com/watch?v=${id}`,
  videoId: id,
  timestamp: 0,
  endTimestamp: undefined,
  maxDuration: 0,
  volume: 100,
  audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
});

test("refreshActivePlaylistSource writes pending items for due active source", async () => {
  const state: SongListsState = {
    activeSongListName: "default",
    songLists: {
      default: {
        items: [item("old")],
        playlistSources: [
          {
            url: "https://www.youtube.com/playlist?list=PL123",
            lastCheckedAt: "2026-05-01T12:00:00.000Z",
            lastSeenVideoIds: ["old"],
          },
        ],
      },
    },
  };
  let written: SongListsState | undefined;

  const response = await refreshActivePlaylistSource({
    now: new Date("2026-05-03T12:00:00.000Z"),
    readSongListsState: async () => state,
    writeSongListsState: async (nextState) => {
      written = nextState;
    },
    resolvePlaylist: async () => [item("new"), item("old")],
  });

  expectEqual(response, { ok: true, checked: true, newItemCount: 1 });
  expectEqual(written?.songLists.default.playlistSources?.[0].pendingNewItems, [
    item("new"),
  ]);
});

test("refreshActivePlaylistSource skips fresh active source", async () => {
  let didResolve = false;

  const response = await refreshActivePlaylistSource({
    now: new Date("2026-05-03T12:00:00.000Z"),
    readSongListsState: async () => ({
      activeSongListName: "default",
      songLists: {
        default: {
          items: [],
          playlistSources: [
            {
              url: "https://www.youtube.com/playlist?list=PL123",
              lastCheckedAt: "2026-05-03T11:00:00.000Z",
              lastSeenVideoIds: [],
            },
          ],
        },
      },
    }),
    writeSongListsState: async () => {
      throw new Error("should not write");
    },
    resolvePlaylist: async () => {
      didResolve = true;
      return [];
    },
  });

  expectEqual(response, { ok: true, checked: false, newItemCount: 0 });
  expectEqual(didResolve, false);
});

test("refreshActivePlaylistSource can force a fresh active source check", async () => {
  let didResolve = false;

  const response = await refreshActivePlaylistSource({
    force: true,
    now: new Date("2026-05-03T12:00:00.000Z"),
    readSongListsState: async () => ({
      activeSongListName: "default",
      songLists: {
        default: {
          items: [],
          playlistSources: [
            {
              url: "https://www.youtube.com/playlist?list=PL123",
              lastCheckedAt: "2026-05-03T11:00:00.000Z",
              lastSeenVideoIds: [],
            },
          ],
        },
      },
    }),
    writeSongListsState: async () => {},
    resolvePlaylist: async () => {
      didResolve = true;
      return [];
    },
  });

  expectEqual(response, { ok: true, checked: true, newItemCount: 0 });
  expectEqual(didResolve, true);
});

test("refreshActivePlaylistSource aggregates results from multiple sources", async () => {
  const state: SongListsState = {
    activeSongListName: "default",
    songLists: {
      default: {
        items: [item("old")],
        playlistSources: [
          {
            url: "https://www.youtube.com/playlist?list=PL1",
            lastCheckedAt: "2026-05-01T12:00:00.000Z",
            lastSeenVideoIds: ["old"],
          },
          {
            url: "https://www.youtube.com/playlist?list=PL2",
            lastCheckedAt: "2026-05-01T12:00:00.000Z",
            lastSeenVideoIds: ["old"],
          },
        ],
      },
    },
  };
  let written: SongListsState | undefined;

  const response = await refreshActivePlaylistSource({
    now: new Date("2026-05-03T12:00:00.000Z"),
    readSongListsState: async () => state,
    writeSongListsState: async (nextState) => {
      written = nextState;
    },
    resolvePlaylist: async (url) => {
      if (url.includes("PL1")) {
        return [item("new1"), item("old")];
      }
      if (url.includes("PL2")) {
        return [item("new2"), item("old")];
      }
      return [];
    },
  });

  expectEqual(response, { ok: true, checked: true, newItemCount: 2 });
  expectEqual(written?.songLists.default.playlistSources?.[0].pendingNewItems, [
    item("new1"),
  ]);
  expectEqual(written?.songLists.default.playlistSources?.[1].pendingNewItems, [
    item("new2"),
  ]);
});
