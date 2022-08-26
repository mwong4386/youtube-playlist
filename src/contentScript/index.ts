import MsgType from "../constants/msgType";
import { v4 as uuidv4 } from "uuid";

let onCSConfirm: () => any;
const onYoutubeVideoPage = (
  url: string,
  videoId: string,
  isPlayTab: boolean
) => {
  const bookmark = document.getElementsByClassName("bookmark-button")[0];

  if (!bookmark) {
    onCSConfirm = () => {
      onBookmarkBtnClick(url, videoId);
    };
    fetch(chrome.runtime.getURL("/dialog.html"))
      .then((r) => r.text())
      .then((html) => {
        document.body.insertAdjacentHTML("beforeend", html);
        (
          document.getElementById("cs-confirm-button") as HTMLButtonElement
        ).addEventListener("click", onCSConfirm);
      });
    const bookmarkBtn = document.createElement("button");
    bookmarkBtn.style.cssText =
      "position: relative; font-size: 36px; height: 100%; text-align: center;top:calc(36px - 100%);left:0;";
    bookmarkBtn.className = "ytp-button bookmark-button";
    bookmarkBtn.innerText = "+";
    bookmarkBtn.title = "Click to bookmark current timestamp";

    bookmarkBtn.addEventListener("click", onClickHandler);
    const rightControls = document.getElementsByClassName("ytp-right-controls");
    for (let rightControl of rightControls) {
      rightControl.prepend(bookmarkBtn);
    }
  } else {
    bookmark.addEventListener("click", onClickHandler);

    (
      document.getElementById("cs-confirm-button") as HTMLButtonElement
    ).removeEventListener("click", onCSConfirm);

    onCSConfirm = () => {
      onBookmarkBtnClick(url, videoId);
    };

    (
      document.getElementById("cs-confirm-button") as HTMLButtonElement
    ).addEventListener("click", onCSConfirm);
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
const onClickHandler = () => {
  const title = document.title
    .replace(/^\(.+?\)/, "")
    .replace(/- youtube$/i, "")
    .trim();

  const channelName = document.querySelectorAll(
    "#owner #upload-info ytd-channel-name .yt-formatted-string"
  )[0].innerHTML;

  (document.getElementById("cs-video-title") as HTMLElement).innerHTML = title;
  (document.getElementById("cs-channel-name") as HTMLElement).innerHTML =
    channelName;

  const youtubePlayer = document.querySelectorAll(
    "#columns #primary .video-stream"
  )[0] as HTMLVideoElement;
  const timestamp = Math.floor(youtubePlayer.currentTime);
  const hours = Math.floor(timestamp / 3600);
  const minutes = Math.floor(timestamp / 60) % 60;
  const seconds = timestamp % 60;

  (document.getElementById("cs-start-hour") as HTMLInputElement).value =
    hours.toString();
  (document.getElementById("cs-start-minute") as HTMLInputElement).value =
    minutes.toString();
  (document.getElementById("cs-start-second") as HTMLInputElement).value =
    seconds.toString();

  const dialog = document.getElementById("cs-dialog") as HTMLDialogElement;
  dialog.showModal();
};

const onBookmarkBtnClick = (url: string, videoId: string) => {
  const hour: number = parseFloat(
    (document.getElementById("cs-start-hour") as HTMLInputElement).value
  );
  const minute: number = parseFloat(
    (document.getElementById("cs-start-minute") as HTMLInputElement).value
  );
  const second: number = parseFloat(
    (document.getElementById("cs-start-second") as HTMLInputElement).value
  );

  const timestamp = hour * 3600 + minute * 60 + second;

  //const title = document.title.replace(/^\(.+\)/, "");
  const title = (document.getElementById("cs-video-title") as HTMLElement)
    .innerHTML;
  const channelName = (
    document.getElementById("cs-channel-name") as HTMLElement
  ).innerHTML;

  const data = {
    id: uuidv4(),
    url,
    videoId,
    title,
    channelName,
    timestamp,
  };

  chrome.storage.sync.get("youtube_list", (result) => {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError);
      return;
    }
    const list = result["youtube_list"] || [];
    list.push(data);
    console.log(list);
    chrome.storage.sync.set({
      youtube_list: list,
    });
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { type, url, videoId, isPlayTab } = request;
  switch (type) {
    case MsgType.YoutubeVideo:
      onYoutubeVideoPage(url, videoId, isPlayTab);
      sendResponse({ state: "ok" });
      break;
    default:
  }
});

(function () {
  const href = window.location.href;
  const query: string = href.split("?")[1];
  const params: URLSearchParams = new URLSearchParams(query);
  const videoId = params.get("v");
  if (!videoId) return;
  const url = href.split("?")[0];
  onYoutubeVideoPage(url, videoId || "", false);
})();
