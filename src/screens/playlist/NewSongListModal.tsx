import { useEffect, useState } from "react";
import Modal from "../modal/Modal";
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
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <h2 className={styles.title}>Create song list</h2>
            <p className={styles.subtitle}>
              Give your list a name so you can switch between saved song groups.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={close}
            aria-label="Close create song list"
          >
            x
          </button>
        </div>
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
