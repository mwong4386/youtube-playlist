import Modal from "../modal/Modal";
import styles from "./Playlist.module.css";

interface Props {
  active: boolean;
  close: () => void;
  selectedCount: number;
  selectedUncalibratedCount: number;
  onAnalyzeSelected: () => void;
  onAnalyzeUncalibratedSelected: () => void;
  onDeleteSelected: () => void;
}

const SelectionActionsModal = ({
  active,
  close,
  selectedCount,
  selectedUncalibratedCount,
  onAnalyzeSelected,
  onAnalyzeUncalibratedSelected,
  onDeleteSelected,
}: Props) => {
  return (
    <Modal active={active} close={close}>
      <div className={styles["selection-actions-modal"]}>
        <div className={styles["selection-actions-modal-header"]}>
          <p className={styles["selection-actions-modal-text"]}>
            Actions for {selectedCount} selected
            {selectedCount === 1 ? " song" : " songs"}
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
      </div>
    </Modal>
  );
};

export default SelectionActionsModal;
