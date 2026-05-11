import Modal from "../modal/Modal";
import ModalChromeHeader from "../modal/ModalChromeHeader";
import modalStyles from "../modal/Modal.module.css";
import styles from "./Playlist.module.css";

interface Props {
  active: boolean;
  close: () => void;
  confirmDeletePlaylist: () => void;
}

const DeleteAllModal = ({ active, close, confirmDeletePlaylist }: Props) => {
  return (
    <Modal active={active} close={close}>
      <div className={modalStyles["chrome-panel"]}>
        <ModalChromeHeader
          title="Delete playlist"
          variant="centered"
          subtitle="This will permanently delete this playlist and all its songs."
          closeLabel="Close delete playlist confirmation"
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
            onClick={confirmDeletePlaylist}
          >
            Delete playlist
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteAllModal;
