import MPlaylistItem from "../models/MPlaylistItem";
import PlaybackState, {
  QueueMode,
  createInitialPlaybackState,
} from "../models/PlaybackState";

type PlaybackEvent =
  | { type: "PLAY_ITEM"; item: MPlaylistItem; queueMode?: QueueMode }
  | { type: "PLAY_ALL"; queueMode: Exclude<QueueMode, "off"> }
  | { type: "PAUSE" }
  | { type: "VIDEO_PLAYING" }
  | { type: "VIDEO_PAUSED" }
  | { type: "VIDEO_ENDED" }
  | { type: "TAB_UPDATED"; tabId: number | null }
  | { type: "TAB_REMOVED"; tabId: number }
  | { type: "ENTER_PIP" }
  | { type: "EXIT_PIP" }
  | { type: "TOGGLE_PIN" }
  | { type: "TOGGLE_VOLUME_ADJUST" }
  | { type: "RESET" };

const withPartial = (
  state: PlaybackState,
  partial: Partial<PlaybackState>,
): PlaybackState => ({
  ...state,
  ...partial,
});

const reducePlaybackState = (
  state: PlaybackState,
  event: PlaybackEvent,
): PlaybackState => {
  switch (event.type) {
    case "PLAY_ITEM":
      return withPartial(state, {
        status:
          state.currentItemId === event.item.id &&
          (state.status === "paused" || state.status === "playing")
            ? "playing"
            : "loading",
        queueMode: event.queueMode ?? "off",
        currentItemId: event.item.id,
        isPip: false,
      });
    case "PLAY_ALL":
      return withPartial(state, {
        status: state.currentItemId ? state.status : "loading",
        queueMode: event.queueMode,
      });
    case "PAUSE":
      return withPartial(state, {
        status: state.currentItemId ? "paused" : "idle",
      });
    case "VIDEO_PLAYING":
      return withPartial(state, {
        status: state.currentItemId ? "playing" : state.status,
      });
    case "VIDEO_PAUSED":
      return withPartial(state, {
        status: state.currentItemId ? "paused" : state.status,
      });
    case "VIDEO_ENDED":
      return state.queueMode === "off"
        ? createInitialPlaybackState()
        : withPartial(state, {
            status: "loading",
            isPip: false,
          });
    case "TAB_UPDATED":
      return withPartial(state, {
        currentTabId: event.tabId,
      });
    case "TAB_REMOVED":
      if (state.currentTabId !== event.tabId) {
        return state;
      }
      return createInitialPlaybackState();
    case "ENTER_PIP":
      return withPartial(state, { isPip: true });
    case "EXIT_PIP":
      return withPartial(state, { isPip: false });
    case "TOGGLE_PIN":
      return withPartial(state, { enablePin: !state.enablePin });
    case "TOGGLE_VOLUME_ADJUST":
      return withPartial(state, {
        enableAdjustVideoVolume: !state.enableAdjustVideoVolume,
      });
    case "RESET":
      return createInitialPlaybackState();
    default:
      return state;
  }
};

export default reducePlaybackState;
export type { PlaybackEvent };
