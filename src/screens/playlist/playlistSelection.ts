import MPlaylistItem from "../../models/MPlaylistItem";

type PlaylistHeaderMode = "default" | "selection";

const toggleSelectedItemId = (
  selectedItemIds: string[],
  itemId: string
): string[] => {
  if (selectedItemIds.includes(itemId)) {
    return selectedItemIds.filter((selectedItemId) => selectedItemId !== itemId);
  }

  return [...selectedItemIds, itemId];
};

const clearSelectedItemIds = (_selectedItemIds: string[]): string[] => {
  return [];
};

const areAllPlaylistItemsSelected = (
  playlist: MPlaylistItem[],
  selectedItemIds: string[]
): boolean => {
  return playlist.length > 0 && selectedItemIds.length === playlist.length;
};

const toggleAllSelectedItemIds = (
  playlist: MPlaylistItem[],
  selectedItemIds: string[]
): string[] => {
  if (areAllPlaylistItemsSelected(playlist, selectedItemIds)) {
    return [];
  }

  return playlist.map((item) => item.id);
};

const filterPlaylistBySelectedIds = (
  playlist: MPlaylistItem[],
  selectedItemIds: string[]
): MPlaylistItem[] => {
  return playlist.filter((item) => !selectedItemIds.includes(item.id));
};

const isUncalibratedPlaylistItem = (item: MPlaylistItem): boolean => {
  return item.timestamp === 0 && typeof item.endTimestamp === "undefined";
};

const filterUncalibratedPlaylistItemIds = (
  playlist: MPlaylistItem[],
  selectedItemIds: string[]
): string[] => {
  const selectedItemIdSet = new Set(selectedItemIds);

  return playlist
    .filter(
      (item) =>
        selectedItemIdSet.has(item.id) && isUncalibratedPlaylistItem(item)
    )
    .map((item) => item.id);
};

const getPlaylistHeaderMode = (
  selectedItemIds: string[]
): PlaylistHeaderMode => {
  return selectedItemIds.length > 0 ? "selection" : "default";
};

export {
  areAllPlaylistItemsSelected,
  clearSelectedItemIds,
  filterPlaylistBySelectedIds,
  filterUncalibratedPlaylistItemIds,
  getPlaylistHeaderMode,
  isUncalibratedPlaylistItem,
  toggleAllSelectedItemIds,
  toggleSelectedItemId,
};
export type { PlaylistHeaderMode };
