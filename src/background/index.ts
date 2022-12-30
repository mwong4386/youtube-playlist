import csMsgType from "../constants/csMsgType";
import MsgType from "../constants/msgType";
import MPlaylistItem from "../models/MPlaylistItem";
import { getRandomInt } from "../utils/math";
import { getStorage } from "../utils/syncStorage";

let tabId: number | undefined = undefined; // store the youtube player tab
let isPlaying: boolean = false; // indicate is the player playing / pause
let isPlayAll: boolean = false; // If true, looping playlist
let isRandom: boolean = false; // If true, looping with random
let playingItem: MPlaylistItem | null = null;
let isPIP: boolean = false; // If true, show picture in picture for the currently playing item
let enablePin: boolean = false; // If true, show control time pin on the youtube watch page
let enableAdjustVideoVolume: boolean = true;
const openTab = async (url: string) => {
  /*if no playing tab, create one
    if there is playing tab, try to redirect the tab to new url
    if the tab has no response, create one instead*/
  if (!tabId) {
    const tab = await chrome.tabs.create({ url: url });
    tabId = tab?.id;
  } else {
    try {
      await chrome.tabs.update(tabId, { url: url });
    } catch (exception) {
      const tab = await chrome.tabs.create({ url: url });
      tabId = tab?.id;
    }
  }
  isPIP = false; //stop picture in picture for new video
};

const onPlayVideo = async (item: MPlaylistItem) => {
  /* If the item is playing/pause, send it a resume signal,
     otherwise, open it by new/current tab */
  const url = `${item.url}/?v=${item.videoId}${
    item.timestamp ? "&t=" + item.timestamp : ""
  }`;
  if (item.id === playingItem?.id) {
    await sendSignalAsync(csMsgType.PlayYoutubeVideo, async () => {
      //if cannot resume the video, restart the page again
      await openTab(url);
    });
    isPlaying = true;
    return;
  }
  playingItem = item;
  await openTab(url);
  isPlaying = true;
};

const playNext = async () => {
  /* load the youtube list from youtube storage
  find next item from the list and pass it to play  */
  const items = await getStorage("youtube_list");
  const playlist = (items || []) as MPlaylistItem[];
  if (playlist.length === 0) {
    await resetInitial();
    return;
  }
  let item;
  if (isRandom) {
    item = playlist[getRandomInt(playlist.length)];
  } else if (!!playingItem) {
    const currentIndex = playlist.findIndex(
      (item) => item.id === playingItem?.id
    );
    const nextIndex = (currentIndex + 1) % playlist.length;
    item = playlist[nextIndex];
  } else {
    item = playlist[0];
  }
  await onPlayVideo(item);
};

const onPlayAll = async () => {
  /* trigger the play all function
  if it already playing something, it will update the flag only
  otherwise, it will signal the page to resume playing
  if the tab cannot resume (e.g. the tab has been closed), it will run fallback
  to play the playlist   */
  isPlayAll = true;
  if (!isPlaying) {
    await sendSignalAsync(csMsgType.PlayYoutubeVideo, async () => {
      //if no playing item record, it will reloop the playlist
      if (!playingItem) {
        await playNext();
        return;
      }
      //if there is playing item, it will start playing the playing item again
      const items = await getStorage("youtube_list");
      const playlist = (items || []) as MPlaylistItem[];
      if (playlist.length === 0) {
        await resetInitial();
        return;
      }
      let item;
      const currentIndex = playlist.findIndex(
        (item) => item.id === playingItem?.id
      );
      item = currentIndex === -1 ? playlist[0] : playlist[currentIndex];
      onPlayVideo(item);
    });
    isPlaying = true;
  }
};

const findPlayingItem = async (videoId: string) => {
  const items = await getStorage("youtube_list");
  const playlist = (items || []) as MPlaylistItem[];
  if (playlist.length === 0) {
    return undefined;
  }
  let item;
  const currentIndex = playlist.findIndex((item) => item.id === videoId);
  item = currentIndex === -1 ? undefined : playlist[currentIndex];
  return item;
};

const onPauseVideo = async () => {
  isPlaying = false;
  await sendSignalAsync(csMsgType.PauseYoutubeVideo, resetInitial);
};

const onPauseAll = async () => {
  isPlayAll = false;
  isRandom = false;
  await onPauseVideo();
};

const sendSignalAsync = async (
  type: csMsgType,
  fallback?: () => Promise<void>
) => {
  /* if there is tab, try to send it signal
     if there is no tab id or tab return error, call the fallback method if any */
  const tab_id = tabId;
  if (tab_id) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab_id, { type: type }, async (response) => {
        if (chrome.runtime.lastError) {
          if (fallback) {
            await fallback();
          }
        }
        resolve("ok");
      });
    });
  } else {
    if (fallback) {
      await fallback();
    }
  }
};

