import { useEffect, useState } from "react";
import type AudioEqProfile from "../../models/AudioEqProfile";
import type MPlaylistItem from "../../models/MPlaylistItem";
import { BackIcon, CloseIcon } from "../icons";
import Modal from "../modal/Modal";
import modalStyles from "../modal/Modal.module.css";
import ModalChromeHeader from "../modal/ModalChromeHeader";
import styles from "./Playlist.module.css";
import {
  createGeminiEqBatchSubmission,
  createInitialGeminiEqReviewState,
  isGeminiEqActionDisabled,
  resetGeminiEqReviewState,
  type GeminiEqReviewState,
} from "./selectionActionsGeminiEqReview";

interface Props {
  active: boolean;
  close: () => void;
  selectedCount: number;
  selectedUncalibratedCount: number;
  selectedSongs: MPlaylistItem[];
  audioEqProfiles: AudioEqProfile[];
  geminiApiKey: string;
  firstSelectedItemVolume?: number;
  onAnalyzeSelected: () => void;
  onAnalyzeUncalibratedSelected: () => void;
  onDeleteSelected: () => void;
  onAdjustVolumeSelected: (multiplier: number) => void;
  onAdjustSelectedSongEqWithGemini: (userRequest: string) => void;
}

const SelectionActionsModal = ({
  active,
  close,
  selectedCount,
  selectedUncalibratedCount,
  selectedSongs,
  audioEqProfiles,
  geminiApiKey,
  firstSelectedItemVolume,
  onAnalyzeSelected,
  onAnalyzeUncalibratedSelected,
  onDeleteSelected,
  onAdjustVolumeSelected,
  onAdjustSelectedSongEqWithGemini,
}: Props) => {
  const [view, setView] = useState<"menu" | "timing" | "volume" | "geminiEq">(
    "menu",
  );
  const [multiplier, setMultiplier] = useState<number>(1);
  const [geminiEqReview, setGeminiEqReview] = useState<GeminiEqReviewState>(
    createInitialGeminiEqReviewState,
  );
  const hasGeminiApiKey = geminiApiKey.trim().length > 0;

  useEffect(() => {
    if (!active) {
      setView("menu");
      setMultiplier(1);
      setGeminiEqReview(resetGeminiEqReviewState());
    }
  }, [active]);

  useEffect(() => {
    if (!hasGeminiApiKey && (view === "timing" || view === "geminiEq")) {
      setView("menu");
    }
  }, [hasGeminiApiKey, view]);

  const previewNewVolume =
    firstSelectedItemVolume !== undefined
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              Number((firstSelectedItemVolume * multiplier).toPrecision(12)),
            ),
          ),
        )
      : null;

  const handleApplyVolume = () => {
    onAdjustVolumeSelected(multiplier);
  };

  const handleGenerateGeminiEq = () => {
    const submission = createGeminiEqBatchSubmission({
      state: geminiEqReview,
      selectedSongs,
      audioEqProfiles,
      requestToken: 1,
    });

    setGeminiEqReview(submission.state);
    if (submission.runtimeRequests.length === 0) {
      return;
    }

    onAdjustSelectedSongEqWithGemini(submission.state.request);
  };

  const isMenuView = view === "menu";
  const title = isMenuView
    ? `${selectedCount} ${selectedCount === 1 ? "Song" : "Songs"} Selected`
    : view === "timing"
      ? "Analyze Timing"
      : view === "volume"
        ? "Adjust Volume"
        : view === "geminiEq"
          ? "Gemini EQ"
          : "Selected Songs";

  return (
    <Modal active={active} close={close}>
      <div
        className={`${modalStyles["chrome-panel"]} ${styles["selection-actions-modal"]}`}
      >
        <ModalChromeHeader
          title={title}
          titleClassName={
            isMenuView ? styles["selection-actions-menu-title"] : undefined
          }
          closeIcon={isMenuView ? undefined : <BackIcon />}
          closeLabel={
            isMenuView ? "Close selected song actions" : "Back to actions menu"
          }
          onClose={isMenuView ? close : () => setView("menu")}
          action={
            isMenuView ? undefined : (
              <button
                type="button"
                className={modalStyles["chrome-close-button"]}
                onClick={close}
                aria-label="Close selected song actions"
                title="Close selected song actions"
              >
                <CloseIcon />
              </button>
            )
          }
        />

        {view === "menu" ? (
          <div className={styles["selection-actions-modal-actions"]}>
            {hasGeminiApiKey ? (
              <button
                type="button"
                className={styles["selection-actions-analyze-button"]}
                onClick={() => setView("timing")}
              >
                Detect Song Timing
              </button>
            ) : null}
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={() => setView("volume")}
            >
              Adjust Volume Ratio
            </button>
            {hasGeminiApiKey ? (
              <button
                type="button"
                className={styles["selection-actions-analyze-button"]}
                onClick={() => setView("geminiEq")}
                disabled={isGeminiEqActionDisabled(selectedCount)}
              >
                Adjust EQ by Gemini
              </button>
            ) : null}
            <button
              type="button"
              className={styles["selection-actions-delete-button"]}
              onClick={onDeleteSelected}
            >
              Delete Songs
            </button>
          </div>
        ) : view === "timing" ? (
          <div className={styles["selection-actions-modal-actions"]}>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={onAnalyzeSelected}
            >
              All Selected
            </button>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={onAnalyzeUncalibratedSelected}
              disabled={selectedUncalibratedCount === 0}
            >
              Uncalibrated Only
            </button>
          </div>
        ) : view === "volume" ? (
          <div className={styles["selection-actions-volume-form"]}>
            <div className={styles["selection-actions-volume-input-row"]}>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                className={styles["selection-actions-volume-multiplier-input"]}
                aria-label="Volume multiplier"
              />
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                className={styles["selection-actions-volume-slider"]}
                aria-label="Volume multiplier slider"
              />
            </div>

            {previewNewVolume !== null && (
              <p className={styles["selection-actions-volume-preview"]}>
                Example: {firstSelectedItemVolume} → {previewNewVolume}
              </p>
            )}

            <button
              type="button"
              className={styles["selection-actions-volume-submit-button"]}
              onClick={handleApplyVolume}
            >
              Apply to {selectedCount} {selectedCount === 1 ? "song" : "songs"}
            </button>
          </div>
        ) : (
          <div className={styles["selection-actions-gemini-eq-form"]}>
            {selectedSongs.length === 1 && selectedSongs[0].title && (
              <p className={styles["selection-actions-gemini-eq-song-title"]}>
                {selectedSongs[0].title}
              </p>
            )}
            <textarea
              value={geminiEqReview.request}
              onChange={(event) =>
                setGeminiEqReview((currentState) => ({
                  ...currentState,
                  request: event.target.value,
                }))
              }
              className={styles["selection-actions-gemini-eq-textarea"]}
              placeholder="Describe an optional EQ preference"
              aria-label="Describe an optional EQ preference"
            />
            <button
              type="button"
              className={styles["selection-actions-volume-submit-button"]}
              onClick={handleGenerateGeminiEq}
              disabled={geminiEqReview.isLoading}
            >
              Generate and apply
            </button>

            {geminiEqReview.status && selectedSongs.length === 0 ? (
              <p className={styles["selection-actions-volume-preview"]}>
                {geminiEqReview.status}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SelectionActionsModal;
