import styles from "./Playlist.module.css";

interface props {
  onPlayAll: () => void;
  onDelete: () => void;
}
const PlaylistHeader = ({ onPlayAll, onDelete }: props) => {
  return (
    <div className={styles["header-container"]}>
      <div className={styles["header-left-container"]}>
        <button onClick={onPlayAll} className={styles["header-button"]}>
          <img
            className={styles["header-button-icon"]}
            src="./assets/play30.png"
          />
        </button>
      </div>
      <div className={styles["header-right-container"]}>
        <button onClick={onDelete} className={styles["header-button"]}>
          <img
            className={styles["header-button-icon"]}
            src="./assets/trash.svg"
          />
        </button>
      </div>
    </div>
  );
};

export default PlaylistHeader;