const onVideoEnd = async () => {
  isPlaying = false;
  if (isPlayAll) {
    await playNext();
  }
};

const updateStateToLocalStorage = () => {
  chrome.storage.local.set({
    tabId: tabId,
    playingItem: playingItem,
    isPlaying: isPlaying,
    isPlayAll: isPlayAll,
    isPIP: isPIP,
    isRandom: isRandom,
    enablePin: enablePin,
    enableAdjustVideoVolume: enableAdjustVideoVolume,
  });
};

const deleteVideo = async (id: string) => {
  const items = await getStorage("youtube_list");
  const playlist = (items || []) as MPlaylistItem[];
  const newPlaylist = playlist.filter((item) => item.id !== id);
  await chrome.storage.sync.set({
    youtube_list: newPlaylist,
  });
};
const onMessageHandler = async (message: any) => {
  switch (message.name) {
    case MsgType.PlayVideo:
      await onPlayVideo(message.item);
      break;
    case MsgType.PauseVideo:
      await onPauseVideo();
      break;
    case MsgType.PlayAll:
      isRandom = false;
      await onPlayAll();
      break;
    case MsgType.PlayAllRandom:
      isRandom = true;
      await onPlayAll();
      break;
    case MsgType.PauseAll:
      await onPauseAll();
      break;
    case MsgType.VideoPlayEvent:
      isPlaying = true;
      break;
    case MsgType.VideoPauseEvent:
      isPlaying = false;
      break;
    case MsgType.VideoEnd:
      await onVideoEnd();
      break;
    case MsgType.DeleteVideo:
      await deleteVideo(message.item.id);
      break;
    case MsgType.OpenPictureInWindow:
      if (tabId) {
        chrome.scripting.executeScript({
          files: ["/openPictureInWindow.js"],
          target: { tabId: tabId, allFrames: true },
        });
      }
      break;
    case MsgType.EnterPip:
      isPIP = true;
      break;
    case MsgType.ExitPip:
      isPIP = false;
      break;
    case MsgType.TogglePin:
      enablePin = !enablePin;
      break;
    case MsgType.ToggleVolumeAdjust:
      enableAdjustVideoVolume = !enableAdjustVideoVolume;
      break;
    case MsgType.VolumeChange:
      if (tabId) {
        chrome.tabs.sendMessage(
          tabId,
          {
            type: csMsgType.VolumeChange,
            volume: message.volume,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.log(chrome.runtime.lastError);
            }
          }
        );
      }
      break;
    default:
  }
};

const resetInitial = async () => {
  playingItem = null;
  tabId = undefined;
  isPlayAll = false;
  isPlaying = false;
  isPIP = false;
  isRandom = false;
};

(function () {
  // In case the background script restart, it will detect whether the tab still exist,
  // if no, reset the state
  chrome.storage.local.get(
    [
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
      tabId = result["tabId"];
      isPlaying = result["isPlaying"];
      isPlayAll = result["isPlayAll"];
      playingItem = result["playingItem"];
      isPIP = result["isPIP"];
      isRandom = result["isRandom"];
      enablePin = result["enablePin"];
      enableAdjustVideoVolume = result["enableAdjustVideoVolume"];
      if (!tabId) {
        resetInitial();
        updateStateToLocalStorage();
        return;
      }
      chrome.tabs.sendMessage(
        tabId,
        {
          type: csMsgType.CheckExists,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resetInitial();
            updateStateToLocalStorage();
          }
        }
      );
    }
  );

  chrome.runtime.onMessage.addListener(function (message) {
    onMessageHandler(message).then(() => {
      updateStateToLocalStorage();
    });
  });

  chrome.tabs.onUpdated.addListener((tabId1, tab) => {
    if (tab.url && tab.url.includes("youtube.com/watch")) {
      const query: string = tab.url.split("?")[1];
      const params: URLSearchParams = new URLSearchParams(query);
      const videoId = params.get("v");
      const isPlayTab = tabId === tabId1;
      if (!videoId) return;
      if (isPlayTab && playingItem?.videoId !== videoId) {
        return;
      } else {
        chrome.tabs.sendMessage(
          tabId1,
          {
            type: csMsgType.OnYoutubeVideoPage,
            url: tab.url.split("?")[0],
            videoId: videoId,
            isPlayTab: isPlayTab,
            endTimestamp: isPlayTab && playingItem?.endTimestamp,
            enablePin: enablePin,
            volume: isPlayTab && enableAdjustVideoVolume && playingItem?.volume,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.log(chrome.runtime.lastError);
            }
          }
        );
      }
    }
  });

  chrome.tabs.onRemoved.addListener((tabId1, tab) => {
    if (tabId1 === tabId) {
      resetInitial();
      updateStateToLocalStorage();
    }
  });
})();
