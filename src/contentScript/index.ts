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
import { getHourMinuteSecond } from "../utils/date";

let onCSConfirm: (e: Event) => any;
export let _duration: number = NaN;
const onYoutubeVideoPage = (
  url: string,
  videoId: string,
  isPlayTab: boolean,
  endTimestamp: number | undefined,
  enablePin: boolean,
  volume: number | false | undefined
) => {
  const bookmark = document.getElementsByClassName("bookmark-button")[0];
  setStartTime(0);
  let video: HTMLVideoElement = getYoutubePlayer();

  //The video may not yet have the meta data, those case will be handle later
  if (video.duration > 0) {
    _duration = Math.floor(video.duration);
    setEndTime(_duration);
  } else {
    setEndTime(0);
  }

  //bookmark will serve as flag as well
  if (!bookmark) {
    const durationChangeHandler = () => {
      _duration = Math.floor(video.duration);
      setEndTime(_duration);
      moveEndPin(getEndTime());
    };
    video.addEventListener("durationchange", durationChangeHandler);
    video.addEventListener("loadedmetadata", durationChangeHandler);
    onCSConfirm = (e) => {
      e.preventDefault();
      (
        document.getElementById("cs-confirm-button") as HTMLButtonElement
      ).disabled = true;
      onBookmarkSave(url, videoId);
    };

    const player = document.querySelector("#player .ytp-chrome-bottom");
    if (player) {
      //Accomodate the pin when resizing the control panel
      new ResizeObserver((e) => {
        const entry = e[0];
        if (entry.contentRect) {
          setMaxX(entry.contentRect.width);
          moveStartPin(getStartTime());
          moveEndPin(getEndTime());
        }
      }).observe(player);
    }
    //Insert the dialog html
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
      const items = document.getElementsByClassName("cs-time-inputgroup");
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
        video.volume = parseInt(volume.value) / 100;
      };
    });
    //Add a + button to the youtube control button group, it will open the dialog
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
      onBookmarkSave(url, videoId);
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
    if (volume !== undefined && volume !== false) {
      // It need to compete with the youtube own handler
      const volumeHandler = () => {
        video.volume = volume / 100;
      };
      const refreshIntervalId = setInterval(volumeHandler, 50);
      video.addEventListener("volumechange", volumeHandler);
      video.volume = volume / 100;
      setTimeout(() => {
        //magic number...
        clearInterval(refreshIntervalId);
        video.removeEventListener("volumechange", volumeHandler);
        video.volume = volume / 100;
      }, 800);
    }
    //Register different event handler to notify the status of the video
    let isEnd = false;
    const timeupdateHandler = () => {
      //The comparison use === instead of >=, as i want to keep the video if the user
      //jump to later video
      if (!isEnd && Math.floor(video.currentTime) === endTimestamp) {
        isEnd = true;
        chrome.runtime.sendMessage({ name: MsgType.VideoEnd });
      }
    };
    if (endTimestamp) {
      video.addEventListener("timeupdate", timeupdateHandler);
    }

    const endedHandler = () => {
      console.log("video ended");
      let count = 0;
      //stop the video if the next video is auto play
      const interval = setInterval(() => {
        if (
          document.getElementsByClassName(
            "ytp-autonav-endscreen-countdown-overlay"
          ).length > 0 &&
          (
            document.getElementsByClassName(
              "ytp-autonav-endscreen-countdown-overlay"
            )[0] as HTMLElement
          ).style.display !== "none"
        ) {
          (
            document.getElementsByClassName(
              "ytp-autonav-endscreen-upnext-cancel-button"
            )[0] as HTMLButtonElement
          )?.click();
          console.log("stop the next video", count);
          clearInterval(interval);
        } else if (count++ > 9) {
          clearInterval(interval);
        }
      }, 500);
      chrome.runtime.sendMessage({ name: MsgType.VideoEnd });
    };
    video.addEventListener("ended", endedHandler);

    const playHandler = () => {
      chrome.runtime.sendMessage({ name: MsgType.VideoPlayEvent });
    };
    video.addEventListener("play", playHandler);

    const pauseHandler = () => {
      chrome.runtime.sendMessage({ name: MsgType.VideoPauseEvent });
    };
    video.addEventListener("pause", pauseHandler);

    const enterpictureinpictureHandler = () => {
      chrome.runtime.sendMessage({ name: MsgType.EnterPip });
    };
    video.addEventListener(
      "enterpictureinpicture",
      enterpictureinpictureHandler
    );

    const leavepictureinpictureHandler = () => {
      chrome.runtime.sendMessage({ name: MsgType.ExitPip });
    };
    video.addEventListener(
      "leavepictureinpicture",
      leavepictureinpictureHandler
    );
    window.onbeforeunload = () => {
      video.removeEventListener("timeupdate", timeupdateHandler);
      video.removeEventListener("ended", endedHandler);
      video.removeEventListener("play", playHandler);
      video.removeEventListener("pause", pauseHandler);
      video.removeEventListener(
        "enterpictureinpicture",
        enterpictureinpictureHandler
      );
      video.removeEventListener(
        "leavepictureinpicture",
        leavepictureinpictureHandler
      );
    };
  }
};

const getYoutubePlayer = () => {
  const videos = document.getElementsByTagName("video");
  return videos[videos.length - 1] as HTMLVideoElement;
};

export const getHtmlFromResource = (url: string) => {
  return fetch(chrome.runtime.getURL(url)).then((r) => r.text());
};

const onCSOpenDialogClickHandler = () => {
  //Tidy up the information showing on the dialog
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
  const [hours, minutes, seconds] = getHourMinuteSecond(timestamp, false);

  (document.getElementById("cs-start-hour") as HTMLInputElement).value =
    hours.toString();
  (document.getElementById("cs-start-minute") as HTMLInputElement).value =
    minutes.toString();
  (document.getElementById("cs-start-second") as HTMLInputElement).value =
    seconds.toString();

  const end_time = Math.floor(getEndTime());
  const [end_hours, end_minutes, end_seconds] = getHourMinuteSecond(
    end_time,
    false
  );

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

const onBookmarkSave = (url: string, videoId: string) => {
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
  //if until end is checked, the endtime will not save
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
      "Either check the until end or end time should larger than start time"
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
const onVolumeChange = (volume: number) => {
  const video = getYoutubePlayer();
  video.volume = volume / 100;
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
  console.log("on Message", request);
  switch (type) {
    case csMsgType.OnYoutubeVideoPage:
      if (window.location.href === url) {
        //if the information is outdated, ignore it
        onYoutubeVideoPage(
          url.split("?")[0],
          videoId,
          isPlayTab,
          endTimestamp,
          enablePin,
          volume
        );
      }
      break;
    case csMsgType.PlayYoutubeVideo:
      onPlayVideo();
      break;
    case csMsgType.PauseYoutubeVideo:
      onPauseVideo();
      break;
    case csMsgType.CheckExists:
      break;
    case csMsgType.VolumeChange:
      onVolumeChange(volume);
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
The self invocation function ensure those case will still have someone to handle
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
