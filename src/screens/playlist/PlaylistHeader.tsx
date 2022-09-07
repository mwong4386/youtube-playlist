import { useEffect, useState } from "react";
import MsgType from "../../constants/msgType";
import useActionSheet from "../actionSheet/useActionSheet";
import styles from "./Playlist.module.css";

interface props {
  onDelete: () => void;
}
const PlaylistHeader = ({ onDelete }: props) => {
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
      { id: 2, description: "Delete All", callback: onDelete },
    ]);
    ctx.open();
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

  return (
    <div className={styles["header-container"]}>
      <div className={styles["header-left-container"]}>
        <button onClick={onPlayPauseButton} className={styles["header-button"]}>
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
