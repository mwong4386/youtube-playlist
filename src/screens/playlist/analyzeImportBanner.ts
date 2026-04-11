import { type AnalyzeImportBatchState } from "../../models/PlaylistImport";

interface AnalyzeImportBannerViewModel {
  title: string;
  detail: string;
  dismissible: boolean;
}

const getAnalyzeImportBannerVisibilityKey = (
  analyzeImportBatchState: AnalyzeImportBatchState | null
): string | null => {
  if (!analyzeImportBatchState || analyzeImportBatchState.totalCount <= 0) {
    return null;
  }

  return [
    analyzeImportBatchState.active ? "active" : "complete",
    analyzeImportBatchState.totalCount,
    analyzeImportBatchState.completedCount,
    analyzeImportBatchState.failedCount,
    analyzeImportBatchState.currentItemId || "",
    analyzeImportBatchState.pendingItemIds.join(","),
    analyzeImportBatchState.completedItemIds.join(","),
    analyzeImportBatchState.failedItemIds.join(","),
  ].join(":");
};

const shouldClearAnalyzeImportBatchStateOnDismiss = (
  analyzeImportBatchState: AnalyzeImportBatchState | null
): boolean => {
  return !!analyzeImportBatchState && !analyzeImportBatchState.active;
};

const getAnalyzeImportBannerViewModel = (
  analyzeImportBatchState: AnalyzeImportBatchState | null
): AnalyzeImportBannerViewModel | null => {
  if (!analyzeImportBatchState || analyzeImportBatchState.totalCount <= 0) {
    return null;
  }

  if (analyzeImportBatchState.active) {
    return {
      title: `Analyzing song timings ${analyzeImportBatchState.completedCount + analyzeImportBatchState.failedCount}/${analyzeImportBatchState.totalCount}`,
      detail: analyzeImportBatchState.currentItemId
        ? `${analyzeImportBatchState.failedCount} failed so far`
        : "",
      dismissible: true,
    };
  }

  return {
    title: `Song timing analysis finished ${analyzeImportBatchState.completedCount}/${analyzeImportBatchState.totalCount} completed`,
    detail:
      analyzeImportBatchState.failedCount > 0
        ? `${analyzeImportBatchState.failedCount} songs could not be analyzed automatically.`
        : "All eligible songs were analyzed.",
    dismissible: true,
  };
};

export {
  getAnalyzeImportBannerViewModel,
  getAnalyzeImportBannerVisibilityKey,
  shouldClearAnalyzeImportBatchStateOnDismiss,
};
