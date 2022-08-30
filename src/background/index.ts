import csMsgType from "../constants/csMsgType";
import MsgType from "../constants/msgType";
import MPlaylistItem from "../models/PlaylistItem";
import { getStorage } from "../utils/syncStorage";

let tabId: number | undefined; // store the youtube player tab
let isPlaying: boolean = false; // indicate is the player playing / pause
let isPlayAll: boolean = false; // If true, looping playlist
let playingIndex: string | undefined; // store the playing item id

const openTab = async (url: string) => {
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
};

const onPlayVideo = async (item: MPlaylistItem) => {
  const url = `${item.url}/?v=${item.videoId}${
    item.timestamp ? "&t=" + item.timestamp : ""
  }`;

  if (item.id === playingIndex) {
    sendSignal(csMsgType.PlayYoutubeVideo, () => {
      //if cannot resume the video, restart the page again
      openTab(url);
    });
    isPlaying = true;
    return;
  }

  await openTab(url);
  console.log(3);
  isPlaying = true;
  playingIndex = item.id;
};

const playNext = async () => {
  const items = await getStorage("youtube_list");
  const playlist = (items || []) as MPlaylistItem[];
  if (playlist.length === 0) {
    resetInitial();
    return;
  }
  let item;
  if (!!playingIndex) {
    const currentIndex = playlist.findIndex((item) => item.id === playingIndex);
    const nextIndex = (currentIndex + 1) % playlist.length;
    item = playlist[nextIndex];
  } else {
    item = playlist[0];
  }
  await onPlayVideo(item);
};

const onPlayAll = async () => {
  isPlayAll = true;
  if (!isPlaying) {
    sendSignal(csMsgType.PlayYoutubeVideo, () => {
      if (!playingIndex) {
        playNext();
        return;
      }
      getStorage("youtube_list").then((items) => {
        const playlist = (items || []) as MPlaylistItem[];
        if (playlist.length === 0) {
          isPlayAll = false;
          return;
        }
        let item;
        const currentIndex = playlist.findIndex(
          (item) => item.id === playingIndex
        );
        item = currentIndex === -1 ? playlist[0] : playlist[currentIndex];
        onPlayVideo(item);
      });
    });
    isPlaying = true;
  }
};

const onPauseVideo = () => {
  isPlaying = false;
  sendSignal(csMsgType.PauseYoutubeVideo, resetInitial);
};

const onPauseAll = () => {
  isPlayAll = false;
  onPauseVideo();
};

const sendSignal = (type: csMsgType, fallback?: () => void) => {
  if (tabId) {
    chrome.tabs.sendMessage(
      tabId,
      {
        type: type,
      },
      () => {
        if (chrome.runtime.lastError) {
          if (fallback) fallback();
        }
      }
    );
  }
};

const onVideoEnd = async () => {
  isPlaying = false;
  if (isPlayAll) {
    await playNext();
  }
};

const updateStateToLocalStorage = () => {
  console.log(isPlaying, isPlayAll);
  chrome.storage.local.set({
    tabId: tabId,
    playingIndex: playingIndex,
    isPlaying: isPlaying,
    isPlayAll: isPlayAll,
  });
};

const deleteVideo = (id: string) => {
  chrome.storage.sync.get("youtube_list", (result) => {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError);
      return;
    }
    const playlist = (result["youtube_list"] || []) as MPlaylistItem[];
    const newPlaylist = playlist.filter((item) => item.id !== id);
    chrome.storage.sync.set({
      youtube_list: newPlaylist,
    });
  });
};
const onMessageHandler = async (message: any) => {
  switch (message.name) {
    case MsgType.PlayVideo:
      await onPlayVideo(message.item);
      break;
    case MsgType.PauseVideo:
      onPauseVideo();
      break;
    case MsgType.PlayAll:
      await onPlayAll();
      break;
    case MsgType.PauseAll:
      onPauseAll();
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
      deleteVideo(message.item.id);
      break;
    default:
  }
};

const resetInitial = () => {
  playingIndex = undefined;
  tabId = undefined;
  isPlayAll = false;
  isPlaying = false;
};

(function () {
  chrome.storage.local.get(["tabId", "isPlayAll"], (result) => {
    tabId = result["tabId"];
    isPlayAll = result["isPlayAll"];
  });

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
        },
        () => {
          console.log(chrome.runtime.lastError);
        }
      );
    }
  });

  chrome.tabs.onRemoved.addListener((tabId1, tab) => {
    if (tabId1 === tabId) {
      resetInitial();
      updateStateToLocalStorage();
    }
  });
})();
