import type MPlaylistItem from "../models/MPlaylistItem";

export const cancelDeleteAllConfirmation = (closeModal: () => void) => {
  closeModal();
};

export const confirmDeleteAllConfirmation = (
  deleteAll: () => void,
  closeModal: () => void
) => {
  deleteAll();
  closeModal();
};

export const deleteSelectedPlaylistItems = (
  playlist: MPlaylistItem[],
  selectedItemIds: string[]
): MPlaylistItem[] => {
  const selectedItemIdSet = new Set(selectedItemIds);
  return playlist.filter((item) => !selectedItemIdSet.has(item.id));
};

export const updateSelectedVolumeMultiplier = (
  playlist: MPlaylistItem[],
  selectedItemIds: string[],
  multiplier: number
): MPlaylistItem[] => {
  const selectedItemIdSet = new Set(selectedItemIds);
  return playlist.map((item) => {
    if (!selectedItemIdSet.has(item.id)) {
      return item;
    }

    const newVolume = Math.min(
      100,
      Math.max(0, Math.round(Number((item.volume * multiplier).toPrecision(12))))
    );
    return {
      ...item,
      volume: newVolume,
    };
  });
};
