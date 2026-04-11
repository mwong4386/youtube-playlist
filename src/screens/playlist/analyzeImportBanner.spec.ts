import test from "node:test";
import {
  getAnalyzeImportBannerViewModel,
  getAnalyzeImportBannerVisibilityKey,
  shouldClearAnalyzeImportBatchStateOnDismiss,
} from "./analyzeImportBanner.js";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("getAnalyzeImportBannerViewModel hides the banner without batch state", () => {
  expectEqual(getAnalyzeImportBannerViewModel(null), null);
});

test("getAnalyzeImportBannerViewModel returns a dismissible progress banner while analysis is active", () => {
  expectEqual(
    getAnalyzeImportBannerViewModel({
      active: true,
      totalCount: 3,
      completedCount: 1,
      failedCount: 1,
      pendingItemIds: ["song-3"],
      completedItemIds: ["song-1"],
      failedItemIds: ["song-2"],
      currentItemId: "song-3",
    }),
    {
      title: "Analyzing song timings 2/3",
      detail: "1 failed so far",
      dismissible: true,
    }
  );
});

test("getAnalyzeImportBannerVisibilityKey returns a stable key for the current batch snapshot", () => {
  expectEqual(
    getAnalyzeImportBannerVisibilityKey({
      active: true,
      totalCount: 3,
      completedCount: 1,
      failedCount: 1,
      pendingItemIds: ["song-3"],
      completedItemIds: ["song-1"],
      failedItemIds: ["song-2"],
      currentItemId: "song-3",
    }),
    "active:3:1:1:song-3:song-3:song-1:song-2"
  );
});

test("getAnalyzeImportBannerVisibilityKey returns null without visible batch progress", () => {
  expectEqual(getAnalyzeImportBannerVisibilityKey(null), null);
  expectEqual(
    getAnalyzeImportBannerVisibilityKey({
      active: false,
      totalCount: 0,
      completedCount: 0,
      failedCount: 0,
      pendingItemIds: [],
      completedItemIds: [],
      failedItemIds: [],
    }),
    null
  );
});

test("getAnalyzeImportBannerViewModel returns a dismissible completion banner when analysis finishes with failures", () => {
  expectEqual(
    getAnalyzeImportBannerViewModel({
      active: false,
      totalCount: 3,
      completedCount: 1,
      failedCount: 2,
      pendingItemIds: [],
      completedItemIds: ["song-1"],
      failedItemIds: ["song-2", "song-3"],
    }),
    {
      title: "Song timing analysis finished 1/3 completed",
      detail: "2 songs could not be analyzed automatically.",
      dismissible: true,
    }
  );
});

test("getAnalyzeImportBannerViewModel returns the generalized success detail without failures", () => {
  expectEqual(
    getAnalyzeImportBannerViewModel({
      active: false,
      totalCount: 2,
      completedCount: 2,
      failedCount: 0,
      pendingItemIds: [],
      completedItemIds: ["song-1", "song-2"],
      failedItemIds: [],
    }),
    {
      title: "Song timing analysis finished 2/2 completed",
      detail: "All eligible songs were analyzed.",
      dismissible: true,
    }
  );
});

test("shouldClearAnalyzeImportBatchStateOnDismiss is false for active analysis", () => {
  expectEqual(
    shouldClearAnalyzeImportBatchStateOnDismiss({
      active: true,
      totalCount: 2,
      completedCount: 1,
      failedCount: 0,
      pendingItemIds: ["song-2"],
      completedItemIds: ["song-1"],
      failedItemIds: [],
      currentItemId: "song-2",
    }),
    false
  );
});

test("shouldClearAnalyzeImportBatchStateOnDismiss is true for finished analysis", () => {
  expectEqual(
    shouldClearAnalyzeImportBatchStateOnDismiss({
      active: false,
      totalCount: 2,
      completedCount: 1,
      failedCount: 1,
      pendingItemIds: [],
      completedItemIds: ["song-1"],
      failedItemIds: ["song-2"],
    }),
    true
  );
});
