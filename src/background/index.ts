import csMsgType from "../constants/csMsgType";
import MsgType from "../constants/msgType";
import AudioEqSettings from "../models/AudioEq";
import { normalizeAudioEqSettings } from "../utils/audioEq";
import MPlaylistItem from "../models/MPlaylistItem";
import PlaybackState, {
  QueueMode,
  createInitialPlaybackState,
  isPlaybackActive,
  isQueueModeActive,
} from "../models/PlaybackState";
import {
  GEMINI_API_KEY_STORAGE_KEY,
  GeminiAnalyzeErrorCode,
} from "../models/GeminiSettings";
import {
  ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
  SONG_LISTS_STORAGE_KEY,
} from "../models/SongList";
import { readStoredGeminiApiKey } from "../utils/geminiSettings";
import { getStorageMap } from "../utils/syncStorage";
import {
  buildActiveSongListStorageUpdate,
  readActiveSongListItems,
  readActiveSongListItemsFromStorageMap,
} from "../utils/songLists";
import reducePlaybackState from "./playbackMachine";
import { getPlaybackNavigationTarget } from "./playbackNavigation";
import {
  SAVED_BADGE_TEXT,
  shouldShowSavedBadge,
} from "./actionBadge";
import {
  buildGeminiBoundaryRequestBody,
  parseGeminiBoundaryResponse,
} from "./geminiBoundaries";
import {
  ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  beginAnalyzeImportBatch,
  completeAnalyzeImportBatchItem,
  failAnalyzeImportBatchItem,
  resolveAnalyzeImportBatchItemIds,
  stopAnalyzeImportBatch,
} from "./importBatchState";
import {
  GEMINI_GENERIC_FAILURE_MESSAGE,
  fetchGeminiGenerateContentWithRetries,
  readGeminiErrorResponse,
} from "./geminiRequest";
import {
  importYoutubePlaylist,
  previewYoutubePlaylistImport,
} from "./youtubePlaylistImport";
import type {
  AnalyzeImportBatchRequest,
  AnalyzeImportBatchState,
} from "../models/PlaylistImport";

let playbackState: PlaybackState = createInitialPlaybackState();
let playingItem: MPlaylistItem | null = null;
let analyzeImportBatchPromise: Promise<void> | null = null;
let analyzeImportAbortController: AbortController | null = null;
let analyzeImportStopRequested = false;

const normalizePlaylistItem = (item: MPlaylistItem): MPlaylistItem => ({
  ...item,
  audioEq: normalizeAudioEqSettings(item.audioEq),
});

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
  const items = await readActiveSongListItems();
  return items.map(normalizePlaylistItem);
};

const updatePlaylistItem = async (
  id: string,
  partial: Partial<
    Pick<
      MPlaylistItem,
      | "volume"
      | "audioEq"
      | "timestamp"
      | "endTimestamp"
      | "geminiSuggestedStartTimestamp"
      | "geminiSuggestedEndTimestamp"
    >
  >,
) => {
  const storageMap = await getStorageMap([
    SONG_LISTS_STORAGE_KEY,
    ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
  ]);
  const playlist = readActiveSongListItemsFromStorageMap(storageMap).map(
    normalizePlaylistItem
  );
  const nextPlaylist = playlist.map((item) => {
    if (item.id !== id) {
      return item;
    }

    return {
      ...item,
      ...partial,
      audioEq: partial.audioEq
        ? normalizeAudioEqSettings(partial.audioEq)
        : item.audioEq,
      };
  });

  const songListsStorageUpdate = buildActiveSongListStorageUpdate(
    storageMap,
    nextPlaylist
  );
  await chrome.storage.sync.set(songListsStorageUpdate);
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

const getUrlForItem = (item: MPlaylistItem) => {
  const url = new URL(item.url);
  url.searchParams.set("v", item.videoId);
  if (item.timestamp) {
    url.searchParams.set("t", item.timestamp.toString());
  } else {
    url.searchParams.delete("t");
  }
  return url.toString();
};

const getVideoIdFromUrl = (url?: string | null) => {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get("v");
  } catch (error) {
    return null;
  }
};

