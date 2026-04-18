import MsgType from "../../constants/msgType";
import MPlaylistItem from "../../models/MPlaylistItem";
import styles from "./Playlist.module.css";
interface props {
  item: MPlaylistItem;
  isPlaying: boolean;
  IPlaying: boolean;
  onToggleSelected: (itemId: string) => void;
  selected: boolean;
  onOpenInfo: (itemId: string) => void;
  onPlayItem: (itemId: string) => void;
}
const PlaylistItem = ({
  item,
  isPlaying,
  IPlaying,
  onToggleSelected,
  selected,
  onOpenInfo,
  onPlayItem,
}: props) => {
  const isActivePlayback = isPlaying && IPlaying;

  const onPlay = () => {
    if (isActivePlayback) {
      chrome.runtime.sendMessage({ name: MsgType.PauseVideo });
    } else {
      onPlayItem(item.id);
      chrome.runtime.sendMessage({ name: MsgType.PlayVideo, item: item });
    }
  };
  return (
    <div
      className={`${styles["playlist-item-container"]} ${
        IPlaying && styles["playlist-item-highlight"]
      }`}
    >
      <div className={styles["state-container"]}>
        <label className={styles["playlist-item-checkbox"]}>
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Select ${item.title}`}
            onChange={() => {
              onToggleSelected(item.id);
            }}
          />
        </label>
      </div>
      <div
        className={styles["info-container"]}
        onClick={() => {
          onOpenInfo(item.id);
        }}
      >
        <div className={styles["title-container"]}>
          <p className={`${styles["title"]} line-clamp-2`}>{item.title}</p>
        </div>
        <div className={styles["channel-name"]}>{item.channelName}</div>
      </div>
      <div className={styles["play-container"]}>
        <button type="button" className={styles["play-button"]} onClick={onPlay}>
          {isActivePlayback ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              preserveAspectRatio="xMidYMid meet"
              viewBox="0 0 32 32"
            >
              <path
                fill="white"
                d="M12 6h-2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm10 0h-2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              preserveAspectRatio="xMidYMid meet"
              viewBox="0 0 384 512"
            >
              <path
                fill="white"
                d="M361 215c14.3 8.8 23 24.3 23 41s-8.7 32.2-23 40.1l-287.97 176c-14.82 9.9-33.37 10.3-48.51 1.8A48.02 48.02 0 0 1 0 432V80a48.02 48.02 0 0 1 24.52-41.87a48.019 48.019 0 0 1 48.51.91L361 215z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default PlaylistItem;
