import {
  ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  type AnalyzeImportBatchState,
  type AnalyzeImportBatchRequest,
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

const stopAnalyzeImportBatch = (
  state: AnalyzeImportBatchState,
): AnalyzeImportBatchState => {
  return {
    active: false,
    totalCount: state.totalCount,
    completedCount: state.completedCount,
    failedCount: state.failedCount,
    pendingItemIds: [],
    completedItemIds: [...state.completedItemIds],
    failedItemIds: [...state.failedItemIds],
  };
};

const resolveAnalyzeImportBatchItemIds = (
  playlist: MPlaylistItem[],
  request?: AnalyzeImportBatchRequest,
): string[] => {
  const shouldIncludeItem = (item: MPlaylistItem) =>
    item.timestamp === 0 && typeof item.endTimestamp === "undefined";

  const explicitItemIds = request?.itemIds;
  if (explicitItemIds) {
    const explicitItemIdSet = new Set(explicitItemIds);

    return playlist
      .filter(
        (item) =>
          explicitItemIdSet.has(item.id) &&
          (request?.scope !== "uncalibrated" || shouldIncludeItem(item))
      )
      .map((item) => item.id);
  }

  return playlist.filter(shouldIncludeItem).map((item) => item.id);
};

export {
  ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  beginAnalyzeImportBatch,
  completeAnalyzeImportBatchItem,
  failAnalyzeImportBatchItem,
  resolveAnalyzeImportBatchItemIds,
  stopAnalyzeImportBatch,
};
