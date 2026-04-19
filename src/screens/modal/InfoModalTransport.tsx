/// <reference types="chrome" />
import { useEffect, useRef, useState } from "react";
import MsgType from "../../constants/msgType";
import MPlaylistItem from "../../models/MPlaylistItem";
import styles from "./InfoModalTransport.module.css";

interface Props {
  item: MPlaylistItem;
  isPlaying: boolean;
  isExpanded: boolean;
  onExpand: () => void;
}

const MARQUEE_PAUSE_MS = 1400;
const MARQUEE_PIXELS_PER_SECOND = 28;

interface MarqueeTextProps {
  text: string;
  className: string;
}

const MarqueeText = ({ text, className }: MarqueeTextProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    const updateOverflow = () => {
      const viewport = viewportRef.current;
      const content = contentRef.current;

      if (!viewport || !content) {
        return;
      }

      const nextDistance = Math.max(0, content.scrollWidth - viewport.clientWidth);
      setOverflowDistance(nextDistance > 4 ? nextDistance : 0);
    };

    updateOverflow();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateOverflow);
      return () => {
        window.removeEventListener("resize", updateOverflow);
      };
    }

    const observer = new ResizeObserver(() => {
      updateOverflow();
    });

    if (viewportRef.current) {
      observer.observe(viewportRef.current);
    }
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [text]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || overflowDistance <= 0) {
      if (viewport) {
        viewport.scrollLeft = 0;
      }
      return;
    }

    let frameId = 0;
    let direction = 1;
    let phaseStartedAt = 0;
    let pausedUntil = performance.now() + MARQUEE_PAUSE_MS;
    const travelDurationMs = Math.max(
      3200,
      (overflowDistance / MARQUEE_PIXELS_PER_SECOND) * 1000,
    );

    const easeInOutSine = (progress: number) =>
      -(Math.cos(Math.PI * progress) - 1) / 2;

    const tick = (now: number) => {
      const currentViewport = viewportRef.current;
      if (!currentViewport) {
        return;
      }

      if (now < pausedUntil) {
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      if (phaseStartedAt === 0) {
        phaseStartedAt = now;
      }

      const progress = Math.min(
        1,
        (now - phaseStartedAt) / travelDurationMs,
      );
      const easedProgress = easeInOutSine(progress);
      const nextScrollLeft =
        direction === 1
          ? easedProgress * overflowDistance
          : (1 - easedProgress) * overflowDistance;

      currentViewport.scrollLeft = nextScrollLeft;

      if (progress >= 1) {
        direction *= -1;
        phaseStartedAt = 0;
        pausedUntil = now + MARQUEE_PAUSE_MS;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    viewport.scrollLeft = 0;
    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      viewport.scrollLeft = 0;
    };
  }, [overflowDistance, text]);

  return (
    <div className={styles["marqueeViewport"]} ref={viewportRef} title={text}>
      <span
        ref={contentRef}
        className={`${styles["marqueeContent"]} ${className}`}
      >
        {text}
      </span>
    </div>
  );
};

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
        aria-expanded={isExpanded}
        aria-label="Expand song editor"
        title="Expand song editor"
        onClick={onExpand}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onExpand();
          }
        }}
      >
        <div className={styles["transportDetails"]}>
          <MarqueeText text={item.title} className={styles["trackTitle"]} />
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
