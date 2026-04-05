import csMsgType from "../constants/csMsgType";
import MsgType from "../constants/msgType";
import MPlaylistItem from "../models/MPlaylistItem";
import PlaybackState, {
  QueueMode,
  createInitialPlaybackState,
  isPlaybackActive,
  isQueueModeActive,
} from "../models/PlaybackState";
import { getRandomInt } from "../utils/math";
import { getStorage } from "../utils/syncStorage";
import reducePlaybackState from "./playbackMachine";

let playbackState: PlaybackState = createInitialPlaybackState();
let playingItem: MPlaylistItem | null = null;

const applyPlaybackEvent = (
  event: Parameters<typeof reducePlaybackState>[1],
): PlaybackState => {
  playbackState = reducePlaybackState(playbackState, event);
  return playbackState;
};

const resetPlaybackState = () => {
  playingItem = null;
  applyPlaybackEvent({ type: "RESET" });
};

const getPlaylist = async () => {
  const items = await getStorage("youtube_list");
  return ((items || []) as MPlaylistItem[]).slice();
};

const getCurrentItem = async () => {
  if (playingItem?.id === playbackState.currentItemId) {
    return playingItem;
  }
  if (!playbackState.currentItemId) {
    playingItem = null;
    return null;
  }
  const playlist = await getPlaylist();
  const item =
    playlist.find((playlistItem) => playlistItem.id === playbackState.currentItemId) ||
    null;
  playingItem = item;
  return item;
};

const getUrlForItem = (item: MPlaylistItem) =>
  `${item.url}/?v=${item.videoId}${item.timestamp ? "&t=" + item.timestamp : ""}`;

const getVideoIdFromUrl = (url?: string | null) => {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get("v");
  } catch (error) {
    return null;
  }
};

const updateStateToLocalStorage = () => {
  chrome.storage.local.set({
    playbackState,
    tabId: playbackState.currentTabId,
    playingItem: playingItem,
    isPlaying: isPlaybackActive(playbackState.status),
    isPlayAll: isQueueModeActive(playbackState.queueMode),
    isPIP: playbackState.isPip,
    isRandom: playbackState.queueMode === "random",
    enablePin: playbackState.enablePin,
    enableAdjustVideoVolume: playbackState.enableAdjustVideoVolume,
  });
};

const openTab = async (url: string) => {
  let nextTabId: number | null = playbackState.currentTabId;
  if (!nextTabId) {
    const tab = await chrome.tabs.create({ url: url });
    nextTabId = tab?.id ?? null;
  } else {
    try {
      const tab = await chrome.tabs.update(nextTabId, { url: url });
      nextTabId = tab?.id ?? nextTabId;
    } catch (exception) {
      const tab = await chrome.tabs.create({ url: url });
      nextTabId = tab?.id ?? null;
    }
  }
  applyPlaybackEvent({ type: "TAB_UPDATED", tabId: nextTabId });
  applyPlaybackEvent({ type: "EXIT_PIP" });
};

const sendSignalAsync = async (
  type: csMsgType,
  fallback?: () => Promise<void>,
  extraMessage?: Record<string, unknown>,
) => {
  const tabId = playbackState.currentTabId;
  if (tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { type, ...extraMessage },
        async () => {
          if (chrome.runtime.lastError && fallback) {
            await fallback();
          }
          resolve("ok");
        },
      );
    });
  }
  if (fallback) {
    await fallback();
  }
};

const onPlayVideo = async (item: MPlaylistItem, queueMode: QueueMode = "off") => {
  const url = getUrlForItem(item);
  const isCurrentItem = item.id === playbackState.currentItemId;

  playingItem = item;
  applyPlaybackEvent({ type: "PLAY_ITEM", item, queueMode });
  updateStateToLocalStorage();

  if (
    isCurrentItem &&
    (playbackState.status === "playing" || playbackState.status === "paused")
  ) {
    await sendSignalAsync(csMsgType.PlayYoutubeVideo, async () => {
      applyPlaybackEvent({ type: "PLAY_ITEM", item, queueMode });
      await openTab(url);
    });
    return;
  }

  await openTab(url);
  updateStateToLocalStorage();
};

