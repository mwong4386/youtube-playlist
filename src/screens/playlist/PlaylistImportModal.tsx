import { useEffect, useRef, useState } from "react";
import type {
  PlaylistImportMode,
  PlaylistImportRequest,
} from "../../models/PlaylistImport";
import Modal from "../modal/Modal";
import styles from "./PlaylistImportModal.module.css";
import {
  DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE,
  type PlaylistImportSubmissionResult,
} from "./playlistImportResult";

interface Props {
  active: boolean;
  close: () => void;
  onSubmit: (
    request: PlaylistImportRequest
  ) => Promise<PlaylistImportSubmissionResult>;
}

const PlaylistImportModal = ({ active, close, onSubmit }: Props) => {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [mode, setMode] = useState<PlaylistImportMode>("append");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setPlaylistUrl("");
      setMode("append");
      setErrorMessage("");
      setLoading(false);
    }
  }, [active]);

  const guardedClose = () => {
    if (loading) {
      return;
    }

    close();
  };

  const submitImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await onSubmit({
        playlistUrl: playlistUrl.trim(),
        mode,
      });

      if (
        activeRequestIdRef.current === requestId &&
        active &&
        !result.ok
      ) {
        setErrorMessage(
          result.message || DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE
        );
      }
    } catch (error) {
      if (activeRequestIdRef.current === requestId && active) {
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE
        );
      }
    } finally {
      if (activeRequestIdRef.current === requestId && active) {
        setLoading(false);
      }
    }
  };

  return (
    <Modal active={active} close={guardedClose}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <h2 className={styles.title}>Import from YouTube playlist</h2>
            <p className={styles.subtitle}>
              Paste a YouTube playlist URL and choose whether to append new
              songs or replace the saved playlist.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={guardedClose}
            aria-label="Close YouTube playlist import"
            disabled={loading}
          >
            x
          </button>
        </div>
        <form className={styles.form} onSubmit={submitImport}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Playlist URL</span>
            <input
              type="url"
              value={playlistUrl}
              onChange={(event) => {
                setPlaylistUrl(event.currentTarget.value);
                setErrorMessage("");
              }}
              placeholder="https://www.youtube.com/playlist?list=..."
              className={styles.textInput}
              disabled={loading}
              required
            />
          </label>

          <div className={styles.modeGroup}>
            <span className={styles.fieldLabel}>Import mode</span>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="playlist-import-mode"
                value="append"
                checked={mode === "append"}
                onChange={() => {
                  setMode("append");
                  setErrorMessage("");
                }}
                disabled={loading}
              />
              <span className={styles.modeContent}>
                <span className={styles.modeTitle}>Append new songs</span>
                <span className={styles.modeDescription}>
                  Keep your current playlist and add any new videos that are not
                  already saved.
                </span>
              </span>
            </label>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="playlist-import-mode"
                value="replace"
                checked={mode === "replace"}
                onChange={() => {
                  setMode("replace");
                  setErrorMessage("");
                }}
                disabled={loading}
              />
              <span className={styles.modeContent}>
                <span className={styles.modeTitle}>Replace saved playlist</span>
                <span className={styles.modeDescription}>
                  Remove the current playlist and replace it with the imported
                  YouTube playlist.
                </span>
              </span>
            </label>
          </div>

          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={guardedClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={loading}
            >
              {loading ? "Importing..." : "Import"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default PlaylistImportModal;
