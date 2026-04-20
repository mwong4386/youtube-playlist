import { useState, useEffect } from "react";
import Modal from "../modal/Modal";
import styles from "./Playlist.module.css";

interface Props {
  active: boolean;
  close: () => void;
  selectedCount: number;
  selectedUncalibratedCount: number;
  firstSelectedItemVolume?: number;
  onAnalyzeSelected: () => void;
  onAnalyzeUncalibratedSelected: () => void;
  onDeleteSelected: () => void;
  onAdjustVolumeSelected: (multiplier: number) => void;
}

const SelectionActionsModal = ({
  active,
  close,
  selectedCount,
  selectedUncalibratedCount,
  firstSelectedItemVolume,
  onAnalyzeSelected,
  onAnalyzeUncalibratedSelected,
  onDeleteSelected,
  onAdjustVolumeSelected,
}: Props) => {
  const [view, setView] = useState<"menu" | "volume">("menu");
  const [multiplier, setMultiplier] = useState<number>(1);

  useEffect(() => {
    if (!active) {
      setView("menu");
      setMultiplier(1);
    }
  }, [active]);

  const previewNewVolume =
    firstSelectedItemVolume !== undefined
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(Number((firstSelectedItemVolume * multiplier).toPrecision(12))),
          ),
        )
      : null;

  const handleApplyVolume = () => {
    onAdjustVolumeSelected(multiplier);
  };

  return (
    <Modal active={active} close={close}>
      <div className={styles["selection-actions-modal"]}>
        <div className={styles["selection-actions-modal-header"]}>
          {view === "volume" ? (
            <button
              type="button"
              className={styles["selection-actions-back-button"]}
              onClick={() => setView("menu")}
              aria-label="Back to actions menu"
            >
              ←
            </button>
          ) : (
            <p className={styles["selection-actions-modal-text"]}>
              Actions for {selectedCount} selected
              {selectedCount === 1 ? " song" : " songs"}
            </p>
          )}
          <p className={styles["selection-actions-modal-title"]}>
            {view === "volume" ? "Adjust Volume" : ""}
          </p>
          <button
            type="button"
            className={styles["selection-actions-close-button"]}
            onClick={close}
            aria-label="Close selected song actions"
          >
            x
          </button>
        </div>

        {view === "menu" ? (
          <div className={styles["selection-actions-modal-actions"]}>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={onAnalyzeSelected}
            >
              Analyze Timing
            </button>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={onAnalyzeUncalibratedSelected}
              disabled={selectedUncalibratedCount === 0}
            >
              Analyze Uncalibrated
            </button>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={() => setView("volume")}
            >
              Adjust Volume Ratio
            </button>
            <button
              type="button"
              className={styles["selection-actions-delete-button"]}
              onClick={onDeleteSelected}
            >
              Delete Songs
            </button>
            <button
              type="button"
              className={styles["selection-actions-cancel-button"]}
              onClick={close}
            >
              Cancel
            </button>
          </div>
        ) : (
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
              />
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                className={styles["selection-actions-volume-slider"]}
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
        )}
      </div>
    </Modal>
  );
};

export default SelectionActionsModal;