const setSavedBadgeState = async (tabId: number, url?: string | null) => {
  const playlist = await getPlaylist();
  const showBadge = shouldShowSavedBadge(url, playlist);

  await chrome.action.setBadgeText({
    tabId,
    text: showBadge ? SAVED_BADGE_TEXT : "",
  });

  if (!showBadge) {
    return;
  }

  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: "#1db954",
  });
  await chrome.action.setBadgeTextColor({
    tabId,
    color: "#ffffff",
  });
};

const refreshSavedBadgeForTab = async (tabId: number) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await setSavedBadgeState(tabId, tab.url);
  } catch {
    await chrome.action.setBadgeText({
      tabId,
      text: "",
    });
  }
};

const refreshSavedBadgeForActiveTab = async () => {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  const activeTab = tabs[0];
  if (!activeTab?.id) {
    return;
  }

  await setSavedBadgeState(activeTab.id, activeTab.url);
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
  const item = getPlaybackNavigationTarget({
    playlist,
    currentItemId: playbackState.currentItemId,
    queueMode,
    direction: "next",
  });

  if (!item) {
    resetPlaybackState();
    return;
  }

  await onPlayVideo(item, queueMode);
};

const playPrevious = async (queueMode: QueueMode = playbackState.queueMode) => {
  const playlist = await getPlaylist();
  const item = getPlaybackNavigationTarget({
    playlist,
    currentItemId: playbackState.currentItemId,
    queueMode,
    direction: "previous",
  });

  if (!item) {
    resetPlaybackState();
    return;
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

const onVideoEnd = async (videoId?: string) => {
  const currentItem = await getCurrentItem();
  if (videoId && currentItem?.videoId && currentItem.videoId !== videoId) {
    return;
  }

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
  const storageMap = await getStorageMap([
    SONG_LISTS_STORAGE_KEY,
    ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
  ]);
  const playlist = readActiveSongListItemsFromStorageMap(storageMap).map(
    normalizePlaylistItem
  );
  const newPlaylist = playlist.filter((item) => item.id !== id);
  const songListsStorageUpdate = buildActiveSongListStorageUpdate(
    storageMap,
    newPlaylist
  );
  await chrome.storage.sync.set(songListsStorageUpdate);
};

const logGeminiAnalyze = (...args: unknown[]) => {
  console.log("[Gemini analyze]", ...args);
};

const warnGeminiAnalyze = (...args: unknown[]) => {
  console.warn("[Gemini analyze]", ...args);
};

const analyzeSongBoundaries = async (itemId: string) => {
  logGeminiAnalyze("started", { itemId });

  const apiKey = readStoredGeminiApiKey(
    await chrome.storage.local.get([GEMINI_API_KEY_STORAGE_KEY]),
  );

  logGeminiAnalyze("api key lookup complete", { hasApiKey: Boolean(apiKey) });

  if (!apiKey) {
    warnGeminiAnalyze("stopped before request", {
      itemId,
      reason: "missing-api-key",
    });
    return {
      ok: false,
      code: GeminiAnalyzeErrorCode.MissingApiKey,
      message: "Add a Gemini API key in settings before analyzing songs.",
    };
  }

  const playlist = await getPlaylist();
  const item = playlist.find((candidate) => candidate.id === itemId);

  if (!item) {
    warnGeminiAnalyze("stopped before request", {
      itemId,
      reason: "item-not-found",
      playlistSize: playlist.length,
    });
    return {
      ok: false,
      code: GeminiAnalyzeErrorCode.ItemNotFound,
      message: "The selected song could not be found.",
    };
  }

  try {
    const requestBody = buildGeminiBoundaryRequestBody(item);
    logGeminiAnalyze("sending request", {
      itemId,
      videoId: item.videoId,
      title: item.title,
      channelName: item.channelName,
      maxDuration: item.maxDuration,
      savedStartTimestamp: item.timestamp,
      savedEndTimestamp: item.endTimestamp,
      requestBody,
    });

    const { response, attempt } = await fetchGeminiGenerateContentWithRetries({
      apiKey,
      requestBody,
      signal: analyzeImportAbortController?.signal,
    });

    logGeminiAnalyze("received response", {
      itemId,
      attempt,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorResponse = await readGeminiErrorResponse(response);
      warnGeminiAnalyze("request failed", {
        itemId,
        attempt,
        status: response.status,
        statusText: response.statusText,
        responseText: errorResponse.responseText,
      });
      return {
        ok: false,
        code: GeminiAnalyzeErrorCode.RequestFailed,
        message: errorResponse.message,
      };
    }

    const payload = await response.json();
    logGeminiAnalyze("response payload", { itemId, payload });

    const result = parseGeminiBoundaryResponse(
      payload,
      item.maxDuration,
      (reason, details) => {
        warnGeminiAnalyze("response parse failed", {
          itemId,
          reason,
          ...details,
        });
      },
    );

    logGeminiAnalyze("completed", { itemId, result });

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      warnGeminiAnalyze("request aborted", { itemId });
      throw error;
    }
    warnGeminiAnalyze("request threw", { itemId, error });
    return {
      ok: false,
      code: GeminiAnalyzeErrorCode.RequestFailed,
      message: GEMINI_GENERIC_FAILURE_MESSAGE,
    };
  }
};

const updateAnalyzeImportBatchState = async (
  state: AnalyzeImportBatchState,
) => {
  await chrome.storage.local.set({
    [ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY]: state,
  });
};

const runAnalyzeImportBatch = async (initialState: AnalyzeImportBatchState) => {
  let batchState = initialState;
  while (batchState.currentItemId) {
    const itemId = batchState.currentItemId;
    analyzeImportAbortController = new AbortController();

    try {
      const result = await analyzeSongBoundaries(itemId);

      if (analyzeImportStopRequested) {
        batchState = stopAnalyzeImportBatch(batchState);
        await updateAnalyzeImportBatchState(batchState);
        break;
      }

      if (result.ok) {
        await updatePlaylistItem(itemId, {
          timestamp: result.suggestion.startTimestamp,
          endTimestamp: result.suggestion.endTimestamp,
          geminiSuggestedStartTimestamp: result.suggestion.startTimestamp,
          geminiSuggestedEndTimestamp: result.suggestion.endTimestamp,
        });
        batchState = completeAnalyzeImportBatchItem(batchState, itemId);
      } else {
        batchState = failAnalyzeImportBatchItem(batchState, itemId);
      }

      await updateAnalyzeImportBatchState(batchState);
    } catch (error) {
      if (
        analyzeImportStopRequested &&
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        batchState = stopAnalyzeImportBatch(batchState);
        await updateAnalyzeImportBatchState(batchState);
        break;
      }

      throw error;
    } finally {
      analyzeImportAbortController = null;
    }
  }
};

const stopAnalyzeImportBatchRun = async () => {
  analyzeImportStopRequested = true;
  analyzeImportAbortController?.abort();

  const result = await chrome.storage.local.get([
    ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  ]);
  const batchState = result[
    ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY
  ] as AnalyzeImportBatchState | undefined;

  if (!batchState?.active) {
    return batchState || beginAnalyzeImportBatch([]);
  }

  const stoppedState = stopAnalyzeImportBatch(batchState);
  await updateAnalyzeImportBatchState(stoppedState);
  return stoppedState;
};

const startAnalyzeImportBatch = async (
  request?: AnalyzeImportBatchRequest,
) => {
  if (analyzeImportBatchPromise) {
    const result = await chrome.storage.local.get([
      ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
    ]);
    return (
      (result[ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY] as AnalyzeImportBatchState | undefined) ||
      beginAnalyzeImportBatch([])
    );
  }

  const playlist = await getPlaylist();
  const batchState = beginAnalyzeImportBatch(
    resolveAnalyzeImportBatchItemIds(playlist, request),
  );
  await updateAnalyzeImportBatchState(batchState);
  analyzeImportStopRequested = false;

  analyzeImportBatchPromise = runAnalyzeImportBatch(batchState).finally(() => {
    analyzeImportAbortController = null;
    analyzeImportStopRequested = false;
    analyzeImportBatchPromise = null;
  });

  return batchState;
};

const onVolumeChange = async (
  volume: number,
  persist: boolean | undefined,
) => {
  const normalizedVolume = Math.max(0, Math.min(100, Number(volume)));

  if (playbackState.currentTabId) {
    if (playingItem) {
      playingItem = {
        ...playingItem,
        volume: normalizedVolume,
      };
      updateStateToLocalStorage();
      if (persist) {
        await updatePlaylistItem(playingItem.id, {
          volume: normalizedVolume,
        });
      }
    }

    chrome.tabs.sendMessage(
      playbackState.currentTabId,
      {
        type: csMsgType.VolumeChange,
        volume: normalizedVolume,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.log(1, chrome.runtime.lastError);
        }
      },
    );
  }
};

const onAudioEqChange = async (
  audioEq: Partial<AudioEqSettings>,
  persist: boolean | undefined,
) => {
  const normalizedAudioEq = normalizeAudioEqSettings({
    ...(playingItem?.audioEq || {}),
    ...audioEq,
  });

  if (playbackState.currentTabId) {
    if (playingItem) {
      playingItem = {
        ...playingItem,
        audioEq: normalizedAudioEq,
      };
      updateStateToLocalStorage();
      if (persist) {
        await updatePlaylistItem(playingItem.id, {
          audioEq: normalizedAudioEq,
        });
      }
    }

    chrome.tabs.sendMessage(
      playbackState.currentTabId,
      {
        type: csMsgType.AudioEqChange,
        audioEq: normalizedAudioEq,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.log(1, chrome.runtime.lastError);
        }
      },
    );
  }
};

