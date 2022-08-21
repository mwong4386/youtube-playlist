import { useEffect, useState } from "react";
import MPlaylistItem from "../../models/PlaylistItem";
import { getStorage } from "../../utils/storage";
import PlaylistHeader from "./PlaylistHeader";
import PlaylistItem from "./PlaylistItem";
import styles from "./Playlist.module.css";

const Playlist = () => {
  const [playlist, setPlaylist] = useState<MPlaylistItem[]>([]);
  const [tabId, setTabId] = useState<number>();
  chrome.storage.local.get("tabId", (result) => {
    setTabId(result["tabId"]);
  });
  useEffect(() => {
    const getPlaylist = async () => {
      const list = ((await getStorage("youtube_list")) ||
        []) as MPlaylistItem[];
      setPlaylist(list);
    };
    getPlaylist();
  }, []);

  const onPlay = (item: MPlaylistItem) => {
    const url = `${item.url}/?v=${item.videoId}${
      item.timestamp ? "&t=" + item.timestamp : ""
    }`;
    console.log(item.videoId);
    if (tabId == null) {
      chrome.tabs.create({ url: url }, (tab) => {
        chrome.storage.local.set({ tabId: tab?.id });
        setTabId(tab?.id);
      });
    } else {
      chrome.tabs.update(tabId, { url: url }, () => {
        if (chrome.runtime.lastError) {
          chrome.tabs.create({ url: url }, (tab) => {
            chrome.storage.local.set({ tabId: tab?.id });
            setTabId(tab?.id);
          });
        }
      });
    }
    // chrome.runtime.sendMessage({ name: MsgType.PlayVideo });
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
        <>
          <PlaylistHeader onDelete={onDeleteAll} />
          {playlist.map((item) => {
            return <PlaylistItem item={item} onPlay={onPlay} />;
          })}
        </>
      )}
    </>
  );
};

export default Playlist;
