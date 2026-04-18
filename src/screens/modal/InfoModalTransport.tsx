import MsgType from "../../constants/msgType";
import MPlaylistItem from "../../models/MPlaylistItem";
import styles from "./InfoModalTransport.module.css";

interface Props {
  item: MPlaylistItem;
  isPlaying: boolean;
  isExpanded: boolean;
  onExpand: () => void;
}

const InfoModalTransport = ({
  item,
  isPlaying,
  isExpanded,
  onExpand,
}: Props) => {
  const onPlayPrevious = () => {
    chrome.runtime.sendMessage({ name: MsgType.PreviousVideo });
  };

  const onPlayNext = () => {
    chrome.runtime.sendMessage({ name: MsgType.NextVideo });
  };

  const onTogglePlayback = () => {
    chrome.runtime.sendMessage({
      name: isPlaying ? MsgType.PauseVideo : MsgType.PlayVideo,
      ...(isPlaying ? {} : { item }),
    });
  };

  return (
    <div className={styles["transportSurface"]}>
      <div
        className={`${styles["expandSurface"]} ${
          isExpanded ? styles["expandSurfaceExpanded"] : ""
        }`}
        role="button"
        tabIndex={0}
        aria-label="Expand song editor"
        onClick={onExpand}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onExpand();
          }
        }}
      >
        <div className={styles["transportDetails"]}>
          <p className={styles["trackTitle"]}>{item.title}</p>
          <p className={styles["trackMeta"]}>{item.channelName}</p>
        </div>
      </div>

      <div className={styles["transportActions"]}>
        <button
          type="button"
          className={styles["secondaryTransportButton"]}
          aria-label="Open previous song"
          onClick={onPlayPrevious}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={styles["secondaryTransportIcon"]}
          >
            <path d="M8 6v12" />
            <path d="m18 6-8 6 8 6V6Z" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button
          type="button"
          className={styles["pauseButton"]}
          aria-label={`${isPlaying ? "Pause" : "Play"} ${item.title}`}
          onClick={onTogglePlayback}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              className={styles["pauseIcon"]}
            >
              <path d="M12 6h-2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm10 0h-2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 384 512"
              className={styles["playIcon"]}
            >
              <path d="M361 215c14.3 8.8 23 24.3 23 41s-8.7 32.2-23 40.1l-287.97 176c-14.82 9.9-33.37 10.3-48.51 1.8A48.02 48.02 0 0 1 0 432V80a48.02 48.02 0 0 1 24.52-41.87a48.019 48.02 0 0 1 48.51.91L361 215z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className={styles["secondaryTransportButton"]}
          aria-label="Open next song"
          onClick={onPlayNext}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={styles["secondaryTransportIcon"]}
          >
            <path d="M16 6v12" />
            <path d="m6 6 8 6-8 6V6Z" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default InfoModalTransport;
