import type MPlaylistItem from "../../models/MPlaylistItem";
import type { PlaylistImportMode } from "../../models/PlaylistImport";

interface PlaylistImportPreview {
  items: MPlaylistItem[];
  selectedItemIds: string[];
  skippedDuplicates: number;
}

const createPlaylistImportPreview = (
  existing: MPlaylistItem[],
  imported: MPlaylistItem[],
  mode: PlaylistImportMode,
): PlaylistImportPreview => {
  if (mode === "replace") {
    return {
      items: imported,
      selectedItemIds: imported.map((item) => item.id),
      skippedDuplicates: 0,
    };
  }

  const seenVideoIds = new Set(existing.map((item) => item.videoId));
  const previewItems: MPlaylistItem[] = [];

  for (const item of imported) {
    if (seenVideoIds.has(item.videoId)) {
      continue;
    }

    seenVideoIds.add(item.videoId);
    previewItems.push(item);
  }

  return {
    items: previewItems,
    selectedItemIds: previewItems.map((item) => item.id),
    skippedDuplicates: imported.length - previewItems.length,
  };
};

const commitPlaylistImportPreview = (
  existing: MPlaylistItem[],
  previewItems: MPlaylistItem[],
  selectedItemIds: string[],
  mode: PlaylistImportMode,
): MPlaylistItem[] => {
  const selectedItemIdSet = new Set(selectedItemIds);
  const selectedItems = previewItems.filter((item) => selectedItemIdSet.has(item.id));

  if (mode === "replace") {
    return selectedItems;
  }

  return [...existing, ...selectedItems];
};

export { commitPlaylistImportPreview, createPlaylistImportPreview };
export type { PlaylistImportPreview };
