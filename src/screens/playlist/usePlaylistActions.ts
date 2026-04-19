import type { ChangeEvent, Dispatch, DragEvent, SetStateAction } from "react";
import MsgType from "../../constants/msgType";
import type AudioEqSettings from "../../models/AudioEq";
import type AudioEqProfile from "../../models/AudioEqProfile";
import type {
  GeminiAnalyzeFailure,
  GeminiAnalyzeSuccess,
  GeminiBoundarySuggestion,
} from "../../models/GeminiSettings";
import type MPlaylistItem from "../../models/MPlaylistItem";
import type {
  AnalyzeImportBatchState,
  PlaylistImportRequest,
  PlaylistImportResponse,
} from "../../models/PlaylistImport";
import type { SongListsState } from "../../models/SongList";
import {
  cancelDeleteAllConfirmation,
  confirmDeleteAllConfirmation,
  deleteSelectedPlaylistItems,
} from "../../utils/playlistActions";
import { createSongList, renameSongList } from "../../utils/songLists";
import {
  getAnalyzeImportBannerVisibilityKey,
  shouldClearAnalyzeImportBatchStateOnDismiss,
} from "./analyzeImportBanner";
import { normalizeAnalyzeSongBoundariesResponse } from "./geminiAnalyzeResponse";
import {
  resolvePlaylistImportSubmission,
  type PlaylistImportSubmissionResult,
} from "./playlistImportResult";
import {
  clearSelectedItemIds,
  filterUncalibratedPlaylistItemIds,
  toggleAllSelectedItemIds,
  toggleSelectedItemId,
} from "./playlistSelection";
import { getSongListCreationError } from "./songListsViewModel";

interface UsePlaylistActionsArgs {
  playlist: MPlaylistItem[];
  songListsState: SongListsState;
  activeSongListName: string;
  analyzeImportBatchState: AnalyzeImportBatchState | null;
  draggingItemId?: string;
  selectedInfoItemId?: string;
  selectedItemIds: string[];
  playing: boolean;
  playingId?: string;
  updateSongListsState: (
    updater: (currentSongListsState: SongListsState) => SongListsState,
    callback?: () => void,
  ) => void;
  updateActiveSongListItems: (
    updater: (currentItems: MPlaylistItem[]) => MPlaylistItem[],
    callback?: () => void,
  ) => void;
  createAudioEqProfileEntry: (name: string, audioEq: AudioEqSettings) => void;
  updateAudioEqProfileEntry: (profile: AudioEqProfile) => void;
  deleteAudioEqProfileEntry: (id: string) => void;
  saveGeminiApiKey: (value: string) => Promise<void>;
  removeGeminiApiKey: () => Promise<void>;
  clearAnalyzeImportBatchState: () => Promise<void>;
  setDraggingItemId: Dispatch<SetStateAction<string | undefined>>;
  setIsEqSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setIsGeminiSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setIsPlaylistImportOpen: Dispatch<SetStateAction<boolean>>;
  setIsNewSongListOpen: Dispatch<SetStateAction<boolean>>;
  setIsDeleteAllOpen: Dispatch<SetStateAction<boolean>>;
  setIsSelectionActionsOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedItemIds: Dispatch<SetStateAction<string[]>>;
  setNewSongListError: Dispatch<SetStateAction<string>>;
  setPendingPlaybackItemId: Dispatch<SetStateAction<string | undefined>>;
  setSelectedInfoItemId: Dispatch<SetStateAction<string | undefined>>;
  setIsShelfExpanded: Dispatch<SetStateAction<boolean>>;
  dismissAnalyzeImportBanner: (bannerKey: string) => void;
}

