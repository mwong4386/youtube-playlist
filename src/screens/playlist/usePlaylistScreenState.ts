import { useState } from "react";

const DISMISSED_ANALYZE_IMPORT_BANNER_STORAGE_KEY =
  "dismissedAnalyzeImportBannerKey";

const readDismissedAnalyzeImportBannerKey = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(
    DISMISSED_ANALYZE_IMPORT_BANNER_STORAGE_KEY,
  );
};

const usePlaylistScreenState = () => {
  const [draggingItemId, setDraggingItemId] = useState<string | undefined>(
    undefined,
  );
  const [selectedInfoItemId, setSelectedInfoItemId] = useState<
    string | undefined
  >(undefined);
  const [pendingPlaybackItemId, setPendingPlaybackItemId] = useState<
    string | undefined
  >(undefined);
  const [isEqSettingsOpen, setIsEqSettingsOpen] = useState(false);
  const [isGeminiSettingsOpen, setIsGeminiSettingsOpen] = useState(false);
  const [isPlaylistImportOpen, setIsPlaylistImportOpen] = useState(false);
  const [isNewSongListOpen, setIsNewSongListOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isSelectionActionsOpen, setIsSelectionActionsOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [newSongListError, setNewSongListError] = useState("");
  const [
    dismissedAnalyzeImportBannerKey,
    setDismissedAnalyzeImportBannerKey,
  ] = useState<string | null>(readDismissedAnalyzeImportBannerKey);

  const dismissAnalyzeImportBanner = (bannerKey: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        DISMISSED_ANALYZE_IMPORT_BANNER_STORAGE_KEY,
        bannerKey,
      );
    }

    setDismissedAnalyzeImportBannerKey(bannerKey);
  };

  return {
    draggingItemId,
    setDraggingItemId,
    selectedInfoItemId,
    setSelectedInfoItemId,
    pendingPlaybackItemId,
    setPendingPlaybackItemId,
    isEqSettingsOpen,
    setIsEqSettingsOpen,
    isGeminiSettingsOpen,
    setIsGeminiSettingsOpen,
    isPlaylistImportOpen,
    setIsPlaylistImportOpen,
    isNewSongListOpen,
    setIsNewSongListOpen,
    isDeleteAllOpen,
    setIsDeleteAllOpen,
    isSelectionActionsOpen,
    setIsSelectionActionsOpen,
    selectedItemIds,
    setSelectedItemIds,
    newSongListError,
    setNewSongListError,
    dismissedAnalyzeImportBannerKey,
    dismissAnalyzeImportBanner,
  };
};

export default usePlaylistScreenState;
