import type { ChangeEvent, Dispatch, DragEvent, SetStateAction } from "react";
import MsgType from "../../constants/msgType";
import type AudioEqSettings from "../../models/AudioEq";
import type AudioEqProfile from "../../models/AudioEqProfile";
import type {
  GeminiEqProfileResponse,
  GeminiEqProfileUserRequest,
  GeminiSongEqResponse,
  GeminiSongEqSuggestion,
  GeminiSongEqUserRequest,
} from "../../models/GeminiActions";
import {
  type GeminiAnalyzeFailure,
  type GeminiAnalyzeSuccess,
  type GeminiBoundarySuggestion,
} from "../../models/GeminiSettings";
import type MPlaylistItem from "../../models/MPlaylistItem";
import type {
  AnalyzeImportBatchState,
  PlaylistImportMode,
  PlaylistImportPreviewResponse,
  PlaylistImportRequest,
  PlaylistImportResponse,
} from "../../models/PlaylistImport";
import type {
  PlaylistSourceRecord,
  SongListsState,
} from "../../models/SongList";
import {
  cancelDeleteAllConfirmation,
  confirmDeleteAllConfirmation,
  deleteSelectedPlaylistItems,
  updateSelectedVolumeMultiplier,
} from "../../utils/playlistActions";
import {
  createSongList,
  renameSongList,
  updateActiveSongListRecord,
} from "../../utils/songLists";
import {
  addPendingPlaylistUpdateItem,
  addPendingPlaylistUpdates,
  dismissPendingPlaylistUpdateItem,
  dismissPendingPlaylistUpdates,
  isPlaylistSourceDueForRefresh,
} from "../../utils/playlistUpdateDetection";
import {
  getAnalyzeImportBannerVisibilityKey,
  shouldClearAnalyzeImportBatchStateOnDismiss,
} from "./analyzeImportBanner";
import { normalizeGeminiEqProfileResponse } from "../gemini/geminiEqProfileResponse";
import { normalizeGeminiSongEqResponse } from "../gemini/geminiSongEqResponse";
import { normalizeAnalyzeSongBoundariesResponse } from "./geminiAnalyzeResponse";
import {
  resolvePlaylistImportPreviewSubmission,
  resolvePlaylistImportSubmission,
  type PlaylistImportPreviewSubmissionResult,
  type PlaylistImportSubmissionResult,
} from "./playlistImportResult";
import {
  commitPlaylistImportPreview,
  createPlaylistImportPreview,
  createPlaylistSourceFromImport,
} from "./playlistImportPreview";
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

interface PlaylistSourceRefreshResult {
  ok: boolean;
  checked: boolean;
  newItemCount: number;
  message?: string;
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

