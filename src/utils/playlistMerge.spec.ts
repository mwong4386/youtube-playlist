import test from "node:test";
import MPlaylistItem from "../models/MPlaylistItem";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";
import { mergeImportedPlaylist } from "./playlistMerge";

const createPlaylistItem = (
  videoId: string,
  overrides: Partial<MPlaylistItem> = {}
): MPlaylistItem => ({
  id: `${videoId}-id`,
  title: `Song ${videoId}`,
  channelName: `Channel ${videoId}`,
  url: `https://www.youtube.com/watch?v=${videoId}`,
  videoId,
  timestamp: 0,
  endTimestamp: undefined,
  maxDuration: 0,
  volume: 100,
  audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
  ...overrides,
});

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("mergeImportedPlaylist replaces the saved playlist with imported items", () => {
  const existing = [createPlaylistItem("existing-1"), createPlaylistItem("existing-2")];
  const imported = [createPlaylistItem("imported-1"), createPlaylistItem("imported-2")];

  expectEqual(mergeImportedPlaylist(existing, imported, "replace"), {
    playlist: imported,
    importedCount: 2,
    skippedDuplicates: 0,
  });
});

test("mergeImportedPlaylist appends imported items after existing ones", () => {
  const existing = [createPlaylistItem("existing-1")];
  const imported = [createPlaylistItem("imported-1"), createPlaylistItem("imported-2")];

  expectEqual(mergeImportedPlaylist(existing, imported, "append"), {
    playlist: [...existing, ...imported],
    importedCount: 2,
    skippedDuplicates: 0,
  });
});

test("mergeImportedPlaylist skips imported duplicates by videoId when appending", () => {
  const existing = [createPlaylistItem("shared-video"), createPlaylistItem("existing-2")];
  const imported = [
    createPlaylistItem("shared-video", { id: "shared-video-imported" }),
    createPlaylistItem("new-video"),
  ];

  expectEqual(mergeImportedPlaylist(existing, imported, "append"), {
    playlist: [...existing, imported[1]],
    importedCount: 1,
    skippedDuplicates: 1,
  });
});

test("mergeImportedPlaylist dedupes repeated videoIds inside the imported batch when appending", () => {
  const existing = [createPlaylistItem("existing-1")];
  const imported = [
    createPlaylistItem("repeat-video", { id: "repeat-video-first" }),
    createPlaylistItem("repeat-video", { id: "repeat-video-second" }),
    createPlaylistItem("new-video"),
  ];

  expectEqual(mergeImportedPlaylist(existing, imported, "append"), {
    playlist: [existing[0], imported[0], imported[2]],
    importedCount: 2,
    skippedDuplicates: 1,
  });
});
