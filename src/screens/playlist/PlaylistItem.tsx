import MsgType from "../../constants/msgType";
import MPlaylistItem from "../../models/MPlaylistItem";
import { PauseIcon, PlayIcon } from "../icons";
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
  const rowClassName = `${styles["playlist-item-container"]} ${
    IPlaying ? styles["playlist-item-highlight"] : ""
  } ${selected ? styles["playlist-item-selected"] : ""}`.trim();
  const playButtonClassName = `${styles["play-button"]} ${
    isActivePlayback ? styles["play-button-active"] : styles["play-button-idle"]
  }`;
  const playButtonLabel = `${isActivePlayback ? "Pause" : "Play"} ${item.title}`;

  const onPlay = () => {
    if (isActivePlayback) {
      chrome.runtime.sendMessage({ name: MsgType.PauseVideo });
    } else {
      onPlayItem(item.id);
      chrome.runtime.sendMessage({ name: MsgType.PlayVideo, item: item });
    }
  };
  return (
    <div className={rowClassName}>
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
        <button
          type="button"
          className={playButtonClassName}
          aria-label={playButtonLabel}
          onClick={onPlay}
        >
          {isActivePlayback ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
    </div>
  );
};

export default PlaylistItem;
