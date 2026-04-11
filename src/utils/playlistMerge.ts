import MPlaylistItem from "../models/MPlaylistItem";
import type { PlaylistImportMode } from "../models/PlaylistImport";

interface PlaylistMergeResult {
  playlist: MPlaylistItem[];
  importedCount: number;
  skippedDuplicates: number;
}

const mergeImportedPlaylist = (
  existing: MPlaylistItem[],
  imported: MPlaylistItem[],
  mode: PlaylistImportMode
): PlaylistMergeResult => {
  if (mode === "replace") {
    return {
      playlist: imported,
      importedCount: imported.length,
      skippedDuplicates: 0,
    };
  }

  const seenVideoIds = new Set(existing.map((item) => item.videoId));
  const appendedItems: MPlaylistItem[] = [];

  for (const item of imported) {
    if (seenVideoIds.has(item.videoId)) {
      continue;
    }

    seenVideoIds.add(item.videoId);
    appendedItems.push(item);
  }

  return {
    playlist: [...existing, ...appendedItems],
    importedCount: appendedItems.length,
    skippedDuplicates: imported.length - appendedItems.length,
  };
};

export { mergeImportedPlaylist };
export type { PlaylistMergeResult };
