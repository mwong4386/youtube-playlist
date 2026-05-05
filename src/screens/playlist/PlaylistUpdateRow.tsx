import type MPlaylistItem from "../../models/MPlaylistItem";
import styles from "./Playlist.module.css";

interface Props {
  items: MPlaylistItem[];
  onAdd: (itemId: string) => void;
  onDismiss: (itemId: string) => void;
}

const PlaylistUpdateRow = ({ items, onAdd, onDismiss }: Props) => {
  if (items.length === 0) {
    return null;
  }

  const label = `${items.length} new ${
    items.length === 1 ? "video" : "videos"
  } found`;

  return (
    <div className={styles["playlist-update-group"]} role="status">
      <div className={styles["playlist-update-summary"]}>
        <p className={styles["playlist-update-summary-title"]}>{label}</p>
        <p className={styles["playlist-update-detail"]}>
          From tracked YouTube playlist
        </p>
      </div>
      {items.map((item) => (
        <div className={styles["playlist-update-row"]} key={item.id}>
          <div className={styles["playlist-update-copy"]}>
            <p className={styles["playlist-update-title"]}>{item.title}</p>
            <p className={styles["playlist-update-detail"]}>
              {item.channelName}
            </p>
          </div>
          <div className={styles["playlist-update-actions"]}>
            <button type="button" onClick={() => onAdd(item.id)}>
              Add
            </button>
            <button type="button" onClick={() => onDismiss(item.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlaylistUpdateRow;
