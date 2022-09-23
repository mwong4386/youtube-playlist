import { useEffect, useState } from "react";
import MPlaylistItem from "../../models/MPlaylistItem";
import { getStorage } from "../../utils/syncStorage";
import PlaylistHeader from "./PlaylistHeader";
import PlaylistItem from "./PlaylistItem";
import styles from "./Playlist.module.css";
import Draggable from "../draggable/Draggable";
import InfoModal from "../modal/InfoModal";
import MsgType from "../../constants/msgType";

const Playlist = () => {
  const [playlist, setPlaylist] = useState<MPlaylistItem[]>([]);
  const [playing, setPlaying] = useState<boolean>(false);
  const [playingIndex, setPlayingIndex] = useState<string | null | undefined>();
  const [draggingElement, setDraggingElement] = useState<string | undefined>(
    undefined
  );
  const [selectItemId, setSelectItemId] = useState<string | undefined>(
    undefined
  );
  useEffect(() => {
    const getPlaylist = async () => {
      const list = ((await getStorage("youtube_list")) ||
        []) as MPlaylistItem[];
      console.log(list);
      setPlaylist(list);
    };
    getPlaylist();
  }, []);

  useEffect(() => {
    console.log("on loaded");
    chrome.storage.local.get(["isPlaying", "playingItem"], (result) => {
      console.log(result);
      if (result["playingItem"]) setPlayingIndex(result["playingItem"]?.id);
      if (result["isPlaying"]) setPlaying(result["isPlaying"]);
    });
  }, []);

  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: "sync" | "local" | "managed" | "session"
    ) => {
      console.log("changes");
      console.log(changes);
      if ("playingItem" in changes) {
        setPlayingIndex(changes["playingItem"].newValue?.id);
      }
      if ("isPlaying" in changes) {
        setPlaying(changes["isPlaying"].newValue);
      }
      if ("youtube_list" in changes) {
        setPlaylist(changes["youtube_list"].newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const onDeleteAll = () => {
    chrome.storage.sync.remove("youtube_list");
  };

  const onSave = (
    id: string,
    timestamp: number,
    endTimestamp: number | undefined,
    volume: number
  ) => {
    const item = playlist.find((x) => x.id === id);
    if (!item) return;
    item.timestamp = timestamp;
    item.endTimestamp = endTimestamp;
    item.volume = volume;
    chrome.storage.sync.set({
      youtube_list: playlist,
    });
  };
  const onMoveTo = (toId: string) => {
    if (draggingElement && draggingElement !== toId) {
      // const oldIndex = playlist.findIndex((x) => x.id === draggingElement);
      const item = playlist.find((x) => x.id === draggingElement);
      if (!item) return;
      const newIndex = playlist.findIndex((x) => x.id === toId);
      const temp = playlist.filter((x) => x.id !== draggingElement);
      temp.splice(newIndex, 0, item);
      chrome.storage.sync.set({
        youtube_list: temp,
      });
    }
  };
  const onvolumechange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (playing && selectItemId === playingIndex) {
      chrome.runtime.sendMessage({
        name: MsgType.VolumeChange,
        volume: event.currentTarget.value,
      });
    }
  };
  return (
    <>
      <PlaylistHeader playlist={playlist} onDelete={onDeleteAll} />
      {playlist.length === 0 ? (
        <div className={styles["empty-container"]}>
          <p className={styles["empty-message"]}>The playlist is empty</p>
        </div>
      ) : (
        <div className={styles["playlist-container"]}>
          {playlist.map((item) => {
            return (
              <Draggable
                key={item.id}
                id={item.id}
                isDragging={draggingElement === item.id}
                setDraggingElement={setDraggingElement}
                onMoveTo={onMoveTo}
              >
                <PlaylistItem
                  key={item.id}
                  item={item}
                  isPlaying={playing}
                  IPlaying={playingIndex === item.id}
                  selectItemId={setSelectItemId}
                />
              </Draggable>
            );
          })}
          <InfoModal
            active={!!selectItemId}
            close={() => {
              setSelectItemId(undefined);
            }}
            onvolumechange={onvolumechange}
            save={onSave}
            item={playlist.find((x) => x.id === selectItemId)}
          />
        </div>
      )}
    </>
  );
};

export default Playlist;
