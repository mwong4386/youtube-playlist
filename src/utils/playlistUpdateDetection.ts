import type MPlaylistItem from "../models/MPlaylistItem";
import type { PlaylistSourceRecord } from "../models/SongList";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const clearPendingPlaylistSourceState = (
  source: PlaylistSourceRecord
): PlaylistSourceRecord => {
  const { pendingNewItems, pendingSnapshotVideoIds, ...rest } = source;
  void pendingNewItems;
  void pendingSnapshotVideoIds;
  return rest;
};

const readSnapshotVideoIds = (items: MPlaylistItem[]) => {
  return items.map((item) => item.videoId);
};

export const isPlaylistSourceDueForRefresh = (
  source: PlaylistSourceRecord,
  now: Date = new Date()
) => {
  if (!source.lastCheckedAt) {
    return true;
  }

  const lastCheckedAtMs = Date.parse(source.lastCheckedAt);
  if (!Number.isFinite(lastCheckedAtMs)) {
    return true;
  }

  return now.getTime() - lastCheckedAtMs >= ONE_DAY_MS;
};

export const findNewPlaylistItems = (
  source: PlaylistSourceRecord,
  fetchedItems: MPlaylistItem[]
) => {
  const seenVideoIds = new Set(source.lastSeenVideoIds);
  return fetchedItems.filter((item) => !seenVideoIds.has(item.videoId));
};

export const updatePlaylistSourceAfterRefresh = (
  source: PlaylistSourceRecord,
  fetchedItems: MPlaylistItem[],
  now: Date = new Date()
): PlaylistSourceRecord => {
  const snapshotVideoIds = readSnapshotVideoIds(fetchedItems);
  const pendingNewItems = findNewPlaylistItems(source, fetchedItems);

  if (pendingNewItems.length === 0) {
    return {
      url: source.url,
      lastCheckedAt: now.toISOString(),
      lastSeenVideoIds: snapshotVideoIds,
    };
  }

  return {
    url: source.url,
    lastCheckedAt: now.toISOString(),
    lastSeenVideoIds: source.lastSeenVideoIds,
    pendingNewItems,
    pendingSnapshotVideoIds: snapshotVideoIds,
  };
};

export const dismissPendingPlaylistUpdates = (
  source: PlaylistSourceRecord
): PlaylistSourceRecord => {
  return {
    ...clearPendingPlaylistSourceState(source),
    lastSeenVideoIds: source.pendingSnapshotVideoIds ?? source.lastSeenVideoIds,
  };
};

export const addPendingPlaylistUpdates = (
  items: MPlaylistItem[],
  source: PlaylistSourceRecord
) => {
  const pendingNewItems = source.pendingNewItems ?? [];
  const nextSource = dismissPendingPlaylistUpdates(source);

  return {
    items: [...items, ...pendingNewItems],
    source: nextSource,
  };
};

const updatePendingPlaylistUpdateItem = (
  source: PlaylistSourceRecord,
  itemId: string
): PlaylistSourceRecord => {
  const pendingNewItems = (source.pendingNewItems ?? []).filter(
    (item) => item.id !== itemId,
  );

  if (pendingNewItems.length === 0) {
    return dismissPendingPlaylistUpdates(source);
  }

  return {
    ...source,
    pendingNewItems,
  };
};

export const addPendingPlaylistUpdateItem = (
  items: MPlaylistItem[],
  source: PlaylistSourceRecord,
  itemId: string
) => {
  const pendingItem = (source.pendingNewItems ?? []).find(
    (item) => item.id === itemId,
  );
  const nextSource = updatePendingPlaylistUpdateItem(source, itemId);

  return {
    items: pendingItem ? [...items, pendingItem] : items,
    source: nextSource,
  };
};

export const dismissPendingPlaylistUpdateItem = (
  source: PlaylistSourceRecord,
  itemId: string
): PlaylistSourceRecord => {
  return updatePendingPlaylistUpdateItem(source, itemId);
};
