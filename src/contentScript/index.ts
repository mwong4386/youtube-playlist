import MsgType from "../constants/msgType";
import { v4 as uuidv4 } from "uuid";
import csMsgType from "../constants/csMsgType";

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
        // Add confirm button handler
        (
          document.getElementById("cs-confirm-button") as HTMLButtonElement
        ).addEventListener("click", onCSConfirm);
        // Close the dialog when click the backdrop
        (
          document.getElementById("cs-dialog") as HTMLDialogElement
        ).addEventListener("click", (event) => {
          if ((event.target as HTMLElement).id === "cs-dialog") {
            (event.target as HTMLDialogElement).close();
          }
        });
        const items = document.getElementsByClassName(
          "cs-start-time-inputgroup"
        );
        for (const item of items) {
          //Select the full text when focus the inputbox
          item.addEventListener("focus", (event) =>
            (event?.target as HTMLInputElement)?.select()
          );
        }
      });
    const bookmarkBtn = document.createElement("button");
    bookmarkBtn.style.cssText =
      "position: relative; font-size: 36px; height: 100%; text-align: center;top:calc(36px - 100%);left:0;";
    bookmarkBtn.className = "ytp-button bookmark-button";
    bookmarkBtn.innerText = "+";
    bookmarkBtn.title = "Click to open bookmark dialog";

    bookmarkBtn.addEventListener("click", onCSOpenDialogClickHandler);
    const rightControls = document.getElementsByClassName("ytp-right-controls");
    for (let rightControl of rightControls) {
      rightControl.prepend(bookmarkBtn);
    }
  } else {
    //bookmark.addEventListener("click", onCSOpenDialogClickHandler);
    // Rebind the confirm handler with new url and video id
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
    )[0] as HTMLVideoElement;
    video.addEventListener("ended", () => {
      chrome.runtime.sendMessage({ name: MsgType.VideoEnd });
    });
    video.addEventListener("play", () => {
      chrome.runtime.sendMessage({ name: MsgType.VideoPlayEvent });
    });
    video.addEventListener("pause", () => {
      chrome.runtime.sendMessage({ name: MsgType.VideoPauseEvent });
    });
  }
};

const onCSOpenDialogClickHandler = () => {
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

  const fullscreenPlayer = document.querySelectorAll(
    "#player-theater-container .video-stream"
  )[0] as HTMLVideoElement;

  const youtubePlayer = document.querySelectorAll(
    "#columns #primary .video-stream"
  )[0] as HTMLVideoElement;
  const timestamp = Math.floor(
    youtubePlayer?.currentTime | fullscreenPlayer?.currentTime
  );
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
    chrome.storage.sync.set({
      youtube_list: list,
    });
  });
};

const onPlayVideo = () => {
  const video = document.getElementsByClassName(
    "video-stream html5-main-video"
  )[0] as HTMLVideoElement;
  video.play();
};

const onPauseVideo = () => {
  const video = document.getElementsByClassName(
    "video-stream html5-main-video"
  )[0] as HTMLVideoElement;
  video.pause();
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { type, url, videoId, isPlayTab } = request;
  switch (type) {
    case csMsgType.OnYoutubeVideoPage:
      onYoutubeVideoPage(url, videoId, isPlayTab);
      break;
    case csMsgType.PlayYoutubeVideo:
      onPlayVideo();
      break;
    case csMsgType.PauseYoutubeVideo:
      onPauseVideo();
      break;
    default:
  }
  sendResponse({ state: "ok" });
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
