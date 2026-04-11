import test from "node:test";
import type { AnalyzeImportBatchState } from "../models/PlaylistImport";
import type MPlaylistItem from "../models/MPlaylistItem";
import {
  beginAnalyzeImportBatch,
  completeAnalyzeImportBatchItem,
  failAnalyzeImportBatchItem,
  resolveAnalyzeImportBatchItemIds,
} from "./importBatchState.js";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("beginAnalyzeImportBatch creates an active serializable state", () => {
  const expected: AnalyzeImportBatchState = {
    active: true,
    totalCount: 2,
    completedCount: 0,
    failedCount: 0,
    pendingItemIds: ["song-1", "song-2"],
    completedItemIds: [],
    failedItemIds: [],
    currentItemId: "song-1",
  };

  expectEqual(beginAnalyzeImportBatch(["song-1", "song-2"]), expected);
});

test("completeAnalyzeImportBatchItem advances progress and the current item", () => {
  const started = beginAnalyzeImportBatch(["song-1", "song-2"]);

  const expected: AnalyzeImportBatchState = {
    active: true,
    totalCount: 2,
    completedCount: 1,
    failedCount: 0,
    pendingItemIds: ["song-2"],
    completedItemIds: ["song-1"],
    failedItemIds: [],
    currentItemId: "song-2",
  };

  expectEqual(completeAnalyzeImportBatchItem(started, "song-1"), expected);
});

test("failAnalyzeImportBatchItem records failures and finishes the batch when exhausted", () => {
  const started = beginAnalyzeImportBatch(["song-1"]);

  const expected: AnalyzeImportBatchState = {
    active: false,
    totalCount: 1,
    completedCount: 0,
    failedCount: 1,
    pendingItemIds: [],
    completedItemIds: [],
    failedItemIds: ["song-1"],
  };

  expectEqual(failAnalyzeImportBatchItem(started, "song-1"), expected);
});

test("resolveAnalyzeImportBatchItemIds keeps explicit selected ids in playlist order", () => {
  const playlist = [
    { id: "song-1", timestamp: 15 } as MPlaylistItem,
    { id: "song-2", timestamp: 0 } as MPlaylistItem,
    { id: "song-3", timestamp: 42 } as MPlaylistItem,
  ];

  expectEqual(
    resolveAnalyzeImportBatchItemIds(playlist, ["song-3", "song-1", "song-9"]),
    ["song-1", "song-3"]
  );
});

test("resolveAnalyzeImportBatchItemIds falls back to unresolved songs when no explicit ids are provided", () => {
  const playlist = [
    { id: "song-1", timestamp: 0 } as MPlaylistItem,
    { id: "song-2", timestamp: 12, endTimestamp: 60 } as MPlaylistItem,
    { id: "song-3", timestamp: 0 } as MPlaylistItem,
    { id: "song-4", timestamp: 12 } as MPlaylistItem,
  ];

  expectEqual(resolveAnalyzeImportBatchItemIds(playlist), ["song-1", "song-3"]);
});

test("resolveAnalyzeImportBatchItemIds returns no songs for an explicit empty selection", () => {
  const playlist = [
    { id: "song-1", timestamp: 0 } as MPlaylistItem,
    { id: "song-2", timestamp: 24 } as MPlaylistItem,
  ];

  expectEqual(resolveAnalyzeImportBatchItemIds(playlist, []), []);
});
