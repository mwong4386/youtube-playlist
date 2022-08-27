import MsgType from "../constants/msgType";
import MPlaylistItem from "../models/PlaylistItem";
import { getStorage } from "../utils/storage";

let tabId: number | undefined;
let playlist: MPlaylistItem[];
let isPlayAll: boolean = false;
let isPlaying: boolean = false;
let playingIndex: string | undefined;
chrome.storage.local.get("tabId", (result) => {
  tabId = result["tabId"];
});

const onPlayVideo = (item: MPlaylistItem) => {
  isPlaying = true;
  playingIndex = item.id;
  const url = `${item.url}/?v=${item.videoId}${
    item.timestamp ? "&t=" + item.timestamp : ""
  }`;
  if (tabId == null) {
    chrome.tabs.create({ url: url }, (tab) => {
      chrome.storage.local.set({ tabId: tab?.id });
      tabId = tab?.id;
    });
  } else {
    chrome.tabs.update(tabId, { url: url }, () => {
      if (chrome.runtime.lastError) {
        chrome.tabs.create({ url: url }, (tab) => {
          chrome.storage.local.set({ tabId: tab?.id });
          tabId = tab?.id;
        });
      }
    });
  }
};

const playNext = () => {
  getStorage("youtube_list").then((items) => {
    playlist = (items || []) as MPlaylistItem[];
    if (playlist.length === 0) {
      isPlayAll = false;
      return;
    }
    let item;
    if (!!playingIndex) {
      const currentIndex = playlist.findIndex(
        (item) => item.id === playingIndex
      );
      const nextIndex = (currentIndex + 1) % playlist.length;
      item = playlist[nextIndex];
    } else {
      item = playlist[0];
    }
    onPlayVideo(item);
  });
};

const onPlayAll = () => {
  isPlayAll = true;
  if (!isPlaying) {
    playNext();
  }
};

const onVideoEnd = () => {
  isPlaying = false;
  if (isPlayAll) {
    playNext();
  }
};

chrome.runtime.onMessage.addListener(function (message) {
  switch (message.name) {
    case MsgType.PlayVideo:
      onPlayVideo(message.item);
      break;
    case MsgType.PlayAll:
      onPlayAll();
      break;
    case MsgType.VideoEnd:
      onVideoEnd();
      break;
    default:
  }
});

chrome.tabs.onUpdated.addListener((tabId1, tab) => {
  if (tab.url && tab.url.includes("youtube.com/watch")) {
    const query: string = tab.url.split("?")[1];
    const params: URLSearchParams = new URLSearchParams(query);
    chrome.tabs.sendMessage(
      tabId1,
      {
        type: MsgType.YoutubeVideo,
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
