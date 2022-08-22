import MsgType from "../constants/msgType";
import { getStorage } from "../utils/storage";
import { v4 as uuidv4 } from "uuid";

const onYoutubeVideoPage = (
  url: string,
  videoId: string,
  isPlayTab: boolean
) => {
  const bookmark = document.getElementsByClassName("bookmark-button")[0];
  if (!bookmark) {
    const bookmarkBtn = document.createElement("button");
    bookmarkBtn.style.cssText =
      "position: relative; font-size: 36px; height: 100%; text-align: center;top:calc(36px - 100%);left:0;";
    bookmarkBtn.className = "ytp-button bookmark-button";
    bookmarkBtn.innerText = "+";
    bookmarkBtn.title = "Click to bookmark current timestamp";
    bookmarkBtn.addEventListener("click", () =>
      onBookmarkBtnClick(url, videoId)
    );
    const rightControls = document.getElementsByClassName("ytp-right-controls");
    for (let rightControl of rightControls) {
      rightControl.prepend(bookmarkBtn);
    }
  } else {
    bookmark.addEventListener("click", () => onBookmarkBtnClick(url, videoId));
  }

  if (isPlayTab) {
    const video = document.getElementsByClassName(
      "video-stream html5-main-video"
    )[0];
    video.addEventListener("ended", () => {
      chrome.runtime.sendMessage({ name: MsgType.VideoEnd });
    });
  }
};

const onBookmarkBtnClick = async (url: string, videoId: string) => {
  console.log("onBookmarkBtnClick");
  const youtubePlayer = document.getElementsByClassName(
    "video-stream"
  )[0] as HTMLVideoElement;
  const timestamp = Math.floor(youtubePlayer.currentTime);

  const title = document.querySelectorAll(
    "h1.ytd-watch-metadata>yt-formatted-string"
  )[0].innerHTML;

  const channelName = document.querySelectorAll(
    "#owner #upload-info ytd-channel-name .yt-formatted-string"
  )[0].innerHTML;
  const data = {
    id: uuidv4(),
    url,
    videoId,
    title,
    channelName,
    timestamp,
  };

  const list = ((await getStorage("youtube_list")) || []) as [{}];
  list.push(data);
  chrome.storage.sync.set({
    youtube_list: list,
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { type, url, videoId, isPlayTab } = request;
  switch (type) {
    case MsgType.YoutubeVideo:
      onYoutubeVideoPage(url, videoId, isPlayTab);
      break;
    default:
  }
});
