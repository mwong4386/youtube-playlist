import type MPlaylistItem from "../models/MPlaylistItem";
import type { QueueMode } from "../models/PlaybackState";
import { getRandomInt } from "../utils/math";

type NavigationDirection = "previous" | "next";

interface GetPlaybackNavigationTargetArgs {
  playlist: MPlaylistItem[];
  currentItemId: string | null;
  queueMode: QueueMode;
  direction: NavigationDirection;
  pickRandomIndex?: (max: number) => number;
}

const getWrappedIndex = (
  currentIndex: number,
  length: number,
  direction: NavigationDirection
) => {
  if (direction === "previous") {
    return (currentIndex - 1 + length) % length;
  }

  return (currentIndex + 1) % length;
};

const getPlaybackNavigationTarget = ({
  playlist,
  currentItemId,
  queueMode,
  direction,
  pickRandomIndex = getRandomInt,
}: GetPlaybackNavigationTargetArgs): MPlaylistItem | null => {
  if (playlist.length === 0) {
    return null;
  }

  if (direction === "next" && queueMode === "random") {
    return playlist[pickRandomIndex(playlist.length)] || null;
  }

  const currentIndex = currentItemId
    ? playlist.findIndex((item) => item.id === currentItemId)
    : -1;

  if (currentIndex < 0) {
    return direction === "previous"
      ? playlist[playlist.length - 1]
      : playlist[0];
  }

  return playlist[getWrappedIndex(currentIndex, playlist.length, direction)] || null;
};

export { getPlaybackNavigationTarget };
export type { NavigationDirection, GetPlaybackNavigationTargetArgs };