const onMessageHandler = async (message: any, sender?: chrome.runtime.MessageSender) => {
  switch (message.name) {
    case MsgType.PlayVideo:
      await onPlayVideo(message.item);
      break;
    case MsgType.PauseVideo:
      await onPauseVideo();
      break;
    case MsgType.PreviousVideo:
      await playPrevious();
      break;
    case MsgType.NextVideo:
      await playNext();
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
      await onVideoEnd(message.videoId);
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
    case MsgType.ToggleVolumeAdjust:
      applyPlaybackEvent({ type: "TOGGLE_VOLUME_ADJUST" });
      updateStateToLocalStorage();
      break;
    case MsgType.VolumeChange:
      await onVolumeChange(message.volume, message.persist);
      break;
    case MsgType.AudioEqChange:
      await onAudioEqChange(message.audioEq, message.persist);
      break;
    case MsgType.RefreshSavedBadge:
      if (sender?.tab?.id) {
        await refreshSavedBadgeForTab(sender.tab.id);
      } else {
        await refreshSavedBadgeForActiveTab();
      }
      break;
    case MsgType.AnalyzeSongBoundaries:
      return analyzeSongBoundaries(message.itemId);
    case MsgType.PreviewYoutubePlaylistImport:
      return previewYoutubePlaylistImport({
        playlistUrl: message.playlistUrl,
      });
    case MsgType.ImportYoutubePlaylist:
      return importYoutubePlaylist({
        playlistUrl: message.playlistUrl,
        mode: message.mode,
      });
    case MsgType.AnalyzeImportedPlaylist:
      return startAnalyzeImportBatch({
        itemIds: message.itemIds,
        scope: message.scope,
      });
    case MsgType.StopAnalyzeImportedPlaylist:
      return stopAnalyzeImportBatchRun();
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
  enableAdjustVideoVolume:
    result["enableAdjustVideoVolume"] === undefined
      ? true
      : !!result["enableAdjustVideoVolume"],
});

