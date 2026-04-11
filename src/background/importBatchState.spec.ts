import test from "node:test";
import type { AnalyzeImportBatchState } from "../models/PlaylistImport";
import {
  beginAnalyzeImportBatch,
  completeAnalyzeImportBatchItem,
  failAnalyzeImportBatchItem,
} from "./importBatchState";

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
