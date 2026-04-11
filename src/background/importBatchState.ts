import {
  ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  type AnalyzeImportBatchState,
} from "../models/PlaylistImport";

const beginAnalyzeImportBatch = (
  itemIds: string[],
): AnalyzeImportBatchState => {
  const pendingItemIds = [...itemIds];

  return {
    active: pendingItemIds.length > 0,
    totalCount: pendingItemIds.length,
    completedCount: 0,
    failedCount: 0,
    pendingItemIds,
    completedItemIds: [],
    failedItemIds: [],
    currentItemId: pendingItemIds[0],
  };
};

const updateAnalyzeImportBatchState = (
  state: AnalyzeImportBatchState,
  itemId: string,
  resultKey: "completedItemIds" | "failedItemIds",
): AnalyzeImportBatchState => {
  if (!state.pendingItemIds.includes(itemId)) {
    return state;
  }

  const pendingItemIds = state.pendingItemIds.filter(
    (pendingItemId) => pendingItemId !== itemId,
  );
  const completedItemIds =
    resultKey === "completedItemIds"
      ? [...state.completedItemIds, itemId]
      : state.completedItemIds;
  const failedItemIds =
    resultKey === "failedItemIds"
      ? [...state.failedItemIds, itemId]
      : state.failedItemIds;

  return {
    active: pendingItemIds.length > 0,
    totalCount: state.totalCount,
    completedCount: completedItemIds.length,
    failedCount: failedItemIds.length,
    pendingItemIds,
    completedItemIds,
    failedItemIds,
    currentItemId: pendingItemIds[0],
  };
};

const completeAnalyzeImportBatchItem = (
  state: AnalyzeImportBatchState,
  itemId: string,
): AnalyzeImportBatchState => {
  return updateAnalyzeImportBatchState(state, itemId, "completedItemIds");
};

const failAnalyzeImportBatchItem = (
  state: AnalyzeImportBatchState,
  itemId: string,
): AnalyzeImportBatchState => {
  return updateAnalyzeImportBatchState(state, itemId, "failedItemIds");
};

export {
  ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  beginAnalyzeImportBatch,
  completeAnalyzeImportBatchItem,
  failAnalyzeImportBatchItem,
};