const playNext = async (queueMode: QueueMode = playbackState.queueMode) => {
  const playlist = await getPlaylist();
  if (playlist.length === 0) {
    resetPlaybackState();
    return;
  }

  let item: MPlaylistItem;
  if (queueMode === "random") {
    item = playlist[getRandomInt(playlist.length)];
  } else if (playingItem) {
    const currentIndex = playlist.findIndex(
      (playlistItem) => playlistItem.id === playingItem?.id,
    );
    const nextIndex = (currentIndex + 1) % playlist.length;
    item = playlist[nextIndex];
  } else {
    item = playlist[0];
  }

  await onPlayVideo(item, queueMode);
};

const onPlayAll = async (queueMode: Exclude<QueueMode, "off">) => {
  applyPlaybackEvent({ type: "PLAY_ALL", queueMode });
  updateStateToLocalStorage();

  if (playbackState.status === "playing" && playbackState.currentItemId) {
    return;
  }

  const currentItem = await getCurrentItem();
  if (!currentItem) {
    await playNext(queueMode);
    return;
  }

  await sendSignalAsync(csMsgType.PlayYoutubeVideo, async () => {
    await onPlayVideo(currentItem, queueMode);
  });
};

const onPauseVideo = async () => {
  applyPlaybackEvent({ type: "PAUSE" });
  updateStateToLocalStorage();
  await sendSignalAsync(csMsgType.PauseYoutubeVideo, async () => {
    resetPlaybackState();
    updateStateToLocalStorage();
  });
};

const onPauseAll = async () => {
  await sendSignalAsync(csMsgType.PauseYoutubeVideo, async () => {
    resetPlaybackState();
    updateStateToLocalStorage();
  });
  resetPlaybackState();
  updateStateToLocalStorage();
};

const onVideoEnd = async () => {
  const queueMode = playbackState.queueMode;
  applyPlaybackEvent({ type: "VIDEO_ENDED" });
  updateStateToLocalStorage();
  if (queueMode === "off") {
    playingItem = null;
    updateStateToLocalStorage();
    return;
  }
  await playNext(queueMode);
};

const deleteVideo = async (id: string) => {
  const playlist = await getPlaylist();
  const newPlaylist = playlist.filter((item) => item.id !== id);
  await chrome.storage.sync.set({
    youtube_list: newPlaylist,
  });
};

const onMessageHandler = async (message: any) => {
  console.log("on Message Handler", message);
  switch (message.name) {
    case MsgType.PlayVideo:
      await onPlayVideo(message.item);
      break;
    case MsgType.PauseVideo:
      await onPauseVideo();
      break;
    case MsgType.PlayAll:
      await onPlayAll("sequential");
      break;
    case MsgType.PlayAllRandom:
      await onPlayAll("random");
      break;
    case MsgType.PauseAll:
      await onPauseAll();
      break;
    case MsgType.VideoPlayEvent:
      applyPlaybackEvent({ type: "VIDEO_PLAYING" });
      updateStateToLocalStorage();
      break;
    case MsgType.VideoPauseEvent:
      applyPlaybackEvent({ type: "VIDEO_PAUSED" });
      updateStateToLocalStorage();
      break;
    case MsgType.VideoEnd:
      await onVideoEnd();
      break;
    case MsgType.DeleteVideo:
      await deleteVideo(message.item.id);
      break;
    case MsgType.OpenPictureInWindow:
      if (playbackState.currentTabId) {
        chrome.scripting.executeScript({
          files: ["/openPictureInWindow.js"],
          target: { tabId: playbackState.currentTabId, allFrames: true },
        });
      }
      break;
    case MsgType.EnterPip:
      applyPlaybackEvent({ type: "ENTER_PIP" });
      updateStateToLocalStorage();
      break;
    case MsgType.ExitPip:
      applyPlaybackEvent({ type: "EXIT_PIP" });
      updateStateToLocalStorage();
      break;
    case MsgType.TogglePin:
      applyPlaybackEvent({ type: "TOGGLE_PIN" });
      updateStateToLocalStorage();
      break;
    case MsgType.ToggleVolumeAdjust:
      applyPlaybackEvent({ type: "TOGGLE_VOLUME_ADJUST" });
      updateStateToLocalStorage();
      break;
    case MsgType.VolumeChange:
      if (playbackState.currentTabId) {
        chrome.tabs.sendMessage(
          playbackState.currentTabId,
          {
            type: csMsgType.VolumeChange,
            volume: message.volume,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.log(1, chrome.runtime.lastError);
            }
          },
        );
      }
      break;
    default:
  }
};

