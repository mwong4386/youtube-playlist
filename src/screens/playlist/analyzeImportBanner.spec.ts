import test from "node:test";
import {
  getAnalyzeImportBannerViewModel,
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

test("getAnalyzeImportBannerViewModel returns a non-dismissible progress banner while analysis is active", () => {
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
      title: "Analyzing imported songs 2/3",
      detail: "1 failed so far",
      dismissible: false,
    }
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
      title: "Imported song analysis finished 1/3 completed",
      detail: "2 songs could not be analyzed automatically.",
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
