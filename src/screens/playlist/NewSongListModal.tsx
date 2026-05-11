import { useEffect, useState } from "react";
import Modal from "../modal/Modal";
import ModalChromeHeader from "../modal/ModalChromeHeader";
import styles from "./NewSongListModal.module.css";

interface Props {
  active: boolean;
  close: () => void;
  errorMessage: string;
  onSubmit: (name: string) => void;
}

const NewSongListModal = ({
  active,
  close,
  errorMessage,
  onSubmit,
}: Props) => {
  const [songListName, setSongListName] = useState("");

  useEffect(() => {
    if (!active) {
      setSongListName("");
    }
  }, [active]);

  const onCreateList = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(songListName);
  };

  return (
    <Modal active={active} close={close}>
      <div className={styles.panel}>
        <ModalChromeHeader
          title="Create song list"
          variant="centered"
          subtitle="Give your list a name so you can switch between saved song groups."
          closeLabel="Close create song list"
          onClose={close}
        />
        <form className={styles.form} onSubmit={onCreateList}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Song list name</span>
            <input
              type="text"
              value={songListName}
              onChange={(event) => {
                setSongListName(event.currentTarget.value);
              }}
              placeholder="Late night set"
              className={styles.textInput}
              autoFocus
              required
            />
          </label>
          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={close}
            >
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              Create list
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default NewSongListModal;
