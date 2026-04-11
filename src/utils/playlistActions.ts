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
