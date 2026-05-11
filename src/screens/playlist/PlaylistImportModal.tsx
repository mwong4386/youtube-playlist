import { useEffect, useRef, useState } from "react";
import MPlaylistItem from "../../models/MPlaylistItem";
import type {
  PlaylistImportMode,
  PlaylistImportRequest,
} from "../../models/PlaylistImport";
import { parseImportedPlaylist } from "../../utils/playlistImport";
import { BackIcon } from "../icons";
import Modal from "../modal/Modal";
import ModalChromeHeader from "../modal/ModalChromeHeader";
import modalStyles from "../modal/Modal.module.css";
import styles from "./PlaylistImportModal.module.css";
import {
  DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE,
  type PlaylistImportPreviewState,
  type PlaylistImportPreviewSubmissionResult,
} from "./playlistImportResult";

interface Props {
  active: boolean;
  close: () => void;
  backToSettings: () => void;
  onImportJson: (playlist: MPlaylistItem[]) => void;
  onSubmit: (
    request: PlaylistImportRequest
  ) => Promise<PlaylistImportPreviewSubmissionResult>;
  onCommitPreview: (
    previewItems: MPlaylistItem[],
    selectedPreviewItemIds: string[],
    mode: PlaylistImportMode,
    options?: {
      trackSource?: boolean;
      playlistUrl?: string;
      sourceItems?: MPlaylistItem[];
    },
  ) => void;
}

const PlaylistImportModal = ({
  active,
  close,
  backToSettings,
  onImportJson,
  onSubmit,
  onCommitPreview,
}: Props) => {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [mode, setMode] = useState<PlaylistImportMode>("append");
  const [trackPlaylistSource, setTrackPlaylistSource] = useState(true);
  const [preview, setPreview] = useState<PlaylistImportPreviewState | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const activeRequestIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!active) {
      setPlaylistUrl("");
      setMode("append");
      setTrackPlaylistSource(true);
      setPreview(null);
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

  const openImportJsonPicker = () => {
    if (loading) {
      return;
    }

    fileInputRef.current?.click();
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

      if (activeRequestIdRef.current === requestId && active && result.ok) {
        setTrackPlaylistSource(true);
        setPreview(result.preview);
      } else if (
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

  const onFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      const { playlist: importedPlaylist, error } =
        parseImportedPlaylist(content);

      if (importedPlaylist) {
        onImportJson(importedPlaylist);
        close();
      } else if (error) {
        setErrorMessage(error);
      }

      event.currentTarget.value = "";
    });
    reader.readAsText(file, "UTF-8");
  };

  const selectedCount = preview?.selectedItemIds.length ?? 0;
  const allPreviewItemsSelected =
    !!preview && preview.items.length > 0 && selectedCount === preview.items.length;

  const togglePreviewItem = (itemId: string) => {
    setPreview((currentPreview) => {
      if (!currentPreview) {
        return currentPreview;
      }

      const selectedItemIds = currentPreview.selectedItemIds.includes(itemId)
        ? currentPreview.selectedItemIds.filter((selectedId) => selectedId !== itemId)
        : [...currentPreview.selectedItemIds, itemId];

      return {
        ...currentPreview,
        selectedItemIds,
      };
    });
  };

  const toggleAllPreviewItems = () => {
    setPreview((currentPreview) => {
      if (!currentPreview) {
        return currentPreview;
      }

      return {
        ...currentPreview,
        selectedItemIds:
          currentPreview.selectedItemIds.length === currentPreview.items.length
            ? []
            : currentPreview.items.map((item) => item.id),
      };
    });
  };

  const backToImportForm = () => {
    setPreview(null);
    setErrorMessage("");
  };

  const onHeaderBack = () => {
    if (loading) {
      return;
    }

    if (preview) {
      backToImportForm();
      return;
    }

    backToSettings();
  };

  const commitPreview = () => {
    if (!preview || preview.selectedItemIds.length === 0) {
      return;
    }

    onCommitPreview(preview.items, preview.selectedItemIds, preview.mode, {
      trackSource: trackPlaylistSource,
      playlistUrl,
      sourceItems: preview.sourceItems,
    });
  };

  return (
    <Modal active={active} close={guardedClose}>
      <div className={styles.panel}>
        <ModalChromeHeader
          title={preview ? "Preview Import" : "Import Playlist"}
          variant="centered"
          closeIcon={<BackIcon />}
          closeLabel={preview ? "Back to import form" : "Back to settings"}
          onClose={onHeaderBack}
          closeDisabled={loading}
        />
        {preview ? (
          <div className={styles.form}>
            <section className={styles.importSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  Choose songs to {preview.mode === "replace" ? "keep" : "insert"}
                </h3>
                <p className={styles.sectionDescription}>
                  {selectedCount} of {preview.items.length} songs selected
                  {preview.skippedDuplicates > 0
                    ? `, ${preview.skippedDuplicates} duplicate songs skipped`
                    : ""}
                  .
                </p>
              </div>
              <label className={styles.previewSelectAll}>
                <input
                  type="checkbox"
                  checked={allPreviewItemsSelected}
                  onChange={toggleAllPreviewItems}
                />
                <span>Select all songs</span>
              </label>
              <label className={styles.sourceTrackingOption}>
                <input
                  type="checkbox"
                  checked={trackPlaylistSource}
                  onChange={(event) => {
                    setTrackPlaylistSource(event.currentTarget.checked);
                  }}
                />
                <span className={styles.sourceTrackingContent}>
                  <span className={styles.sourceTrackingTitle}>
                    Track this playlist for new videos
                  </span>
                  <span className={styles.sourceTrackingDescription}>
                    Save this YouTube link and check for new videos when this
                    song list opens.
                  </span>
                </span>
              </label>
              <div className={styles.previewList}>
                {preview.items.map((item) => (
                  <label className={styles.previewItem} key={item.id}>
                    <input
                      type="checkbox"
                      checked={preview.selectedItemIds.includes(item.id)}
                      onChange={() => togglePreviewItem(item.id)}
                    />
                    <span className={styles.previewItemContent}>
                      <span className={styles.previewItemTitle}>{item.title}</span>
                      <span className={styles.previewItemMeta}>
                        {item.channelName}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={backToImportForm}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={guardedClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={modalStyles["chrome-confirm-button"]}
                  onClick={commitPreview}
                  disabled={selectedCount === 0}
                >
                  Insert selected
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className={styles.form}>
          <section className={styles.importSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Import from YouTube playlist</h3>
              <p className={styles.sectionDescription}>
                Paste a YouTube playlist URL and choose whether to append new
                songs or replace the saved playlist.
              </p>
            </div>
            <form className={styles.sectionForm} onSubmit={submitImport}>
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
                  className={modalStyles["chrome-confirm-button"]}
                  disabled={loading}
                >
                  {loading ? "Loading preview..." : "Preview"}
                </button>
              </div>
            </form>
          </section>

          <section className={styles.importSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Import playlist JSON</h3>
              <p className={styles.sectionDescription}>
                Choose an exported playlist file to replace the songs in the
                current list.
              </p>
            </div>
            <input
              ref={fileInputRef}
              style={{ display: "none" }}
              type="file"
              accept="application/json"
              onChange={onFileUpload}
            />
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={openImportJsonPicker}
              disabled={loading}
            >
              Choose JSON file
            </button>
          </section>

          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PlaylistImportModal;
