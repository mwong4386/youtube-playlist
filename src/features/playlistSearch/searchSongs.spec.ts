import test from "node:test";
import type MPlaylistItem from "../../models/MPlaylistItem";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../../models/AudioEq";
import { searchSongs } from "./searchSongs";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

const makeSong = (
  id: string,
  title: string,
  channelName: string,
): MPlaylistItem => ({
  id,
  title,
  channelName,
  url: `https://www.youtube.com/watch?v=${id}`,
  videoId: id,
  timestamp: 0,
  endTimestamp: undefined,
  maxDuration: 180,
  volume: 100,
  audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
});

const state = {
  songLists: {
    Main: {
      items: [
        makeSong("song-1", "Digital Love", "Daft Punk"),
        makeSong("song-2", "Midnight City", "M83"),
      ],
    },
    Chill: {
      items: [
        makeSong("song-3", "Veridis Quo", "Daft Punk"),
        makeSong("song-4", "Intro", "The xx"),
      ],
    },
  },
  activeSongListName: "Main",
};

test("searchSongs searches active playlist by default", () => {
  const result = searchSongs(state, { query: "daft" });

  expectEqual(result, {
    ok: true,
    query: "daft",
    scope: { type: "active", playlistName: "Main" },
    totalMatches: 1,
    results: [
      {
        songId: "song-1",
        playlistName: "Main",
        title: "Digital Love",
        channelName: "Daft Punk",
        videoId: "song-1",
        url: "https://www.youtube.com/watch?v=song-1",
        timestamp: 0,
        endTimestamp: undefined,
        maxDuration: 180,
        volume: 100,
      },
    ],
  });
});

test("searchSongs searches a named playlist", () => {
  const result = searchSongs(state, { playlistName: "Chill", query: "daft" });

  expectEqual(result.ok, true);
  if (!result.ok) {
    return;
  }
  expectEqual(result.scope, { type: "playlist", playlistName: "Chill" });
  expectEqual(result.results.map((song: any) => song.songId), ["song-3"]);
});

test("searchSongs can search all playlists", () => {
  const result = searchSongs(state, {
    includeAllPlaylists: true,
    playlistName: "Main",
    query: "daft",
  });

  expectEqual(result.ok, true);
  if (!result.ok) {
    return;
  }
  expectEqual(result.scope, { type: "all" });
  expectEqual(
    result.results.map((song: any) => `${song.playlistName}:${song.songId}`),
    ["Main:song-1", "Chill:song-3"],
  );
});

test("searchSongs matches title and channel name case-insensitively", () => {
  const titleResult = searchSongs(state, { query: "midnight" });
  const channelResult = searchSongs(state, { query: "M83" });

  if (!titleResult.ok || !channelResult.ok) {
    throw new Error("Expected successful search results.");
  }

  expectEqual(titleResult.results.map((song: any) => song.songId), ["song-2"]);
  expectEqual(channelResult.results.map((song: any) => song.songId), [
    "song-2",
  ]);
});

test("searchSongs returns scoped songs for an empty query", () => {
  const result = searchSongs(state, { query: "  ", playlistName: "Chill" });

  expectEqual(result.ok, true);
  if (!result.ok) {
    return;
  }
  expectEqual(result.query, "");
  expectEqual(result.totalMatches, 2);
  expectEqual(result.results.map((song: any) => song.songId), [
    "song-3",
    "song-4",
  ]);
});

test("searchSongs clamps limit to the maximum result count", () => {
  const manySongState = {
    songLists: {
      Main: {
        items: Array.from({ length: 60 }, (_, index) =>
          makeSong(`song-${index}`, `Song ${index}`, "Channel"),
        ),
      },
    },
    activeSongListName: "Main",
  };

  const result = searchSongs(manySongState, { limit: 999 });

  expectEqual(result.ok, true);
  if (!result.ok) {
    return;
  }
  expectEqual(result.totalMatches, 60);
  expectEqual(result.results.length, 50);
});

test("searchSongs returns a failure for a missing named playlist", () => {
  const result = searchSongs(state, { playlistName: "Missing" });

  expectEqual(result, {
    ok: false,
    message: 'Playlist "Missing" not found.',
  });
});
