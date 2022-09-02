import { useEffect, useState } from "react";
import MsgType from "../../constants/msgType";
import styles from "./Playlist.module.css";

interface props {
  onDelete: () => void;
}
const PlaylistHeader = ({ onDelete }: props) => {
  const [isPlayAll, setIsPlayAll] = useState<boolean>(false);

  const onPlayAll = () => {
    console.log("onPlayAll");
    if (isPlayAll) {
      chrome.runtime.sendMessage({ name: MsgType.PauseAll });
    } else {
      chrome.runtime.sendMessage({ name: MsgType.PlayAll });
    }
  };
  useEffect(() => {
    console.log("isPlayAll");
    chrome.storage.local.get("isPlayAll", (result) => {
      console.log("isPlayAll", result);
      setIsPlayAll(!!result["isPlayAll"]);
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
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  return (
    <div className={styles["header-container"]}>
      <div className={styles["header-left-container"]}>
        <button onClick={onPlayAll} className={styles["header-button"]}>
          <img
            className={styles["header-button-icon"]}
            src={isPlayAll ? "./assets/pause30.png" : "./assets/play30.png"}
          />
        </button>
      </div>
      <div className={styles["header-right-container"]}>
        <button onClick={onDelete} className={styles["header-button"]}>
          <img
            className={styles["header-button-icon"]}
            src="./assets/trash.svg"
          />
        </button>
      </div>
    </div>
  );
};

export default PlaylistHeader;