const getLegacyPlaybackState = (result: {
  [key: string]: any;
}): PlaybackState => ({
  status: result["isPlaying"]
    ? "playing"
    : result["playingItem"]
      ? "paused"
      : "idle",
  queueMode: result["isRandom"]
    ? "random"
    : result["isPlayAll"]
      ? "sequential"
      : "off",
  currentItemId: result["playingItem"]?.id ?? null,
  currentTabId: result["tabId"] ?? null,
  isPip: !!result["isPIP"],
  enablePin: !!result["enablePin"],
  enableAdjustVideoVolume:
    result["enableAdjustVideoVolume"] === undefined
      ? true
      : !!result["enableAdjustVideoVolume"],
});

(function () {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => {
        console.warn("Failed to enable side panel action behavior", error);
      });
  }

  chrome.storage.local.get(
    [
      "playbackState",
      "tabId",
      "isPlaying",
      "isPlayAll",
      "playingItem",
      "isPIP",
      "isRandom",
      "enablePin",
      "enableAdjustVideoVolume",
    ],
    (result) => {
      playbackState = result["playbackState"]
        ? {
            ...createInitialPlaybackState(),
            ...result["playbackState"],
          }
        : getLegacyPlaybackState(result);
      playingItem = result["playingItem"] || null;
      if (!playbackState.currentTabId) {
        resetPlaybackState();
        updateStateToLocalStorage();
        return;
      }
      chrome.tabs.sendMessage(
        playbackState.currentTabId,
        {
          type: csMsgType.CheckExists,
        },
        () => {
          if (chrome.runtime.lastError) {
            resetPlaybackState();
            updateStateToLocalStorage();
          }
        },
      );
    },
  );

  chrome.runtime.onMessage.addListener(function (message) {
    onMessageHandler(message).then(() => {
      updateStateToLocalStorage();
    });
  });

  const sendMessageToYoutubeTab = async (
    tabId: number,
    url: string,
    videoId: string | null,
    isPlayTab: boolean,
    count: number,
  ) => {
    const currentItem = await getCurrentItem();
    console.log("send Message to yt", count);
    chrome.tabs.sendMessage(
      tabId,
      {
        type: csMsgType.OnYoutubeVideoPage,
        url: url,
        videoId: videoId,
        isPlayTab: isPlayTab,
        endTimestamp: isPlayTab ? currentItem?.endTimestamp : undefined,
        enablePin: playbackState.enablePin,
        volume:
          isPlayTab && playbackState.enableAdjustVideoVolume
            ? currentItem?.volume
            : false,
      },
      () => {
        if (count >= 4) return;
        if (chrome.runtime.lastError) {
          console.log(2, chrome.runtime.lastError);
          setTimeout(() => {
            void sendMessageToYoutubeTab(tabId, url, videoId, isPlayTab, count + 1);
          }, 500);
        }
      },
    );
  };

  chrome.webNavigation.onHistoryStateUpdated.addListener((detail) => {
    if (detail.url && detail.url.includes("youtube.com/watch")) {
      const videoId = getVideoIdFromUrl(detail.url);
      const isPlayTab = playbackState.currentTabId === detail.tabId;
      console.log(playbackState.currentTabId, " ", detail.tabId);
      if (!videoId) return;
      if (isPlayTab && playingItem?.videoId !== videoId) {
        console.log("unknown video id ", videoId, " ", playingItem);
        resetPlaybackState();
        updateStateToLocalStorage();
        return;
      }
      console.log("Seems good ", playingItem);
      void sendMessageToYoutubeTab(detail.tabId, detail.url, videoId, isPlayTab, 0);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    const previousState = playbackState;
    applyPlaybackEvent({ type: "TAB_REMOVED", tabId });
    if (previousState.currentTabId === tabId) {
      playingItem = null;
      updateStateToLocalStorage();
    }
  });
})();
