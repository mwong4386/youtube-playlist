import { useEffect, useState } from "react";
import MsgType from "../../constants/msgType";
import MPlaylistItem from "../../models/MPlaylistItem";
import { getCurrentTimestamp } from "../../utils/date";
import useActionSheet from "../actionSheet/useActionSheet";
import styles from "./Playlist.module.css";

interface props {
  onDelete: () => void;
  playlist: MPlaylistItem[];
}
const PlaylistHeader = ({ playlist, onDelete }: props) => {
  const [isPlayAll, setIsPlayAll] = useState<boolean>(false);
  const [isPIP, setIsPIP] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(false);
  const ctx = useActionSheet();
  const onPlayPauseButton = () => {
    console.log("onPlayPauseButton");
    if (isPlayAll) {
      chrome.runtime.sendMessage({ name: MsgType.PauseAll });
    } else {
      openPlayMenu();
    }
  };
  const sendPlayOrderly = () => {
    chrome.runtime.sendMessage({ name: MsgType.PlayAll });
  };
  const sendPlayRandom = () => {
    chrome.runtime.sendMessage({ name: MsgType.PlayAllRandom });
  };
  const onPlayInPicture = () => {
    chrome.runtime.sendMessage({ name: MsgType.OpenPictureInWindow });
  };

  const openPlayMenu = () => {
    ctx.setActionSheet([
      { id: 1, description: "Play Orderly", callback: sendPlayOrderly },
      { id: 2, description: "Play Randomly", callback: sendPlayRandom },
    ]);
    ctx.open();
  };

  const openMenu = () => {
    ctx.setActionSheet([
      ...(playing
        ? [
            {
              id: 1,
              description: `${isPIP ? "Hide" : "Show"} Picture in Picture`,
              callback: onPlayInPicture,
            },
          ]
        : []),
      { id: 2, description: "Import Playlist", callback: onImportJson },
      { id: 3, description: "Export Playlist", callback: onExportJson },
      { id: 4, description: "Delete All", callback: onDelete },
    ]);
    ctx.open();
  };
  const onExportJson = () => {
    var result = JSON.stringify(playlist);
    var file = new Blob([result], { type: "application/json" });
    var url = URL.createObjectURL(file);
    chrome.downloads.download({
      url: url,
      filename: `playlist_${getCurrentTimestamp()}.json`,
    });
  };
  const onImportJson = () => {
    const file = document.getElementById("uploadfile");
    file?.click();
  };

  useEffect(() => {
    console.log("isPlayAll");
    chrome.storage.local.get(["isPlayAll", "isPIP", "isPlaying"], (result) => {
      setIsPlayAll(!!result["isPlayAll"]);
      setIsPIP(!!result["isPIP"]);
      setPlaying(!!result["isPlaying"]);
    });
  }, []);

  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: "sync" | "local" | "managed" | "session"
    ) => {
      if ("isPlayAll" in changes) {
        setIsPlayAll(!!changes["isPlayAll"].newValue);
      }
      if ("isPIP" in changes) {
        setIsPIP(!!changes["isPIP"].newValue);
      }
      if ("isPlaying" in changes) {
        setPlaying(!!changes["isPlaying"].newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const onFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (files && files?.length > 0) {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          // this will then display a text file
          const content = reader.result as string;
          if (content) {
            try {
              const temp: MPlaylistItem[] = JSON.parse(content);
              if (temp.length > 0) {
                chrome.storage.sync.set({
                  youtube_list: temp,
                });
              }
            } catch (exception) {}
            (document.getElementById("uploadfile") as HTMLInputElement).value =
              "";
          }
        });
        reader.readAsText(file, "UTF-8");
      }
    }
  };
  return (
    <div className={styles["header-container"]}>
      <input
        style={{ display: "none" }}
        type="file"
        name="uploadfile"
        id="uploadfile"
        accept="application/json"
        onChange={onFileUpload}
      ></input>
      <div className={styles["header-left-container"]}>
        <button
          disabled={playlist.length === 0}
          onClick={onPlayPauseButton}
          className={styles["header-button"]}
        >
          <img
            className={styles["header-button-icon"]}
            src={isPlayAll ? "./assets/pause30.png" : "./assets/play30.png"}
          />
        </button>
      </div>
      <div className={styles["header-right-container"]}>
        <button onClick={openMenu} className={styles["header-button"]}>
          <img
            className={styles["header-button-icon"]}
            src={"./assets/menu30.svg"}
          />
        </button>
      </div>
    </div>
  );
};

export default PlaylistHeader;
