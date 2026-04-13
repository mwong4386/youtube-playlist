type PlaybackStatus = "idle" | "loading" | "playing" | "paused";

type QueueMode = "off" | "sequential" | "random";

interface PlaybackState {
  status: PlaybackStatus;
  queueMode: QueueMode;
  currentItemId: string | null;
  currentTabId: number | null;
  isPip: boolean;
  enableAdjustVideoVolume: boolean;
}

export const createInitialPlaybackState = (): PlaybackState => ({
  status: "idle",
  queueMode: "off",
  currentItemId: null,
  currentTabId: null,
  isPip: false,
  enableAdjustVideoVolume: true,
});

export const isQueueModeActive = (queueMode: QueueMode) => queueMode !== "off";

export const isPlaybackActive = (status: PlaybackStatus) =>
  status === "playing";

export default PlaybackState;
export type { PlaybackStatus, QueueMode };
