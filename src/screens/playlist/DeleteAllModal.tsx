import Modal from "../modal/Modal";
import ModalChromeHeader from "../modal/ModalChromeHeader";
import modalStyles from "../modal/Modal.module.css";
import styles from "./Playlist.module.css";

interface Props {
  active: boolean;
  close: () => void;
  confirmDeleteAll: () => void;
}

const DeleteAllModal = ({ active, close, confirmDeleteAll }: Props) => {
  return (
    <Modal active={active} close={close}>
      <div className={modalStyles["chrome-panel"]}>
        <ModalChromeHeader
          title="Delete all songs"
          subtitle="This will remove every song from your playlist."
          closeLabel="Close delete all confirmation"
          onClose={close}
        />
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
