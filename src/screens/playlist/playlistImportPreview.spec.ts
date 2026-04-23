import { deepStrictEqual as expectDeepEqual } from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../../models/AudioEq";
import type MPlaylistItem from "../../models/MPlaylistItem";
import {
  commitPlaylistImportPreview,
  createPlaylistImportPreview,
} from "./playlistImportPreview";

const createPlaylistItem = (
  videoId: string,
  overrides: Partial<MPlaylistItem> = {},
): MPlaylistItem => ({
  id: videoId,
  title: `Song ${videoId}`,
  channelName: "Channel",
  url: `https://www.youtube.com/watch?v=${videoId}`,
  videoId,
  timestamp: 0,
  endTimestamp: undefined,
  maxDuration: 180,
  volume: 100,
  audioEq: DEFAULT_AUDIO_EQ_SETTINGS,
  ...overrides,
});

test("createPlaylistImportPreview filters duplicates in append mode and selects all candidates", () => {
  const existing = [createPlaylistItem("saved")];
  const imported = [
    createPlaylistItem("saved", { id: "duplicate" }),
    createPlaylistItem("new-a"),
    createPlaylistItem("new-b"),
  ];

  expectDeepEqual(createPlaylistImportPreview(existing, imported, "append"), {
    items: [imported[1], imported[2]],
    selectedItemIds: ["new-a", "new-b"],
    skippedDuplicates: 1,
  });
});

test("createPlaylistImportPreview keeps all imported items in replace mode", () => {
  const existing = [createPlaylistItem("saved")];
  const imported = [
    createPlaylistItem("saved", { id: "replacement-saved" }),
    createPlaylistItem("new-a"),
  ];

  expectDeepEqual(createPlaylistImportPreview(existing, imported, "replace"), {
    items: imported,
    selectedItemIds: ["replacement-saved", "new-a"],
    skippedDuplicates: 0,
  });
});

test("commitPlaylistImportPreview appends only selected preview items", () => {
  const existing = [createPlaylistItem("saved")];
  const imported = [createPlaylistItem("new-a"), createPlaylistItem("new-b")];

  expectDeepEqual(
    commitPlaylistImportPreview(existing, imported, ["new-b"], "append"),
    [existing[0], imported[1]],
  );
});

test("commitPlaylistImportPreview replaces with only selected preview items", () => {
  const existing = [createPlaylistItem("saved")];
  const imported = [createPlaylistItem("new-a"), createPlaylistItem("new-b")];

  expectDeepEqual(
    commitPlaylistImportPreview(existing, imported, ["new-b"], "replace"),
    [imported[1]],
  );
});
