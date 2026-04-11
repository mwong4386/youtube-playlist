import { type AnalyzeImportBatchState } from "../../models/PlaylistImport";

interface AnalyzeImportBannerViewModel {
  title: string;
  detail: string;
  dismissible: boolean;
}

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
      title: `Analyzing imported songs ${analyzeImportBatchState.completedCount + analyzeImportBatchState.failedCount}/${analyzeImportBatchState.totalCount}`,
      detail: analyzeImportBatchState.currentItemId
        ? `${analyzeImportBatchState.failedCount} failed so far`
        : "",
      dismissible: false,
    };
  }

  return {
    title: `Imported song analysis finished ${analyzeImportBatchState.completedCount}/${analyzeImportBatchState.totalCount} completed`,
    detail:
      analyzeImportBatchState.failedCount > 0
        ? `${analyzeImportBatchState.failedCount} songs could not be analyzed automatically.`
        : "All eligible imported songs were analyzed.",
    dismissible: true,
  };
};

export {
  getAnalyzeImportBannerViewModel,
  shouldClearAnalyzeImportBatchStateOnDismiss,
};
