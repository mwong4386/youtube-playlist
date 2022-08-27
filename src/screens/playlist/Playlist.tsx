import { useEffect, useState } from "react";
import MPlaylistItem from "../../models/PlaylistItem";
import { getStorage } from "../../utils/storage";
import PlaylistHeader from "./PlaylistHeader";
import PlaylistItem from "./PlaylistItem";
import styles from "./Playlist.module.css";
import MsgType from "../../constants/msgType";

const Playlist = () => {
  const [playlist, setPlaylist] = useState<MPlaylistItem[]>([]);

  useEffect(() => {
    const getPlaylist = async () => {
      const list = ((await getStorage("youtube_list")) ||
        []) as MPlaylistItem[];
      setPlaylist(list);
    };
    getPlaylist();
  }, []);

  const onPlay = (item: MPlaylistItem) => {
    chrome.runtime.sendMessage({ name: MsgType.PlayVideo, item: item });
  };
  const onPlayAll = () => {
    chrome.runtime.sendMessage({ name: MsgType.PlayAll });
  };

  const onDeleteAll = () => {
    chrome.storage.sync.remove("youtube_list");
    setPlaylist([]);
  };

  return (
    <>
      {playlist.length === 0 ? (
        <div className={styles["empty-container"]}>
          <p className={styles["empty-message"]}>The playlist is empty</p>
        </div>
      ) : (
        <div className={styles["playlist-container"]}>
          <PlaylistHeader onPlayAll={onPlayAll} onDelete={onDeleteAll} />
          {playlist.map((item) => {
            return <PlaylistItem key={item.id} item={item} onPlay={onPlay} />;
          })}
        </div>
      )}
    </>
  );
};

export default Playlist;