  const generateEqProfileWithGemini = (
    request: GeminiEqProfileUserRequest,
  ): Promise<GeminiEqProfileResponse> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          name: MsgType.GenerateEqProfileWithGemini,
          userRequest: request.userRequest,
          existingProfiles: request.existingProfiles,
          songContext: request.songContext,
        },
        (response: unknown) => {
          resolve(
            normalizeGeminiEqProfileResponse(
              response,
              chrome.runtime.lastError,
            ),
          );
        },
      );
    });
  };

  const adjustSongEqWithGemini = (
    request: GeminiSongEqUserRequest,
  ): Promise<GeminiSongEqResponse> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          name: MsgType.AdjustSongEqWithGemini,
          userRequest: request.userRequest,
          existingProfiles: request.existingProfiles,
          songContext: request.songContext,
        },
        (response: unknown) => {
          resolve(
            normalizeGeminiSongEqResponse(
              response,
              request.songContext.id,
              chrome.runtime.lastError,
            ),
          );
        },
      );
    });
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

  const previewYoutubePlaylistImport = (
    request: PlaylistImportRequest,
  ): Promise<PlaylistImportPreviewSubmissionResult> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          name: MsgType.PreviewYoutubePlaylistImport,
          playlistUrl: request.playlistUrl,
        },
        (response: PlaylistImportPreviewResponse | undefined) => {
          resolve(
            resolvePlaylistImportPreviewSubmission(
              response,
              chrome.runtime.lastError ?? null,
              (items) => ({
                source: "youtube",
                mode: request.mode,
                ...createPlaylistImportPreview(playlist, items, request.mode),
              }),
            ),
          );
        },
      );
    });
  };

  const onCommitPlaylistImportPreview = (
    previewItems: MPlaylistItem[],
    selectedPreviewItemIds: string[],
    mode: PlaylistImportMode,
    options?: {
      trackSource?: boolean;
      playlistUrl?: string;
      sourceItems?: MPlaylistItem[];
    },
  ) => {
    if (selectedPreviewItemIds.length === 0) {
      return;
    }

    updateSongListsState((currentSongListsState) =>
      updateActiveSongListRecord(currentSongListsState, (record) => {
        const items = commitPlaylistImportPreview(
          record.items,
          previewItems,
          selectedPreviewItemIds,
          mode,
        );

        if (
          !options?.trackSource ||
          !options.playlistUrl ||
          !options.sourceItems
        ) {
          return {
            ...record,
            items,
          };
        }

        return {
          ...record,
          items,
          playlistSources: [
            createPlaylistSourceFromImport(
              options.playlistUrl,
              options.sourceItems,
            ),
            ...(record.playlistSources ?? []).slice(1),
          ],
        };
      }),
      closePlaylistImportModal,
    );
  };

  const refreshActivePlaylistSource = (
    force = false,
  ): Promise<PlaylistSourceRefreshResult> => {
    const activeSource =
      songListsState.songLists[activeSongListName]?.playlistSources?.[0];

    if (
      !force &&
      (!activeSource || !isPlaylistSourceDueForRefresh(activeSource))
    ) {
      return Promise.resolve({
        ok: true,
        checked: false,
        newItemCount: 0,
        message: activeSource
          ? "Tracked playlist was checked recently."
          : "No tracked playlist source for this song list.",
      });
    }

    return new Promise((resolve) => {
      console.log("[Playlist update detection] Requesting refresh", {
        force,
        hasActiveSource: Boolean(activeSource),
        activeSongListName,
      });

      chrome.runtime.sendMessage(
        { name: MsgType.RefreshActivePlaylistSource, force },
        (response: PlaylistSourceRefreshResult | undefined) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[Playlist update detection] Refresh failed",
              chrome.runtime.lastError,
            );
            resolve({
              ok: false,
              checked: false,
              newItemCount: 0,
              message:
                chrome.runtime.lastError.message ||
                "Could not check playlist updates.",
            });
            return;
          }

          console.log("[Playlist update detection] Refresh response", response);

          resolve(
            response ?? {
              ok: false,
              checked: false,
              newItemCount: 0,
              message: "Could not check playlist updates.",
            },
          );
        },
      );
    });
  };

  const updateActivePlaylistSource = (
    updater: (source: PlaylistSourceRecord) => PlaylistSourceRecord,
  ) => {
    updateSongListsState((currentSongListsState) =>
      updateActiveSongListRecord(currentSongListsState, (record) => {
        const source = record.playlistSources?.[0];
        if (!source) {
          return record;
        }

        return {
          ...record,
          playlistSources: [
            updater(source),
            ...(record.playlistSources ?? []).slice(1),
          ],
        };
      }),
    );
  };

  const onAddPendingPlaylistUpdates = () => {
    updateSongListsState((currentSongListsState) =>
      updateActiveSongListRecord(currentSongListsState, (record) => {
        const source = record.playlistSources?.[0];
        if (!source) {
          return record;
        }

        const result = addPendingPlaylistUpdates(record.items, source);
        return {
          ...record,
          items: result.items,
          playlistSources: [
            result.source,
            ...(record.playlistSources ?? []).slice(1),
          ],
        };
      }),
    );
  };

  const onAddPendingPlaylistUpdateItem = (itemId: string) => {
    updateSongListsState((currentSongListsState) =>
      updateActiveSongListRecord(currentSongListsState, (record) => {
        const source = record.playlistSources?.[0];
        if (!source) {
          return record;
        }

        const result = addPendingPlaylistUpdateItem(
          record.items,
          source,
          itemId,
        );
        return {
          ...record,
          items: result.items,
          playlistSources: [
            result.source,
            ...(record.playlistSources ?? []).slice(1),
          ],
        };
      }),
    );
  };

  const onDismissPendingPlaylistUpdates = () => {
    updateActivePlaylistSource(dismissPendingPlaylistUpdates);
  };

  const onDismissPendingPlaylistUpdateItem = (itemId: string) => {
    updateActivePlaylistSource((source) =>
      dismissPendingPlaylistUpdateItem(source, itemId),
    );
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

  const onAdjustVolumeSelected = (multiplier: number) => {
    if (selectedItemIds.length === 0) {
      return;
    }

    updateActiveSongListItems(
      (currentPlaylist) =>
        updateSelectedVolumeMultiplier(currentPlaylist, selectedItemIds, multiplier),
      () => {
        if (chrome.runtime.lastError) {
          return;
        }

        clearSelection();
        closeSelectionActionsModal();
      },
    );
  };

  const onApplyGeminiSongEqSuggestions = (
    suggestions: GeminiSongEqSuggestion[],
  ) => {
    if (suggestions.length === 0) {
      return;
    }

    const suggestionsBySongId = new Map(
      suggestions.map((suggestion) => [suggestion.songId, suggestion.audioEq]),
    );

    updateActiveSongListItems(
      (currentPlaylist) =>
        currentPlaylist.map((playlistItem) =>
          suggestionsBySongId.has(playlistItem.id)
            ? {
                ...playlistItem,
                audioEq: suggestionsBySongId.get(playlistItem.id)!,
              }
            : playlistItem,
        ),
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
    adjustSongEqWithGemini,
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
    generateEqProfileWithGemini,
    importYoutubePlaylist,
    refreshActivePlaylistSource,
    onAdjustVolumeSelected,
    onAddPendingPlaylistUpdateItem,
    onAddPendingPlaylistUpdates,
    onApplyGeminiSongEqSuggestions,
    onAnalyzeSelected,
    onAnalyzeUncalibratedSelected,
    onAudioEqChange,
    onCreateProfile,
    onCreateSongList,
    onDeleteAll,
    onDeleteProfile,
    onDeleteSelected,
    onDismissAnalyzeImportBanner,
    onDismissPendingPlaylistUpdateItem,
    onDismissPendingPlaylistUpdates,
    onCommitPlaylistImportPreview,
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
    previewYoutubePlaylistImport,
    toggleSelectAll,
    toggleSelectedItem,
  };
};

export default usePlaylistActions;
