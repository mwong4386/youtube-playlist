import { useEffect, useState } from "react";
import MPlaylistItem from "../../models/PlaylistItem";
import { getStorage } from "../../utils/syncStorage";
import PlaylistHeader from "./PlaylistHeader";
import PlaylistItem from "./PlaylistItem";
import styles from "./Playlist.module.css";

const Playlist = () => {
  const [playlist, setPlaylist] = useState<MPlaylistItem[]>([]);
  const [playing, setPlaying] = useState<boolean>(false);
  const [playingIndex, setPlayingIndex] = useState<string | undefined>();
  useEffect(() => {
    const getPlaylist = async () => {
      const list = ((await getStorage("youtube_list")) ||
        []) as MPlaylistItem[];
      setPlaylist(list);
    };
    getPlaylist();
  }, []);

  useEffect(() => {
    chrome.storage.local.get(["isPlaying", "playingIndex"], (result) => {
      if (result["playingIndex"]) setPlayingIndex(result["playingIndex"]);
      if (result["isPlaying"]) setPlaying(result["isPlaying"]);
    });
  }, []);

  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: "sync" | "local" | "managed" | "session"
    ) => {
      console.log(changes);
      if ("playingIndex" in changes) {
        setPlayingIndex(changes["playingIndex"].newValue);
      }
      if ("isPlaying" in changes) {
        setPlaying(changes["isPlaying"].newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

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
          <PlaylistHeader onDelete={onDeleteAll} />
          {playlist.map((item) => {
            return (
              <PlaylistItem
                key={item.id}
                item={item}
                isPlaying={playing}
                IPlaying={playingIndex === item.id}
              />
            );
          })}
        </div>
      )}
    </>
  );
};

export default Playlist;
