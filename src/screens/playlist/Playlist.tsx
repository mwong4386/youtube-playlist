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
  //playing means the video is now playing
  //playingId is not equal to playing, as the video may currently pause
  const [playing, setPlaying] = useState<boolean>(false);
  const [playingId, setPlayingIndex] = useState<string | null | undefined>();
  const [draggingElementId, setDraggingElement] = useState<string | undefined>(
    undefined
  );
  const [selectItemId, setSelectItemId] = useState<string | undefined>(
    undefined
  ); //for opening the info modal
  useEffect(() => {
    const getPlaylist = async () => {
      const list = ((await getStorage("youtube_list")) ||
        []) as MPlaylistItem[];
      setPlaylist(list);
    };
    getPlaylist();
  }, []);

  useEffect(() => {
    chrome.storage.local.get(["isPlaying", "playingItem"], (result) => {
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
        setPlaying(!!changes["isPlaying"].newValue);
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
    if (draggingElementId && draggingElementId !== toId) {
      // const oldIndex = playlist.findIndex((x) => x.id === draggingElement);
      const item = playlist.find((x) => x.id === draggingElementId);
      if (!item) return;
      const newIndex = playlist.findIndex((x) => x.id === toId);
      const temp = playlist.filter((x) => x.id !== draggingElementId);
      temp.splice(newIndex, 0, item);
      chrome.storage.sync.set({
        youtube_list: temp,
      });
    }
  };
  const onvolumechange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (playing && selectItemId === playingId) {
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
                isDragging={draggingElementId === item.id}
                setDraggingElement={setDraggingElement}
                onMoveTo={onMoveTo}
              >
                <PlaylistItem
                  key={item.id}
                  item={item}
                  isPlaying={playing}
                  IPlaying={playingId === item.id}
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