const usePlaylistActions = ({
  playlist,
  songListsState,
  activeSongListName,
  analyzeImportBatchState,
  draggingItemId,
  selectedInfoItemId,
  selectedItemIds,
  playing,
  playingId,
  updateSongListsState,
  updateActiveSongListItems,
  createAudioEqProfileEntry,
  updateAudioEqProfileEntry,
  deleteAudioEqProfileEntry,
  saveGeminiApiKey,
  removeGeminiApiKey,
  clearAnalyzeImportBatchState,
  setDraggingItemId,
  setIsEqSettingsOpen,
  setIsGeminiSettingsOpen,
  setIsPlaylistImportOpen,
  setIsNewSongListOpen,
  setIsDeleteAllOpen,
  setIsSelectionActionsOpen,
  setSelectedItemIds,
  setNewSongListError,
  setPendingPlaybackItemId,
  setSelectedInfoItemId,
  setIsShelfExpanded,
  dismissAnalyzeImportBanner,
}: UsePlaylistActionsArgs) => {
  const openEqSettings = () => {
    setIsEqSettingsOpen(true);
  };

  const closeEqSettings = () => {
    setIsEqSettingsOpen(false);
  };

  const openGeminiSettings = () => {
    setIsGeminiSettingsOpen(true);
  };

  const closeGeminiSettings = () => {
    setIsGeminiSettingsOpen(false);
  };

  const openPlaylistImportModal = () => {
    setIsPlaylistImportOpen(true);
  };

  const closePlaylistImportModal = () => {
    setIsPlaylistImportOpen(false);
  };

  const openNewSongListModal = () => {
    setNewSongListError("");
    setIsNewSongListOpen(true);
  };

  const closeNewSongListModal = () => {
    setNewSongListError("");
    setIsNewSongListOpen(false);
  };

  const closeDeleteAllModal = () => {
    cancelDeleteAllConfirmation(() => {
      setIsDeleteAllOpen(false);
    });
  };

  const closeSelectionActionsModal = () => {
    setIsSelectionActionsOpen(false);
  };

  const closeInfoModal = () => {
    setPendingPlaybackItemId(undefined);
    setSelectedInfoItemId(undefined);
  };

  const clearSelection = () => {
    setSelectedItemIds((currentSelectedItemIds) =>
      clearSelectedItemIds(currentSelectedItemIds),
    );
  };

  const toggleSelectAll = () => {
    setSelectedItemIds((currentSelectedItemIds) =>
      toggleAllSelectedItemIds(playlist, currentSelectedItemIds),
    );
  };

  const toggleSelectedItem = (itemId: string) => {
    setSelectedItemIds((currentSelectedItemIds) =>
      toggleSelectedItemId(currentSelectedItemIds, itemId),
    );
  };

  const onDeleteAll = () => {
    setIsDeleteAllOpen(true);
  };

  const confirmDeleteAll = () => {
    confirmDeleteAllConfirmation(
      () => {
        updateActiveSongListItems(() => []);
      },
      () => {
        setIsDeleteAllOpen(false);
      },
    );
  };

  const onImportJson = (importedPlaylist: MPlaylistItem[]) => {
    updateActiveSongListItems(() => importedPlaylist);
  };

  const onCreateProfile = (name: string, audioEq: AudioEqSettings) => {
    createAudioEqProfileEntry(name, audioEq);
  };

  const onUpdateProfile = (profile: AudioEqProfile) => {
    updateAudioEqProfileEntry(profile);
  };

  const onDeleteProfile = (id: string) => {
    deleteAudioEqProfileEntry(id);
  };

  const onSaveGeminiApiKey = async (value: string) => {
    await saveGeminiApiKey(value);
  };

  const onRemoveGeminiApiKey = async () => {
    await removeGeminiApiKey();
  };

  const analyzeSongBoundaries = (itemId: string) => {
    console.log("[Gemini analyze]", "sending runtime message", {
      itemId,
      messageName: MsgType.AnalyzeSongBoundaries,
      runtimeId: chrome.runtime.id,
    });

    return new Promise<GeminiAnalyzeSuccess | GeminiAnalyzeFailure>(
      (resolve) => {
        chrome.runtime.sendMessage(
          { name: MsgType.AnalyzeSongBoundaries, itemId },
          (response) => {
            resolve(
              normalizeAnalyzeSongBoundariesResponse(
                response,
                chrome.runtime.lastError,
                console,
              ),
            );
          },
        );
      },
    );
  };

  const importYoutubePlaylist = (
    request: PlaylistImportRequest,
  ): Promise<PlaylistImportSubmissionResult> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          name: MsgType.ImportYoutubePlaylist,
          playlistUrl: request.playlistUrl,
          mode: request.mode,
        },
        (response: PlaylistImportResponse | undefined) => {
          const result = resolvePlaylistImportSubmission(
            response,
            chrome.runtime.lastError ?? null,
          );

          if (result.ok) {
            closePlaylistImportModal();
          }

          resolve(result);
        },
      );
    });
  };

  const onSave = (
    id: string,
    timestamp: number,
    endTimestamp: number | undefined,
    volume: number,
    audioEq: AudioEqSettings,
    geminiSuggestion?: GeminiBoundarySuggestion,
  ) => {
    updateActiveSongListItems((currentPlaylist) => {
      const item = currentPlaylist.find((playlistItem) => playlistItem.id === id);
      if (!item) {
        return currentPlaylist;
      }

      return currentPlaylist.map((playlistItem) => {
        if (playlistItem.id !== id) {
          return playlistItem;
        }

        return {
          ...playlistItem,
          timestamp,
          endTimestamp,
          volume,
          audioEq,
          ...(geminiSuggestion
            ? {
                geminiSuggestedStartTimestamp: geminiSuggestion.startTimestamp,
                geminiSuggestedEndTimestamp: geminiSuggestion.endTimestamp,
              }
            : {}),
        };
      });
    });
  };

  const onMoveTo = (toId: string) => {
    if (!draggingItemId || draggingItemId === toId) {
      return;
    }

    updateActiveSongListItems((currentPlaylist) => {
      const currentIndex = currentPlaylist.findIndex(
        (playlistItem) => playlistItem.id === draggingItemId,
      );
      const item = currentPlaylist.find(
        (playlistItem) => playlistItem.id === draggingItemId,
      );
      if (!item || currentIndex < 0) {
        return currentPlaylist;
      }

      const targetIndex = currentPlaylist.findIndex(
        (playlistItem) => playlistItem.id === toId,
      );
      if (targetIndex < 0) {
        return currentPlaylist;
      }

      const nextPlaylist = currentPlaylist.filter(
        (playlistItem) => playlistItem.id !== draggingItemId,
      );
      const insertIndex =
        currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
      nextPlaylist.splice(insertIndex, 0, item);
      return nextPlaylist;
    });
  };

  const onMoveToEnd = () => {
    if (!draggingItemId) {
      return;
    }

    updateActiveSongListItems((currentPlaylist) => {
      const item = currentPlaylist.find(
        (playlistItem) => playlistItem.id === draggingItemId,
      );
      if (!item) {
        return currentPlaylist;
      }

      const nextPlaylist = currentPlaylist.filter(
        (playlistItem) => playlistItem.id !== draggingItemId,
      );
      nextPlaylist.push(item);
      return nextPlaylist;
    });
  };

  const onPlaylistContainerDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingItemId) {
      return;
    }

    event.preventDefault();
  };

  const onPlaylistContainerDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingItemId) {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    onMoveToEnd();
    setDraggingItemId(undefined);
  };

  const onvolumechange = (event: ChangeEvent<HTMLInputElement>) => {
    if (playing && selectedInfoItemId === playingId) {
      chrome.runtime.sendMessage({
        name: MsgType.VolumeChange,
        volume: event.currentTarget.value,
      });
    }
  };

  const onAudioEqChange = (audioEq: Partial<AudioEqSettings>) => {
    if (playing && selectedInfoItemId === playingId) {
      chrome.runtime.sendMessage({
        name: MsgType.AudioEqChange,
        audioEq,
      });
    }
  };

  const onOpenSelectionActions = () => {
    if (selectedItemIds.length === 0) {
      return;
    }

    setIsSelectionActionsOpen(true);
  };

  const onSelectSongList = (name: string) => {
    if (name === activeSongListName) {
      return;
    }

    updateSongListsState((currentSongListsState) => ({
      songLists: currentSongListsState.songLists,
      activeSongListName: name,
    }));
  };

  const onCreateSongList = (rawName: string) => {
    const error = getSongListCreationError(
      rawName,
      Object.keys(songListsState.songLists),
    );

    if (error) {
      setNewSongListError(error);
      return;
    }

    setNewSongListError("");
    updateSongListsState(
      (currentSongListsState) => createSongList(currentSongListsState, rawName),
      () => {
        setIsNewSongListOpen(false);
      },
    );
  };

  const onRenameSongList = (currentName: string, nextName: string) => {
    try {
      updateSongListsState((currentSongListsState) =>
        renameSongList(currentSongListsState, currentName, nextName),
      );
      return "";
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Unable to rename song list.";
    }
  };

  const onDeleteSelected = () => {
    if (selectedItemIds.length === 0) {
      return;
    }

    updateActiveSongListItems(
      (currentPlaylist) =>
        deleteSelectedPlaylistItems(currentPlaylist, selectedItemIds),
      () => {
        if (chrome.runtime.lastError) {
          return;
        }

        clearSelection();
        closeSelectionActionsModal();
      },
    );
  };

  const onAnalyzeSelected = () => {
    if (selectedItemIds.length === 0) {
      return;
    }

    chrome.runtime.sendMessage(
      {
        name: MsgType.AnalyzeImportedPlaylist,
        itemIds: selectedItemIds,
      },
      (_response?: unknown) => {
        if (chrome.runtime.lastError) {
          return;
        }

        clearSelection();
        closeSelectionActionsModal();
      },
    );
  };

  const onAnalyzeUncalibratedSelected = () => {
    const uncalibratedItemIds = filterUncalibratedPlaylistItemIds(
      playlist,
      selectedItemIds,
    );

    if (uncalibratedItemIds.length === 0) {
      return;
    }

    chrome.runtime.sendMessage(
      {
        name: MsgType.AnalyzeImportedPlaylist,
        itemIds: uncalibratedItemIds,
        scope: "uncalibrated",
      },
      (_response?: unknown) => {
        if (chrome.runtime.lastError) {
          return;
        }

        clearSelection();
        closeSelectionActionsModal();
      },
    );
  };

  const onStopAnalyzeImportBatch = () => {
    chrome.runtime.sendMessage({
      name: MsgType.StopAnalyzeImportedPlaylist,
    });
  };

  const onDismissAnalyzeImportBanner = () => {
    const analyzeImportBannerVisibilityKey =
      getAnalyzeImportBannerVisibilityKey(analyzeImportBatchState);

    if (analyzeImportBannerVisibilityKey) {
      dismissAnalyzeImportBanner(analyzeImportBannerVisibilityKey);
    }

    if (shouldClearAnalyzeImportBatchStateOnDismiss(analyzeImportBatchState)) {
      void clearAnalyzeImportBatchState();
    }
  };

  const openInfoModal = (itemId: string) => {
    if (itemId === playingId) {
      setIsShelfExpanded(true);
      return;
    }
    setPendingPlaybackItemId(undefined);
    setSelectedInfoItemId(itemId);
  };

  const openPlaybackModal = (itemId: string) => {
    setPendingPlaybackItemId(itemId);
  };

  return {
    analyzeSongBoundaries,
    clearSelection,
    closeDeleteAllModal,
    closeEqSettings,
    closeGeminiSettings,
    closeInfoModal,
    closeNewSongListModal,
    closePlaylistImportModal,
    closeSelectionActionsModal,
    confirmDeleteAll,
    importYoutubePlaylist,
    onAnalyzeSelected,
    onAnalyzeUncalibratedSelected,
    onAudioEqChange,
    onCreateProfile,
    onCreateSongList,
    onDeleteAll,
    onDeleteProfile,
    onDeleteSelected,
    onDismissAnalyzeImportBanner,
    onImportJson,
    onMoveTo,
    onMoveToEnd,
    onPlaylistContainerDragOver,
    onPlaylistContainerDrop,
    onOpenSelectionActions,
    onRemoveGeminiApiKey,
    onRenameSongList,
    onSave,
    onSaveGeminiApiKey,
    onSelectSongList,
    onStopAnalyzeImportBatch,
    onUpdateProfile,
    onvolumechange,
    openEqSettings,
    openGeminiSettings,
    openInfoModal,
    openNewSongListModal,
    openPlaybackModal,
    openPlaylistImportModal,
    toggleSelectAll,
    toggleSelectedItem,
  };
};

export default usePlaylistActions;
