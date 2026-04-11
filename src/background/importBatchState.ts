import {
  ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  type AnalyzeImportBatchState,
} from "../models/PlaylistImport";
import type MPlaylistItem from "../models/MPlaylistItem";

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

const resolveAnalyzeImportBatchItemIds = (
  playlist: MPlaylistItem[],
  explicitItemIds?: string[],
): string[] => {
  if (explicitItemIds) {
    const explicitItemIdSet = new Set(explicitItemIds);

    return playlist
      .filter((item) => explicitItemIdSet.has(item.id))
      .map((item) => item.id);
  }

  return playlist
    .filter(
      (item) =>
        item.timestamp === 0 && typeof item.endTimestamp === "undefined",
    )
    .map((item) => item.id);
};

export {
  ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  beginAnalyzeImportBatch,
  completeAnalyzeImportBatchItem,
  failAnalyzeImportBatchItem,
  resolveAnalyzeImportBatchItemIds,
};