const normalizeStoredPlaybackState = (value: unknown): PlaybackState => {
  const fallback = createInitialPlaybackState();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<PlaybackState>;
  return {
    status: candidate.status ?? fallback.status,
    queueMode: candidate.queueMode ?? fallback.queueMode,
    currentItemId: candidate.currentItemId ?? fallback.currentItemId,
    currentTabId: candidate.currentTabId ?? fallback.currentTabId,
    isPip: candidate.isPip ?? fallback.isPip,
    enableAdjustVideoVolume:
      candidate.enableAdjustVideoVolume ?? fallback.enableAdjustVideoVolume,
  };
};

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
      "enableAdjustVideoVolume",
    ],
    (result) => {
      playbackState = result["playbackState"]
        ? normalizeStoredPlaybackState(result["playbackState"])
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

  logGeminiAnalyze("background listener registered", {
    runtimeId: chrome.runtime.id,
  });
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (
      message?.name === MsgType.AnalyzeSongBoundaries ||
      message?.name === MsgType.PreviewYoutubePlaylistImport ||
      message?.name === MsgType.ImportYoutubePlaylist ||
      message?.name === MsgType.AnalyzeImportedPlaylist ||
      message?.name === MsgType.StopAnalyzeImportedPlaylist
    ) {
      void onMessageHandler(message, sender).then(sendResponse);
      return true;
    }

    void onMessageHandler(message, sender).then(() => {
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
    chrome.tabs.sendMessage(
      tabId,
      {
        type: csMsgType.OnYoutubeVideoPage,
        url: url,
        videoId: videoId,
        isPlayTab: isPlayTab,
        endTimestamp: isPlayTab ? currentItem?.endTimestamp : undefined,
        volume:
          isPlayTab && playbackState.enableAdjustVideoVolume
            ? currentItem?.volume
            : false,
        audioEq: isPlayTab
          ? normalizeAudioEqSettings(currentItem?.audioEq)
          : undefined,
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

  const handleYoutubeNavigation = async (tabId: number, url?: string) => {
    if (!url || !url.includes("youtube.com/watch")) {
      return;
    }

    const videoId = getVideoIdFromUrl(url);
    const isPlayTab = playbackState.currentTabId === tabId;
    const currentItem = isPlayTab ? await getCurrentItem() : null;
    if (!videoId) return;
    if (isPlayTab && currentItem?.videoId !== videoId) {
      if (
        currentItem &&
        (playbackState.status === "loading" ||
          isQueueModeActive(playbackState.queueMode))
      ) {
        const expectedUrl = getUrlForItem(currentItem);
        if (expectedUrl !== url) {
          await openTab(expectedUrl);
          updateStateToLocalStorage();
        }
        return;
      }

      resetPlaybackState();
      updateStateToLocalStorage();
      return;
    }
    void sendMessageToYoutubeTab(tabId, url, videoId, isPlayTab, 0);
  };

  chrome.webNavigation.onHistoryStateUpdated.addListener((detail) => {
    void handleYoutubeNavigation(detail.tabId, detail.url);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") {
      return;
    }

    void setSavedBadgeState(tabId, tab.url);
    void handleYoutubeNavigation(tabId, tab.url);
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    void refreshSavedBadgeForTab(activeInfo.tabId);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    const previousState = playbackState;
    applyPlaybackEvent({ type: "TAB_REMOVED", tabId });
    if (previousState.currentTabId === tabId) {
      playingItem = null;
      updateStateToLocalStorage();
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (
      namespace !== "sync" ||
      (!(
        SONG_LISTS_STORAGE_KEY in changes
      ) &&
        !(ACTIVE_SONG_LIST_NAME_STORAGE_KEY in changes))
    ) {
      return;
    }

    void (async () => {
      const updatedPlaylist = await getPlaylist();
      await refreshSavedBadgeForActiveTab();

      if (!playbackState.currentItemId) {
        return;
      }

      playingItem =
        updatedPlaylist.find((item) => item.id === playbackState.currentItemId) ||
        null;
      updateStateToLocalStorage();
    })();
  });

  void refreshSavedBadgeForActiveTab();
})();
