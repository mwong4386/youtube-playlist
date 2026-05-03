import type { Dispatch, DragEvent, SetStateAction } from "react";
import type MPlaylistItem from "../../models/MPlaylistItem";
import Draggable from "../draggable/Draggable";
import AnalyzeImportBannerPanel from "./AnalyzeImportBannerPanel";
import styles from "./Playlist.module.css";
import PlaylistItem from "./PlaylistItem";

interface Props {
  playlist: MPlaylistItem[];
  isSelectionMode: boolean;
  draggingItemId?: string;
  playing: boolean;
  playingId?: string;
  selectedItemIds: string[];
  showAnalyzeImportBanner: boolean;
  showGeminiEqBatchBanner: boolean;
  analyzeImportBannerTitle?: string;
  analyzeImportBannerDetail?: string;
  analyzeImportBannerActionLabel?: string;
  analyzeImportBannerDismissible?: boolean;
  geminiEqBatchBannerTitle?: string;
  geminiEqBatchBannerDetail?: string;
  geminiEqBatchBannerDismissible?: boolean;
  onStopAnalyzeImportBatch: () => void;
  onDismissAnalyzeImportBanner: () => void;
  onDismissGeminiEqBatchBanner: () => void;
  onToggleSelected: (itemId: string) => void;
  onOpenInfoModal: (itemId: string) => void;
  onOpenPlaybackModal: (itemId: string) => void;
  onMoveTo: (toId: string) => void;
  onPlaylistContainerDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onPlaylistContainerDrop: (event: DragEvent<HTMLDivElement>) => void;
  setDraggingItemId: Dispatch<SetStateAction<string | undefined>>;
}

const PlaylistContent = ({
  playlist,
  isSelectionMode,
  draggingItemId,
  playing,
  playingId,
  selectedItemIds,
  showAnalyzeImportBanner,
  showGeminiEqBatchBanner,
  analyzeImportBannerTitle,
  analyzeImportBannerDetail,
  analyzeImportBannerActionLabel,
  analyzeImportBannerDismissible,
  geminiEqBatchBannerTitle,
  geminiEqBatchBannerDetail,
  geminiEqBatchBannerDismissible,
  onStopAnalyzeImportBatch,
  onDismissAnalyzeImportBanner,
  onDismissGeminiEqBatchBanner,
  onToggleSelected,
  onOpenInfoModal,
  onOpenPlaybackModal,
  onMoveTo,
  onPlaylistContainerDragOver,
  onPlaylistContainerDrop,
  setDraggingItemId,
}: Props) => {
  if (playlist.length === 0) {
    return (
      <div className={styles["empty-container"]}>
        <p className={styles["empty-message"]}>The playlist is empty</p>
      </div>
    );
  }

  return (
    <div
      className={styles["playlist-container"]}
      onDragOver={onPlaylistContainerDragOver}
      onDrop={onPlaylistContainerDrop}
    >
      {showAnalyzeImportBanner ? (
        <AnalyzeImportBannerPanel
          title={analyzeImportBannerTitle}
          detail={analyzeImportBannerDetail}
          actionLabel={analyzeImportBannerActionLabel}
          dismissible={analyzeImportBannerDismissible}
          onStop={onStopAnalyzeImportBatch}
          onDismiss={onDismissAnalyzeImportBanner}
        />
      ) : null}
      {showGeminiEqBatchBanner ? (
        <AnalyzeImportBannerPanel
          title={geminiEqBatchBannerTitle}
          detail={geminiEqBatchBannerDetail}
          dismissible={geminiEqBatchBannerDismissible}
          onStop={onStopAnalyzeImportBatch}
          onDismiss={onDismissGeminiEqBatchBanner}
        />
      ) : null}
      {playlist.map((item) => {
        const playlistItem = (
          <PlaylistItem
            key={item.id}
            item={item}
            isPlaying={playing}
            IPlaying={playingId === item.id}
            onToggleSelected={onToggleSelected}
            selected={selectedItemIds.includes(item.id)}
            onOpenInfo={onOpenInfoModal}
            onPlayItem={onOpenPlaybackModal}
          />
        );

        return isSelectionMode ? (
          playlistItem
        ) : (
          <Draggable
            key={item.id}
            id={item.id}
            isDragging={draggingItemId === item.id}
            setDraggingElement={setDraggingItemId}
            onMoveTo={onMoveTo}
          >
            {playlistItem}
          </Draggable>
        );
      })}
    </div>
  );
};

export default PlaylistContent;
