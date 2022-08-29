import MsgType from "../../constants/msgType";
import MPlaylistItem from "../../models/PlaylistItem";
import styles from "./Playlist.module.css";
interface props {
  item: MPlaylistItem;
  isPlaying: boolean;
  IPlaying: boolean;
}
const PlaylistItem = ({ item, isPlaying, IPlaying }: props) => {
  const onPlay = () => {
    if (isPlaying && IPlaying) {
      chrome.runtime.sendMessage({ name: MsgType.PauseVideo });
    } else {
      chrome.runtime.sendMessage({ name: MsgType.PlayVideo, item: item });
    }
  };
  return (
    <div className={styles["playlist-item-container"]}>
      <div className={styles["state-container"]}>
        {IPlaying && <img src="./assets/audio16.png" />}
      </div>
      <div className={styles["info-container"]}>
        <div className={styles["title-container"]}>
          <p className={`${styles["title"]} line-clamp-2`}>{item.title}</p>
        </div>
        <div className={styles["channel-name"]}>{item.channelName}</div>
      </div>
      <div className={styles["play-container"]}>
        <button className={styles["play-button"]} onClick={onPlay}>
          <img
            src={
              isPlaying && IPlaying
                ? "./assets/pause30.png"
                : "./assets/play30.png"
            }
          />
        </button>
      </div>
    </div>
  );
};

export default PlaylistItem;
