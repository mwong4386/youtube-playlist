import MsgType from "../../constants/msgType";
import MPlaylistItem from "../../models/PlaylistItem";
import styles from "./Playlist.module.css";
interface props {
  item: MPlaylistItem;
  onPlay: (item: MPlaylistItem) => void;
}
const PlaylistItem = ({ item, onPlay }: props) => {
  // const onPlay = () => {
  //   chrome.tabs.update({ url: item.url }, (tab) => {
  //     console.log(tab);
  //   });
  //   // chrome.runtime.sendMessage({ name: MsgType.PlayVideo });
  // };
  return (
    <div className={styles["playlist-item-container"]}>
      <div className={styles["info-container"]}>
        <div className={styles["title-container"]}>
          <p className={`${styles["title"]} line-clamp-2`}>{item.title}</p>
        </div>
        <div className={styles["channel-name"]}>{item.channelName}</div>
        <div>{item.videoId}</div>
      </div>
      <div className={styles["play-container"]}>
        <button
          className={styles["play-button"]}
          onClick={() => {
            onPlay(item);
          }}
        >
          <img src="./assets/play30.png" />
        </button>
      </div>
    </div>
  );
};

export default PlaylistItem;
