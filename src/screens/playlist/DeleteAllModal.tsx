import Modal from "../modal/Modal";
import styles from "./Playlist.module.css";

interface Props {
  active: boolean;
  close: () => void;
  confirmDeleteAll: () => void;
}

const DeleteAllModal = ({ active, close, confirmDeleteAll }: Props) => {
  return (
    <Modal active={active} close={close}>
      <div className={styles["delete-all-modal"]}>
        <div className={styles["delete-all-modal-header"]}>
          <div>
            <h2 className={styles["delete-all-modal-title"]}>Delete all songs</h2>
            <p className={styles["delete-all-modal-text"]}>
              This will remove every song from your playlist.
            </p>
          </div>
          <button
            type="button"
            className={styles["delete-all-close-button"]}
            onClick={close}
            aria-label="Close delete all confirmation"
          >
            x
          </button>
        </div>
        <div className={styles["delete-all-modal-actions"]}>
          <button
            type="button"
            className={styles["delete-all-cancel-button"]}
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles["delete-all-confirm-button"]}
            onClick={confirmDeleteAll}
          >
            Delete all
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteAllModal;
