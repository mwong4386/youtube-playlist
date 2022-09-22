import MsgType from "../constants/msgType";
import { v4 as uuidv4 } from "uuid";
import csMsgType from "../constants/csMsgType";
import {
  createStartPin,
  createStopPin,
  getEndTime,
  getStartTime,
  moveEndPin,
  moveStartPin,
  setEndTime,
  setMaxX,
  setPinVisibility,
  setStartTime,
} from "./MovingPin";
let onCSConfirm: (e: Event) => any;
export let _duration: number = NaN;
const onYoutubeVideoPage = (
  url: string,
  videoId: string,
  isPlayTab: boolean,
  endTimestamp: number | undefined,
  enablePin: boolean,
  volume: number | undefined
) => {
  const bookmark = document.getElementsByClassName("bookmark-button")[0];
  setStartTime(0);
  let video: HTMLVideoElement = getYoutubePlayer();
  if (video.duration > 0) {
    _duration = Math.floor(video.duration);
    setEndTime(_duration);
  } else {
    setEndTime(0);
  }

  if (!bookmark) {
    //bookmark will serve as flag
    onCSConfirm = (e) => {
      e.preventDefault();
      (
        document.getElementById("cs-confirm-button") as HTMLButtonElement
      ).disabled = true;
      onBookmarkBtnClick(url, videoId);
    };

    video.onloadedmetadata = function (event) {
      _duration = Math.floor(video.duration);
      setEndTime(_duration);
      moveEndPin(getEndTime());
    };

    const player = document.querySelector("#player .ytp-chrome-bottom");
    if (player) {
      new ResizeObserver((e) => {
        const entry = e[0];
        if (entry.contentRect) {
          console.log("test", video.volume);
          setMaxX(entry.contentRect.width);
          moveStartPin(getStartTime());
          moveEndPin(getEndTime());
        }
      }).observe(player);
    }
    getHtmlFromResource("/dialog.html").then((html) => {
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
      (
        document.getElementById("cs-untilEnd") as HTMLInputElement
      ).addEventListener("change", (event: Event) => {
        const element = event.currentTarget as HTMLInputElement;
        const checked = element.checked;
        disableEndTimeGroup(checked);
      });
      const items = document.getElementsByClassName("cs-start-time-inputgroup");
      for (const item of items) {
        //Select the full text when focus the inputbox
        item.addEventListener("focus", (event) =>
          (event?.target as HTMLInputElement)?.select()
        );
      }
      document
        .getElementById("cs-reset-starttime")
        ?.addEventListener("click", onResetClick);
      const volume = document.getElementById("cs-volume") as HTMLInputElement;
      volume.oninput = (event: Event) => {
        (
          document.getElementById("cs-volume-text") as HTMLInputElement
        ).innerHTML = volume.value;
      };
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
    createStartPin(enablePin);
    createStopPin(enablePin);
  } else {
    //bookmark.addEventListener("click", onCSOpenDialogClickHandler);
    // Rebind the confirm handler with new url and video id
    (
      document.getElementById("cs-confirm-button") as HTMLButtonElement
    ).removeEventListener("click", onCSConfirm);

    onCSConfirm = (e) => {
      e.preventDefault();
      (
        document.getElementById("cs-confirm-button") as HTMLButtonElement
      ).disabled = true;
      onBookmarkBtnClick(url, videoId);
    };

    (
      document.getElementById("cs-confirm-button") as HTMLButtonElement
    ).addEventListener("click", onCSConfirm);
    moveStartPin(getStartTime());
    setPinVisibility(enablePin);
  }

  if (isPlayTab) {
    video = video || getYoutubePlayer(); /*document.getElementsByClassName(
      "video-stream html5-main-video"
    )[0] as HTMLVideoElement;*/
    if (volume != undefined) {
      setTimeout(() => {
        //magic number...
        video.volume = volume / 100;
      }, 300);
    }
    if (endTimestamp) {
      let isEnd = false;
      video.addEventListener("timeupdate", () => {
        if (!isEnd && Math.floor(video.currentTime) === endTimestamp) {
          isEnd = true;
          chrome.runtime.sendMessage({ name: MsgType.VideoEnd });
        }
      });
    }
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

const getYoutubePlayer = () => {
  // const fullscreenPlayer1 = document.querySelector(
  //   "#player-theater-container .video-stream"
  // ) as HTMLVideoElement;

  // const youtubePlayer1 = document.querySelector(
  //   "#columns #primary .video-stream"
  // ) as HTMLVideoElement;

  // const ytdPlayer1 = document.querySelector(
  //   "video-stream html5-main-video"
  // ) as HTMLVideoElement;

  // const ytdPlayer2 = document.querySelector(
  //   "#ytd-player .video-stream"
  // ) as HTMLVideoElement;

  // const video: HTMLVideoElement | undefined =
  //   youtubePlayer1 || fullscreenPlayer1 || ytdPlayer1 || ytdPlayer2;
  const videos = document.getElementsByTagName("video");
  console.log(videos);
  return videos[videos.length - 1] as HTMLVideoElement;
};

export const getHtmlFromResource = (url: string) => {
  return fetch(chrome.runtime.getURL(url)).then((r) => r.text());
};

const onCSOpenDialogClickHandler = () => {
  clearErrorMsg();
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

  const video: HTMLVideoElement | undefined = getYoutubePlayer();
  const volumeRate = Math.floor(video.volume * 100).toString();
  (document.getElementById("cs-volume") as HTMLInputElement).value = volumeRate;
  (document.getElementById("cs-volume-text") as HTMLInputElement).innerHTML =
    volumeRate;

  const timestamp = getStartTime();
  const hours = Math.floor(timestamp / 3600);
  const minutes = Math.floor(timestamp / 60) % 60;
  const seconds = timestamp % 60;

  (document.getElementById("cs-start-hour") as HTMLInputElement).value =
    hours.toString();
  (document.getElementById("cs-start-minute") as HTMLInputElement).value =
    minutes.toString();
  (document.getElementById("cs-start-second") as HTMLInputElement).value =
    seconds.toString();

  const end_time = Math.floor(getEndTime());
  const end_hours = Math.floor(end_time / 3600);
  const end_minutes = Math.floor(end_time / 60) % 60;
  const end_seconds = end_time % 60;

  (document.getElementById("cs-end-hour") as HTMLInputElement).value =
    end_hours.toString();
  (document.getElementById("cs-end-minute") as HTMLInputElement).value =
    end_minutes.toString();
  (document.getElementById("cs-end-second") as HTMLInputElement).value =
    end_seconds.toString();

  const dialog = document.getElementById("cs-dialog") as HTMLDialogElement;
  (document.getElementById("cs-confirm-button") as HTMLButtonElement).disabled =
    false;
  const isUntilEnd = getEndTime() === _duration;
  (document.getElementById("cs-untilEnd") as HTMLInputElement).checked =
    isUntilEnd;
  disableEndTimeGroup(isUntilEnd);
  dialog.showModal();
};

const onResetClick = () => {
  (document.getElementById("cs-start-hour") as HTMLInputElement).value = "0";
  (document.getElementById("cs-start-minute") as HTMLInputElement).value = "0";
  (document.getElementById("cs-start-second") as HTMLInputElement).value = "0";
  moveStartPin(0);
};

const onBookmarkBtnClick = (url: string, videoId: string) => {
  clearErrorMsg();
  const hour: number = parseFloat(
    (document.getElementById("cs-start-hour") as HTMLInputElement).value
  );
  const minute: number = parseFloat(
    (document.getElementById("cs-start-minute") as HTMLInputElement).value
  );
  const second: number = parseFloat(
    (document.getElementById("cs-start-second") as HTMLInputElement).value
  );

  const timestamp = hour * 3600 + minute * 60 + second * 1;

  const title = (document.getElementById("cs-video-title") as HTMLElement)
    .innerHTML;
  const channelName = (
    document.getElementById("cs-channel-name") as HTMLElement
  ).innerHTML;
  const volume = parseInt(
    (document.getElementById("cs-volume") as HTMLInputElement).value
  );
  const untilEnd = (document.getElementById("cs-untilEnd") as HTMLInputElement)
    .checked;
  let endTimestamp: number | undefined = undefined;

  const video = getYoutubePlayer();
  const maxDuration = video?.duration;
  if (!untilEnd) {
    const endHour: number = parseFloat(
      (document.getElementById("cs-end-hour") as HTMLInputElement).value
    );
    const endMinute: number = parseFloat(
      (document.getElementById("cs-end-minute") as HTMLInputElement).value
    );
    const endSecond: number = parseFloat(
      (document.getElementById("cs-end-second") as HTMLInputElement).value
    );
    endTimestamp = endHour * 3600 + endMinute * 60 + endSecond * 1;

    if (endTimestamp >= maxDuration) endTimestamp = undefined; // assume it until end
  }

  if (endTimestamp !== undefined && endTimestamp <= timestamp) {
    addErrorMsg(
      "End Time either check the until end or it should larger than start time"
    );
    (
      document.getElementById("cs-confirm-button") as HTMLButtonElement
    ).disabled = false;
    return;
  }
  const data = {
    id: uuidv4(),
    url,
    videoId,
    title,
    channelName,
    timestamp,
    endTimestamp, // undefined mean until to end
    maxDuration,
    volume,
  };
  console.log(data);
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
  (document.getElementById("cs-dialog") as HTMLDialogElement).close();
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
const clearErrorMsg = () => {
  const errorContainer = document.getElementsByClassName("cs-error-container");
  errorContainer[0].replaceChildren();
};
const addErrorMsg = (error: string) => {
  const message = document.createElement("p");
  message.innerHTML = error;
  const errorContainer = document.getElementsByClassName("cs-error-container");
  errorContainer[0].append(message);
};
const disableEndTimeGroup = (disable: boolean) => {
  (document.getElementById("cs-end-hour") as HTMLInputElement).disabled =
    disable;
  (document.getElementById("cs-end-minute") as HTMLInputElement).disabled =
    disable;
  (document.getElementById("cs-end-second") as HTMLInputElement).disabled =
    disable;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { type, url, videoId, isPlayTab, endTimestamp, enablePin, volume } =
    request;
  switch (type) {
    case csMsgType.OnYoutubeVideoPage:
      onYoutubeVideoPage(
        url,
        videoId,
        isPlayTab,
        endTimestamp,
        enablePin,
        volume
      );
      break;
    case csMsgType.PlayYoutubeVideo:
      onPlayVideo();
      break;
    case csMsgType.PauseYoutubeVideo:
      onPauseVideo();
      break;
    case csMsgType.CheckExists:
      break;
    default:
  }
  sendResponse({ state: "ok" });
});

chrome.storage.onChanged.addListener(
  (
    changes: { [key: string]: chrome.storage.StorageChange },
    namespace: "sync" | "local" | "managed" | "session"
  ) => {
    if ("enablePin" in changes) {
      setPinVisibility(!!changes["enablePin"].newValue);
    }
  }
);

/*
In case of the browser directly go to the youtube video page, the content script on Message
event handler has not yet set up when the background script send the event. 
The self invocation function ensure the page set up properly at that case
*/
(function () {
  const href = window.location.href;
  const query: string = href.split("?")[1];
  const params: URLSearchParams = new URLSearchParams(query);
  const videoId = params.get("v");
  if (!videoId) return;
  const url = href.split("?")[0];
  chrome.storage.local.get(["enablePin"], (result) => {
    const enablePin = !!result["enablePin"];
    onYoutubeVideoPage(
      url,
      videoId || "",
      false,
      undefined,
      enablePin,
      undefined
    );
  });
})();
