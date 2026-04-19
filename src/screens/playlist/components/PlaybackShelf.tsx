/// <reference types="chrome" />
import MPlaylistItem from "../../../models/MPlaylistItem";
import InfoModalTransport from "../../modal/InfoModalTransport";
import styles from "./PlaybackShelf.module.css";

interface Props {
  item: MPlaylistItem;
  isPlaying: boolean;
  onExpand: () => void;
}

const PlaybackShelf = ({ item, isPlaying, onExpand }: Props) => {
  return (
    <div className={styles["shelf-container"]}>
      <InfoModalTransport
        item={item}
        isPlaying={isPlaying}
        isExpanded={false}
        onExpand={onExpand}
      />
    </div>
  );
}

export default PlaybackShelf;
