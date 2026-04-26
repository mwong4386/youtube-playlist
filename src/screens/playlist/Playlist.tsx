import { useEffect } from "react";
import { ThemePreference } from "../../utils/theme";
import DeleteAllModal from "./DeleteAllModal";
import GeminiEqProfileBuilder from "../gemini/GeminiEqProfileBuilder";
import GeminiSettingsModal from "../gemini/GeminiSettingsModal";
import InfoModal from "../modal/InfoModal";
import SettingsModal from "../settings/SettingsModal";
import {
  getAnalyzeImportBannerViewModel,
  getAnalyzeImportBannerVisibilityKey,
} from "./analyzeImportBanner";
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

interface Props {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const Playlist = ({ themePreference, setThemePreference }: Props) => {
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
    isGeminiEqBuilderOpen,
    setIsGeminiEqBuilderOpen,
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
    dismissedAnalyzeImportBannerKey,
    dismissAnalyzeImportBanner,
  } = usePlaylistScreenState();
  const playlist = getVisiblePlaylistForActiveList(
    songListsState.songLists,
    activeSongListName,
  );
  const {
    analyzeSongBoundaries,
    clearSelection,
    closeDeleteAllModal,
    closeEqSettings,
    closeGeminiEqBuilder,
    closeGeminiSettings,
    closeInfoModal,
    closeNewSongListModal,
    closePlaylistImportModal,
    closeSelectionActionsModal,
    confirmDeleteAll,
    generateEqProfileWithGemini,
    onAnalyzeSelected,
    onAnalyzeUncalibratedSelected,
    onAudioEqChange,
    onCommitPlaylistImportPreview,
    onCreateProfile,
    onCreateSongList,
    onDeleteAll,
    onDeleteProfile,
    onDeleteSelected,
    onDismissAnalyzeImportBanner,
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
    openEqSettings,
    openGeminiEqBuilder,
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
    setIsGeminiEqBuilderOpen,
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

  const analyzeImportBanner = getAnalyzeImportBannerViewModel(
    analyzeImportBatchState,
  );
  const analyzeImportBannerVisibilityKey = getAnalyzeImportBannerVisibilityKey(
    analyzeImportBatchState,
  );
  const showAnalyzeImportBatchState =
    !!analyzeImportBanner &&
    analyzeImportBannerVisibilityKey !== dismissedAnalyzeImportBannerKey;
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

  if (isGeminiEqBuilderOpen) {
    return (
      <>
        <GeminiEqProfileBuilder
          existingProfiles={audioEqProfiles}
          onBack={closeGeminiEqBuilder}
          onOpenSettings={openGeminiSettings}
          onCreateProfile={onCreateProfile}
          requestGeminiEqProfile={generateEqProfileWithGemini}
        />
        <GeminiSettingsModal
          active={isGeminiSettingsOpen}
          close={closeGeminiSettings}
          geminiApiKey={geminiApiKey}
          onSaveGeminiApiKey={onSaveGeminiApiKey}
          onRemoveGeminiApiKey={onRemoveGeminiApiKey}
        />
      </>
    );
  }

  return (
    <>
      <div className={styles["page-container"]}>
        <div className={styles["content-container"]}>
          <PlaylistHeader
            playlist={playlist}
            songLists={songListsState.songLists}
            activeSongListName={activeSongListName}
            onDelete={onDeleteAll}
            onOpenEqSettings={openEqSettings}
            onOpenGeminiEqBuilder={openGeminiEqBuilder}
            onOpenGeminiSettings={openGeminiSettings}
            onOpenImportModal={openPlaylistImportModal}
            onOpenNewSongListModal={openNewSongListModal}
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
          />
          <PlaylistContent
            playlist={playlist}
            isSelectionMode={headerMode === "selection"}
            draggingItemId={draggingItemId}
            playing={playing}
            playingId={playingId}
            selectedItemIds={selectedItemIds}
            showAnalyzeImportBanner={showAnalyzeImportBatchState}
            analyzeImportBannerTitle={analyzeImportBanner?.title}
            analyzeImportBannerDetail={analyzeImportBanner?.detail}
            analyzeImportBannerActionLabel={analyzeImportBanner?.actionLabel}
            analyzeImportBannerDismissible={analyzeImportBanner?.dismissible}
            onStopAnalyzeImportBatch={onStopAnalyzeImportBatch}
            onDismissAnalyzeImportBanner={onDismissAnalyzeImportBanner}
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
            save={onSave}
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
        currentPlaybackItemId={effectivePlaybackItemId}
        isPlaybackActive={playing}
        item={selectedInfoItem}
      />
      <SettingsModal
        active={isEqSettingsOpen}
        close={closeEqSettings}
        audioEqProfiles={audioEqProfiles}
        onCreateProfile={onCreateProfile}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={onDeleteProfile}
      />
      <GeminiSettingsModal
        active={isGeminiSettingsOpen}
        close={closeGeminiSettings}
        geminiApiKey={geminiApiKey}
        onSaveGeminiApiKey={onSaveGeminiApiKey}
        onRemoveGeminiApiKey={onRemoveGeminiApiKey}
      />
      <PlaylistImportModal
        active={isPlaylistImportOpen}
        close={closePlaylistImportModal}
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
        firstSelectedItemVolume={firstSelectedItemVolume}
        onAnalyzeSelected={onAnalyzeSelected}
        onAnalyzeUncalibratedSelected={onAnalyzeUncalibratedSelected}
        onDeleteSelected={onDeleteSelected}
        onAdjustVolumeSelected={onAdjustVolumeSelected}
      />
      <DeleteAllModal
        active={isDeleteAllOpen}
        close={closeDeleteAllModal}
        confirmDeleteAll={confirmDeleteAll}
      />
    </>
  );
};

export default Playlist;
