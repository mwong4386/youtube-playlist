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

const filterPlaylistBySelectedIds = (
  playlist: MPlaylistItem[],
  selectedItemIds: string[]
): MPlaylistItem[] => {
  return playlist.filter((item) => !selectedItemIds.includes(item.id));
};

const getPlaylistHeaderMode = (
  selectedItemIds: string[]
): PlaylistHeaderMode => {
  return selectedItemIds.length > 0 ? "selection" : "default";
};

export {
  clearSelectedItemIds,
  filterPlaylistBySelectedIds,
  getPlaylistHeaderMode,
  toggleSelectedItemId,
};
export type { PlaylistHeaderMode };
