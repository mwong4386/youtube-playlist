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
  console.log("onPlayVideo", playingItem?.id);
  if (item.id === playingItem?.id) {
    await sendSignalAsync(csMsgType.PlayYoutubeVideo, async () => {
      //if cannot resume the video, restart the page again
      console.log("onPlayVideo 1");
      await openTab(url);
      console.log("onPlayVideo 2");
    });
    isPlaying = true;
    console.log("onPlayVideo 3");
    return;
  }

  await openTab(url);
  console.log(3);
  isPlaying = true;
  playingItem = item;
  console.log("onPlayVideo1", item);
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
  console.log("playingIndex", playingItem?.id);
  if (!isPlaying) {
    await sendSignalAsync(csMsgType.PlayYoutubeVideo, async () => {
      console.log("fallback");
      //if no playing item record, it will reloop the playlist
      if (!playingItem) {
        console.log("fallback1");
        await playNext();
        console.log("fallback2");
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
            console.log("fallback 10");
            await fallback();
            console.log("fallback 11");
          }
        }
        console.log("fallback 12");
        resolve("ok");
        console.log("fallback 13");
      });
    });
  } else {
    if (fallback) {
      console.log("fallback 14");
      await fallback();
      console.log("fallback 15");
    }
    console.log("fallback 16");
    console.log("fallback 17");
  }
};

const onVideoEnd = async () => {
  console.log("onVideoEnd");
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
  });
};

const deleteVideo = async (id: string) => {
  console.log("deleteVideo 1");
  const items = await getStorage("youtube_list");
  const playlist = (items || []) as MPlaylistItem[];
  const newPlaylist = playlist.filter((item) => item.id !== id);
  await chrome.storage.sync.set({
    youtube_list: newPlaylist,
  });
  console.log("deleteVideo 2");
};
const onMessageHandler = async (message: any) => {
  console.log(message.name);
  switch (message.name) {
    case MsgType.PlayVideo:
      console.log("PlayVideo: ", message.item);
      await onPlayVideo(message.item);
      break;
    case MsgType.PauseVideo:
      console.log("PauseVideo");
      await onPauseVideo();
      break;
    case MsgType.PlayAll:
      console.log("PlayAll");
      isRandom = false;
      await onPlayAll();
      break;
    case MsgType.PlayAllRandom:
      console.log("PlayAll");
      isRandom = true;
      await onPlayAll();
      break;
    case MsgType.PauseAll:
      console.log("PauseAll");
      await onPauseAll();
      break;
    case MsgType.VideoPlayEvent:
      console.log("VideoPlayEvent");
      isPlaying = true;
      break;
    case MsgType.VideoPauseEvent:
      console.log("VideoPauseEvent");
      isPlaying = false;
      break;
    case MsgType.VideoEnd:
      console.log("VideoEnd");
      await onVideoEnd();
      break;
    case MsgType.DeleteVideo:
      console.log("DeleteVideo");
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
    ],
    (result) => {
      tabId = result["tabId"];
      isPlaying = result["isPlaying"];
      isPlayAll = result["isPlayAll"];
      playingItem = result["playingItem"];
      isPIP = result["isPIP"];
      isRandom = result["isRandom"];
      enablePin = result["enablePin"];
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
          console.log(response);
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
      chrome.tabs.sendMessage(
        tabId1,
        {
          type: csMsgType.OnYoutubeVideoPage,
          url: tab.url.split("?")[0],
          videoId: params.get("v"),
          isPlayTab: tabId === tabId1,
          endTimestamp: tabId === tabId1 && playingItem?.endTimestamp,
          enablePin: enablePin,
          volume: tabId === tabId1 && playingItem?.volume,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError);
          }
        }
      );
    }
  });

  chrome.tabs.onRemoved.addListener((tabId1, tab) => {
    console.log("onRemoved");
    if (tabId1 === tabId) {
      console.log("onRemoved 1");
      resetInitial();
      updateStateToLocalStorage();
    }
  });
})();
