import React from "react";
import Modal from "../modal/Modal";
import modalStyles from "../modal/Modal.module.css";
import ModalChromeHeader from "../modal/ModalChromeHeader";
import styles from "./GeminiApprovalModal.module.css";

interface Props {
  active: boolean;
  queue: any[];
  onConfirm: () => void;
  onCancel: () => void;
}

const GeminiApprovalModal = ({
  active,
  queue,
  onConfirm,
  onCancel,
}: Props) => {
  const getTitle = () => {
    if (queue.length > 1) {
      return `Approve ${queue.length} Gemini Actions?`;
    }
    const { actionName } = queue[0];
    switch (actionName) {
      case "add_songs_to_playlist":
        return "Add Songs to Playlist?";
      case "create_playlist":
        return "Create New Playlist?";
      default:
        return "Approve Gemini Action?";
    }
  };

  const renderDetails = () => {
    // Collect all songs across all requests in the queue
    const allSongs: any[] = [];
    const targetPlaylists = new Set<string>();
    const newPlaylists = new Set<string>();

    queue.forEach((item) => {
      if (item.actionName === "add_songs_to_playlist") {
        if (Array.isArray(item.params.songs)) {
          allSongs.push(...item.params.songs);
        }
        if (item.params.targetPlaylistName) {
          targetPlaylists.add(item.params.targetPlaylistName);
        }
      } else if (item.actionName === "create_playlist") {
        if (item.params.name) {
          newPlaylists.add(item.params.name);
        }
      }
    });

    if (allSongs.length > 0 || newPlaylists.size > 0) {
      const playlistInfo =
        targetPlaylists.size === 1
          ? `to "${Array.from(targetPlaylists)[0]}"`
          : targetPlaylists.size > 1
            ? `to ${targetPlaylists.size} playlists`
            : "";

      return (
        <>
          {newPlaylists.size > 0 && (
            <p className={styles.description}>
              Gemini wants to create{" "}
              {newPlaylists.size === 1
                ? `a new playlist: "${Array.from(newPlaylists)[0]}"`
                : `${newPlaylists.size} new playlists: ${Array.from(
                    newPlaylists,
                  )
                    .map((p) => `"${p}"`)
                    .join(", ")}`}
              .
            </p>
          )}
          {allSongs.length > 0 && (
            <>
              <p className={styles.description}>
                Gemini wants to add {allSongs.length}{" "}
                {allSongs.length === 1 ? "song" : "songs"} {playlistInfo}.
              </p>
              <ul className={styles.songList}>
                {allSongs.slice(0, 50).map((song: any, index: number) => (
                  <li key={index} className={styles.songItem}>
                    {song.title}
                  </li>
                ))}
                {allSongs.length > 50 && (
                  <li className={styles.moreItems}>
                    ...and {allSongs.length - 50} more
                  </li>
                )}
              </ul>
            </>
          )}
        </>
      );
    }

    return (
      <div className={styles.genericQueue}>
        {queue.map((item, index) => (
          <div key={index} className={styles.queueItem}>
            <strong>{item.actionName}</strong>
            <pre>{JSON.stringify(item.params, null, 2)}</pre>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal active={active} close={onCancel}>
      <div className={modalStyles["chrome-panel"]}>
        <ModalChromeHeader
          title={getTitle()}
          variant="centered"
          onClose={onCancel}
        />
        <div className={styles.content}>
          {renderDetails()}
          <div className={styles.actions}>
            <button
              className={styles.cancelButton}
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className={styles.confirmButton}
              type="button"
              onClick={onConfirm}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default GeminiApprovalModal;
