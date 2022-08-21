import styles from "./Playlist.module.css";

interface props {
  onDelete: () => void;
}
const PlaylistHeader = ({ onDelete }: props) => {
  return (
    <div className={styles["header-container"]}>
      <button onClick={onDelete} className={styles["delete-button"]}>
        <img className={styles["delete-icon"]} src="./assets/trash.svg" />
      </button>
    </div>
  );
};

export default PlaylistHeader;
