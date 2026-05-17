import { useEffect, useState } from "react";
import { ThemePreference } from "../../utils/theme";
import DeleteAllModal from "./DeleteAllModal";
import useActionSheet from "../actionSheet/useActionSheet";
import GeminiSettingsModal from "../gemini/GeminiSettingsModal";
import InfoModal from "../modal/InfoModal";
import SettingsModal from "../settings/SettingsModal";
import {
  getAnalyzeImportBannerViewModel,
  getAnalyzeImportBannerVisibilityKey,
} from "./analyzeImportBanner";
import {
  getGeminiEqBatchNotificationViewModel,
  getGeminiEqBatchVisibilityKey,
  type GeminiEqBatchNotificationState,
} from "./geminiEqBatchNotification";
import NewSongListModal from "./NewSongListModal";
import styles from "./Playlist.module.css";
import PlaybackShelf from "./components/PlaybackShelf";
import PlaylistContent from "./PlaylistContent";
import PlaylistHeader from "./PlaylistHeader";
import PlaylistImportModal from "./PlaylistImportModal";
import SelectionActionsModal from "./SelectionActionsModal";
import {
  areAllPlaylistItemsSelected,
  filterUncalibratedPlaylistItemIds,
  getPlaylistHeaderMode,
} from "./playlistSelection";
import {
  getEffectivePlaybackItemId,
  getVisibleSelectedItemIds,
} from "./playlistScreenState";
import { getVisiblePlaylistForActiveList } from "./songListsViewModel";
import usePlaylistActions from "./usePlaylistActions";
import usePlaylistScreenState from "./usePlaylistScreenState";
import usePlaylistStorageSync from "./usePlaylistStorageSync";
import { DEFAULT_SONG_LIST_NAME } from "../../models/SongList";
import MsgType from "../../constants/msgType";
import GeminiApprovalModal from "../gemini/GeminiApprovalModal";

interface Props {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const Playlist = ({ themePreference, setThemePreference }: Props) => {
  const actionSheet = useActionSheet();
  const [geminiEqBatchNotification, setGeminiEqBatchNotification] =
    useState<GeminiEqBatchNotificationState | null>(null);
  const [playlistUpdateCheckNotice, setPlaylistUpdateCheckNotice] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const {
    songListsState,
    activeSongListName,
    playbackState,
    playing,
    playingId,
    audioEqProfiles,
    geminiApiKey,
    analyzeImportBatchState,
    updateSongListsState,
    updateActiveSongListItems,
    createAudioEqProfileEntry,
    updateAudioEqProfileEntry,
    deleteAudioEqProfileEntry,
    saveGeminiApiKey,
    removeGeminiApiKey,
    clearAnalyzeImportBatchState,
  } = usePlaylistStorageSync();
  const {
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
    isShelfExpanded,
    setIsShelfExpanded,
    selectedItemIds,
    setSelectedItemIds,
    newSongListError,
    setNewSongListError,
    geminiApprovalQueue,
    setGeminiApprovalQueue,
    dismissedAnalyzeImportBannerKey,
    dismissAnalyzeImportBanner,
  } = usePlaylistScreenState();

