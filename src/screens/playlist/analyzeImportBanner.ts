import { type AnalyzeImportBatchState } from "../../models/PlaylistImport";

interface AnalyzeImportBannerViewModel {
  title: string;
  detail: string;
  dismissible: boolean;
  actionLabel?: "Stop";
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
      title: `Analyzing song timings ${analyzeImportBatchState.completedCount + analyzeImportBatchState.failedCount}/${analyzeImportBatchState.totalCount} done`,
      detail: `${analyzeImportBatchState.completedCount} succeeded, ${analyzeImportBatchState.failedCount} failed`,
      dismissible: false,
      actionLabel: "Stop",
    };
  }

  return {
    title: "Song timing analysis finished",
    detail: `${analyzeImportBatchState.completedCount} succeeded, ${analyzeImportBatchState.failedCount} failed`,
    dismissible: true,
  };
};

export {
  getAnalyzeImportBannerViewModel,
  getAnalyzeImportBannerVisibilityKey,
  shouldClearAnalyzeImportBatchStateOnDismiss,
};