  useEffect(() => {
    const listener = (message: any, _sender: any, sendResponse: any) => {
      if (message.type === MsgType.GeminiActionApprovalRequest) {
        setGeminiApprovalQueue((q) => [
          ...q,
          {
            actionName: message.actionName,
            params: message.params,
            resolve: (approved: boolean) => {
              sendResponse({ approved });
            },
          },
        ]);
        return true; // Keep message channel open for async response
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [setGeminiApprovalQueue]);

  const currentApproval = geminiApprovalQueue[0];

  const handleApprovalResponse = (approved: boolean) => {
    geminiApprovalQueue.forEach((approval) => {
      approval.resolve(approved);
    });
    setGeminiApprovalQueue([]);
  };

  const playlist = getVisiblePlaylistForActiveList(
    songListsState.songLists,
    activeSongListName,
  );
  const activeSongListRecord =
    songListsState.songLists[activeSongListName] ??
    songListsState.songLists[DEFAULT_SONG_LIST_NAME];
  const activePlaylistSources = activeSongListRecord?.playlistSources ?? [];
  const pendingPlaylistUpdateItems = activePlaylistSources.flatMap(
    (source) => source.pendingNewItems ?? [],
  );
  const sourceDependencyKey = activePlaylistSources
    .map((s) => `${s.url}-${s.lastCheckedAt}`)
    .join("|");
  const {
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
    confirmDeletePlaylist,
    generateEqProfileWithGemini,
    refreshActivePlaylistSource,
    refreshPlaylistSource,
    onAnalyzeSelected,
    onAnalyzeUncalibratedSelected,
    onAudioEqChange,
    onAddPendingPlaylistUpdateItem,
    onCommitPlaylistImportPreview,
    onCreateProfile,
    onCreateSongList,
    onDeletePlaylist,
    onDeleteProfile,
    onDeleteSelected,
    onDismissAnalyzeImportBanner,
    onDismissPendingPlaylistUpdateItem,
    onImportJson,
    onMoveTo,
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
    onAdjustVolumeSelected,
    onDeletePlaylistSource,
    onApplyGeminiSongEqSuggestions,
    openEqSettings,
    openGeminiSettings,
    openInfoModal,
    openNewSongListModal,
    openPlaybackModal,
    openPlaylistImportModal,
    previewYoutubePlaylistImport,
    toggleSelectAll,
    toggleSelectedItem,
  } = usePlaylistActions({
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
  });

  const closeEqSettingsAndSettingsMenu = () => {
    closeEqSettings();
    actionSheet.close();
  };

  const closeGeminiSettingsAndSettingsMenu = () => {
    closeGeminiSettings();
    actionSheet.close();
  };

  const closePlaylistImportModalAndSettingsMenu = () => {
    closePlaylistImportModal();
    actionSheet.close();
  };

  useEffect(() => {
    setSelectedItemIds((currentSelectedItemIds) => {
      return getVisibleSelectedItemIds(
        playlist.map((item) => item.id),
        currentSelectedItemIds,
      );
    });
  }, [playlist]);

  useEffect(() => {
    if (selectedItemIds.length === 0 && isSelectionActionsOpen) {
      setIsSelectionActionsOpen(false);
    }
  }, [selectedItemIds, isSelectionActionsOpen, setIsSelectionActionsOpen]);

  useEffect(() => {
    void refreshActivePlaylistSource();
  }, [activeSongListName, sourceDependencyKey]);

  const analyzeImportBanner = getAnalyzeImportBannerViewModel(
    analyzeImportBatchState,
  );
  const geminiEqBatchBanner = getGeminiEqBatchNotificationViewModel(
    geminiEqBatchNotification,
  );
  const analyzeImportBannerVisibilityKey = getAnalyzeImportBannerVisibilityKey(
    analyzeImportBatchState,
  );
  const geminiEqBatchBannerVisibilityKey = getGeminiEqBatchVisibilityKey(
    geminiEqBatchNotification,
  );
  const showAnalyzeImportBatchState =
    !!analyzeImportBanner &&
    analyzeImportBannerVisibilityKey !== dismissedAnalyzeImportBannerKey;
  const showGeminiEqBatchNotification =
    !!geminiEqBatchBanner && !!geminiEqBatchBannerVisibilityKey;
  const headerMode = getPlaylistHeaderMode(selectedItemIds);
  const allSelected = areAllPlaylistItemsSelected(playlist, selectedItemIds);
  const someSelected = selectedItemIds.length > 0;
  const selectedUncalibratedCount = filterUncalibratedPlaylistItemIds(
    playlist,
    selectedItemIds,
  ).length;
  const currentPlaybackItemId = playbackState.currentItemId || playingId;
  const effectivePlaybackItemId = getEffectivePlaybackItemId(
    currentPlaybackItemId,
    pendingPlaybackItemId,
  );
  const selectedInfoItem = playlist.find((item) => item.id === selectedInfoItemId);
  const firstSelectedItemVolume =
    selectedItemIds.length > 0
      ? playlist.find((item) => item.id === selectedItemIds[0])?.volume
      : undefined;
  const selectedActionSongs = playlist.filter((item) =>
    selectedItemIds.includes(item.id),
  );

  const onDismissGeminiEqBatchBanner = () => {
    setGeminiEqBatchNotification(null);
  };

  const onDismissPlaylistUpdateCheckNotice = () => {
    setPlaylistUpdateCheckNotice(null);
  };

  const onAdjustSelectedSongEqWithGemini = async (userRequest: string) => {
    const selectedSongs = selectedActionSongs;

    if (selectedSongs.length === 0) {
      return;
    }

    closeSelectionActionsModal();
    clearSelection();
    setGeminiEqBatchNotification({
      active: true,
      totalCount: selectedSongs.length,
      successCount: 0,
      failCount: 0,
    });

    let successCount = 0;
    let failCount = 0;

    for (const selectedSong of selectedSongs) {
      try {
        const response = await adjustSongEqWithGemini({
          userRequest,
          existingProfiles: audioEqProfiles,
          songContext: {
            id: selectedSong.id,
            title: selectedSong.title,
            channelName: selectedSong.channelName,
            videoId: selectedSong.videoId,
            url: selectedSong.url,
            audioEq: selectedSong.audioEq,
          },
        });

        if (response.ok) {
          successCount += 1;
          onApplyGeminiSongEqSuggestions([response.suggestion]);
        } else {
          failCount += 1;
        }
      } catch {
        failCount += 1;
      }

      setGeminiEqBatchNotification({
        active: true,
        totalCount: selectedSongs.length,
        successCount,
        failCount,
      });
    }

    setGeminiEqBatchNotification({
      active: false,
      totalCount: selectedSongs.length,
      successCount,
      failCount,
    });
  };

  useEffect(() => {
    if (!selectedInfoItemId || currentPlaybackItemId) {
      setPendingPlaybackItemId(undefined);
    }
  }, [currentPlaybackItemId, selectedInfoItemId, setPendingPlaybackItemId]);

  useEffect(() => {
    if (!selectedInfoItemId) {
      return;
    }

    const selectedItemStillVisible = playlist.some(
      (item) => item.id === selectedInfoItemId,
    );
    if (selectedItemStillVisible) {
      return;
    }

    setPendingPlaybackItemId(undefined);
    setSelectedInfoItemId(undefined);
  }, [playlist, selectedInfoItemId, setPendingPlaybackItemId, setSelectedInfoItemId]);

  return (
    <>
      <div className={styles["page-container"]}>
        <div className={styles["content-container"]}>
          <PlaylistHeader
            playlist={playlist}
            songLists={songListsState.songLists}
            activeSongListName={activeSongListName}
            onDelete={onDeletePlaylist}
            onOpenEqSettings={openEqSettings}
            onOpenGeminiSettings={openGeminiSettings}
            onOpenImportModal={openPlaylistImportModal}
            onOpenNewSongListModal={openNewSongListModal}
            onCheckPlaylistUpdates={async (songListName = activeSongListName) => {
              setPlaylistUpdateCheckNotice(null);
              const result = await refreshPlaylistSource(songListName, true);

              if (!result.ok) {
                setPlaylistUpdateCheckNotice({
                  title: "Could not check playlist updates",
                  detail:
                    result.message ||
                    "The tracked playlist could not be checked right now.",
                });
                return result.message || "Could not check playlist updates.";
              }

              if (!result.checked) {
                setPlaylistUpdateCheckNotice({
                  title: "No playlist checked",
                  detail:
                    result.message ||
                    "No tracked playlist source for this song list.",
                });
                return (
                  result.message ||
                  "No tracked playlist source for this song list."
                );
              }

              if (result.newItemCount > 0) {
                setPlaylistUpdateCheckNotice(null);
                return `${result.newItemCount} new ${
                  result.newItemCount === 1 ? "video" : "videos"
                } found.`;
              }

              setPlaylistUpdateCheckNotice({
                title: "No new videos to add",
                detail: "The tracked playlist was checked just now.",
              });
              return "Checked tracked playlist. No new videos found.";
            }}
            onDeletePlaylistSource={onDeletePlaylistSource}
            onSelectSongList={onSelectSongList}
            onRenameSongList={onRenameSongList}
            onClearSelection={clearSelection}
            onToggleSelectAll={toggleSelectAll}
            onOpenSelectionActions={onOpenSelectionActions}
            allSelected={allSelected}
            someSelected={someSelected}
            selectedCount={selectedItemIds.length}
            themePreference={themePreference}
            setThemePreference={setThemePreference}
            geminiApiKey={geminiApiKey}
          />
          <PlaylistContent
            playlist={playlist}
            isSelectionMode={headerMode === "selection"}
            draggingItemId={draggingItemId}
            playing={playing}
            playingId={playingId}
            selectedItemIds={selectedItemIds}
            showAnalyzeImportBanner={showAnalyzeImportBatchState}
            showGeminiEqBatchBanner={showGeminiEqBatchNotification}
            showPlaylistUpdateCheckNotice={!!playlistUpdateCheckNotice}
            analyzeImportBannerTitle={analyzeImportBanner?.title}
            analyzeImportBannerDetail={analyzeImportBanner?.detail}
            analyzeImportBannerActionLabel={analyzeImportBanner?.actionLabel}
            analyzeImportBannerDismissible={analyzeImportBanner?.dismissible}
            geminiEqBatchBannerTitle={geminiEqBatchBanner?.title}
            geminiEqBatchBannerDetail={geminiEqBatchBanner?.detail}
            geminiEqBatchBannerDismissible={geminiEqBatchBanner?.dismissible}
            playlistUpdateCheckNoticeTitle={playlistUpdateCheckNotice?.title}
            playlistUpdateCheckNoticeDetail={playlistUpdateCheckNotice?.detail}
            pendingPlaylistUpdateItems={pendingPlaylistUpdateItems}
            onStopAnalyzeImportBatch={onStopAnalyzeImportBatch}
            onDismissAnalyzeImportBanner={onDismissAnalyzeImportBanner}
            onDismissGeminiEqBatchBanner={onDismissGeminiEqBatchBanner}
            onDismissPlaylistUpdateCheckNotice={
              onDismissPlaylistUpdateCheckNotice
            }
            onAddPendingPlaylistUpdateItem={onAddPendingPlaylistUpdateItem}
            onDismissPendingPlaylistUpdateItem={
              onDismissPendingPlaylistUpdateItem
            }
            onToggleSelected={toggleSelectedItem}
            onOpenInfoModal={openInfoModal}
            onOpenPlaybackModal={openPlaybackModal}
            onMoveTo={onMoveTo}
            onPlaylistContainerDragOver={onPlaylistContainerDragOver}
            onPlaylistContainerDrop={onPlaylistContainerDrop}
            setDraggingItemId={setDraggingItemId}
          />
        </div>
        {playingId && playlist.find((i) => i.id === playingId) && (
          <PlaybackShelf
            item={playlist.find((i) => i.id === playingId)!}
            isPlaying={playing}
            isExpanded={isShelfExpanded}
            onToggleExpand={() => setIsShelfExpanded(!isShelfExpanded)}
            profiles={audioEqProfiles}
            onvolumechange={onvolumechange}
            onAudioEqChange={onAudioEqChange}
            onAnalyzeSongBoundaries={analyzeSongBoundaries}
            onAdjustSongEqWithGemini={adjustSongEqWithGemini}
            save={onSave}
            geminiApiKey={geminiApiKey}
          />
        )}
      </div>
      <InfoModal
        active={!!selectedInfoItem}
        close={closeInfoModal}
        onvolumechange={onvolumechange}
        onAudioEqChange={onAudioEqChange}
        profiles={audioEqProfiles}
        save={onSave}
        onAnalyzeSongBoundaries={analyzeSongBoundaries}
        onAdjustSongEqWithGemini={adjustSongEqWithGemini}
        currentPlaybackItemId={effectivePlaybackItemId}
        isPlaybackActive={playing}
        item={selectedInfoItem}
        geminiApiKey={geminiApiKey}
      />
      <SettingsModal
        active={isEqSettingsOpen}
        close={closeEqSettingsAndSettingsMenu}
        backToSettings={closeEqSettings}
        audioEqProfiles={audioEqProfiles}
        geminiApiKey={geminiApiKey}
        onCreateProfile={onCreateProfile}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={onDeleteProfile}
        onOpenGeminiSettings={openGeminiSettings}
        requestGeminiEqProfile={generateEqProfileWithGemini}
      />
      <GeminiSettingsModal
        active={isGeminiSettingsOpen}
        close={closeGeminiSettingsAndSettingsMenu}
        backToSettings={closeGeminiSettings}
        geminiApiKey={geminiApiKey}
        onSaveGeminiApiKey={onSaveGeminiApiKey}
        onRemoveGeminiApiKey={onRemoveGeminiApiKey}
      />
      <PlaylistImportModal
        active={isPlaylistImportOpen}
        close={closePlaylistImportModalAndSettingsMenu}
        backToSettings={closePlaylistImportModal}
        onImportJson={onImportJson}
        onSubmit={previewYoutubePlaylistImport}
        onCommitPreview={onCommitPlaylistImportPreview}
      />
      <NewSongListModal
        active={isNewSongListOpen}
        close={closeNewSongListModal}
        errorMessage={newSongListError}
        onSubmit={onCreateSongList}
      />
      <SelectionActionsModal
        active={isSelectionActionsOpen}
        close={closeSelectionActionsModal}
        selectedCount={selectedItemIds.length}
        selectedUncalibratedCount={selectedUncalibratedCount}
        selectedSongs={selectedActionSongs}
        audioEqProfiles={audioEqProfiles}
        geminiApiKey={geminiApiKey}
        firstSelectedItemVolume={firstSelectedItemVolume}
        onAnalyzeSelected={onAnalyzeSelected}
        onAnalyzeUncalibratedSelected={onAnalyzeUncalibratedSelected}
        onDeleteSelected={onDeleteSelected}
        onAdjustVolumeSelected={onAdjustVolumeSelected}
        onAdjustSelectedSongEqWithGemini={onAdjustSelectedSongEqWithGemini}
      />
      <DeleteAllModal
        active={isDeleteAllOpen}
        close={closeDeleteAllModal}
        confirmDeletePlaylist={confirmDeletePlaylist}
      />
      {geminiApprovalQueue.length > 0 && (
        <GeminiApprovalModal
          active={true}
          queue={geminiApprovalQueue}
          onConfirm={() => handleApprovalResponse(true)}
          onCancel={() => handleApprovalResponse(false)}
        />
      )}
    </>
  );
};

export default Playlist;
