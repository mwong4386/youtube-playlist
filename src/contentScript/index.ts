import MsgType from "../constants/msgType";
import { v4 as uuidv4 } from "uuid";
import csMsgType from "../constants/csMsgType";
import MPlaylistItem from "../models/MPlaylistItem";
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
import {
  getAutonavCancelButton,
  getAutonavCountdownOverlay,
  getBookmarkButton,
  getChannelNameElement,
  getChannelNameFromPage,
  getConfirmButton,
  getDialog,
  getEndHourInput,
  getEndMinuteInput,
  getEndSecondInput,
  getErrorContainer,
  getPlayerControls,
  getResetStartTimeButton,
  getRightControls,
  getStartHourInput,
  getStartMinuteInput,
  getStartSecondInput,
  getTimeInputs,
  getUntilEndInput,
  getVideoTitleElement,
  getVolumeInput,
  getVolumeText,
  getYoutubePlayer,
} from "./youtubeDom";

let onCSConfirm: (e: Event) => any;
export let _duration: number = NaN;
let cleanupPlaybackHandlers: (() => void) | null = null;
let cleanupVolumeEnforcer: (() => void) | null = null;

const ensureVideoPlayback = (video: HTMLVideoElement) => {
  let attempts = 0;

  const playVideo = () => {
    const result = video.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => {
        // Ignore transient autoplay failures while the page is still settling.
      });
    }
  };

  playVideo();

  const intervalId = window.setInterval(() => {
    if (!video.paused || video.ended || attempts++ >= 10) {
      window.clearInterval(intervalId);
      return;
    }

    playVideo();
  }, 300);
};

const applyVideoVolume = (video: HTMLVideoElement, volume: number) => {
  cleanupVolumeEnforcer?.();
  cleanupVolumeEnforcer = null;

  const nextVolume = volume / 100;
  const enforceVolume = () => {
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
  };

  enforceVolume();

  const refreshIntervalId = window.setInterval(enforceVolume, 50);
  video.addEventListener("volumechange", enforceVolume);

  const timeoutId = window.setTimeout(() => {
    window.clearInterval(refreshIntervalId);
    video.removeEventListener("volumechange", enforceVolume);
    enforceVolume();
  }, 800);

  cleanupVolumeEnforcer = () => {
    window.clearInterval(refreshIntervalId);
    window.clearTimeout(timeoutId);
    video.removeEventListener("volumechange", enforceVolume);
  };
};

const onYoutubeVideoPage = (
  url: string,
  videoId: string,
  isPlayTab: boolean,
  endTimestamp: number | undefined,
  enablePin: boolean,
  volume: number | false | undefined
) => {
  const bookmark = getBookmarkButton();
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
      getConfirmButton().disabled = true;
      onBookmarkSave(url, videoId);
    };

    const player = getPlayerControls();
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
      getConfirmButton().addEventListener("click", onCSConfirm);
      // Close the dialog when click the backdrop
      getDialog().addEventListener("click", (event) => {
        if ((event.target as HTMLElement).id === "cs-dialog") {
          (event.target as HTMLDialogElement).close();
        }
      });
      getUntilEndInput().addEventListener("change", (event: Event) => {
        const element = event.currentTarget as HTMLInputElement;
        const checked = element.checked;
        disableEndTimeGroup(checked);
      });
      const items = getTimeInputs();
      for (const item of items) {
        //Select the full text when focus the inputbox
        item.addEventListener("focus", (event) =>
          (event?.target as HTMLInputElement)?.select()
        );
      }
      getResetStartTimeButton()?.addEventListener("click", onResetClick);
      const volume = getVolumeInput();
      volume.oninput = (event: Event) => {
        getVolumeText().innerHTML = volume.value;
        video.volume = parseInt(volume.value) / 100;
      };
    });
    //Add a + button to the youtube control button group, it will open the dialog
    const bookmarkBtn = document.createElement("button");
    bookmarkBtn.style.cssText =
      "position: relative; display:flex; align-items:center; justify-content:center; font-size:36px; height:100%; line-height:1; padding:0 8px; left:0;";
    bookmarkBtn.className = "ytp-button bookmark-button";
    bookmarkBtn.innerText = "+";
    bookmarkBtn.title = "Click to open bookmark dialog";

    bookmarkBtn.addEventListener("click", onCSOpenDialogClickHandler);
    const rightControls = getRightControls();
    for (let rightControl of rightControls) {
      rightControl.prepend(bookmarkBtn);
    }
    createStartPin(enablePin);
    createStopPin(enablePin);
  } else {
    //bookmark.addEventListener("click", onCSOpenDialogClickHandler);
    // Rebind the confirm handler with new url and video id
    getConfirmButton().removeEventListener("click", onCSConfirm);

    onCSConfirm = (e) => {
      e.preventDefault();
      getConfirmButton().disabled = true;
      onBookmarkSave(url, videoId);
    };

    getConfirmButton().addEventListener("click", onCSConfirm);
    moveStartPin(getStartTime());
    setPinVisibility(enablePin);
  }

  if (isPlayTab) {
    video = video || getYoutubePlayer(); /*document.getElementsByClassName(
      "video-stream html5-main-video"
    )[0] as HTMLVideoElement;*/

    cleanupPlaybackHandlers?.();
    cleanupPlaybackHandlers = null;

    ensureVideoPlayback(video);

    if (volume !== undefined && volume !== false) {
      applyVideoVolume(video, volume);
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
        const overlay = getAutonavCountdownOverlay();
        if (overlay && overlay.style.display !== "none") {
          getAutonavCancelButton()?.click();
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

    // If autoplay already started before these listeners were attached,
    // push the current state once so the popup stays in sync.
    if (video.ended) {
      chrome.runtime.sendMessage({ name: MsgType.VideoEnd });
    } else if (video.paused) {
      chrome.runtime.sendMessage({ name: MsgType.VideoPauseEvent });
    } else {
      chrome.runtime.sendMessage({ name: MsgType.VideoPlayEvent });
    }

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
    cleanupPlaybackHandlers = () => {
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

    window.onbeforeunload = () => {
      cleanupPlaybackHandlers?.();
      cleanupPlaybackHandlers = null;
      cleanupVolumeEnforcer?.();
      cleanupVolumeEnforcer = null;
    };
  }
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

  const channelName = getChannelNameFromPage()?.innerHTML || "";

  getVideoTitleElement().innerHTML = title;
  getChannelNameElement().innerHTML = channelName;

  const video: HTMLVideoElement | undefined = getYoutubePlayer();
  const volumeRate = Math.floor(video.volume * 100).toString();
  getVolumeInput().value = volumeRate;
  getVolumeText().innerHTML = volumeRate;

  const timestamp = getStartTime();
  const [hours, minutes, seconds] = getHourMinuteSecond(timestamp, false);

  getStartHourInput().value = hours.toString();
  getStartMinuteInput().value = minutes.toString();
  getStartSecondInput().value = seconds.toString();

  const end_time = Math.floor(getEndTime());
  const [end_hours, end_minutes, end_seconds] = getHourMinuteSecond(
    end_time,
    false
  );

  getEndHourInput().value = end_hours.toString();
  getEndMinuteInput().value = end_minutes.toString();
  getEndSecondInput().value = end_seconds.toString();

  const dialog = getDialog();
  getConfirmButton().disabled = false;
  const isUntilEnd = getEndTime() === _duration;
  getUntilEndInput().checked = isUntilEnd;
  disableEndTimeGroup(isUntilEnd);
  dialog.showModal();
};

const onResetClick = () => {
  getStartHourInput().value = "0";
  getStartMinuteInput().value = "0";
  getStartSecondInput().value = "0";
  moveStartPin(0);
};

const onBookmarkSave = (url: string, videoId: string) => {
  clearErrorMsg();
  const hour: number = parseFloat(getStartHourInput().value);
  const minute: number = parseFloat(getStartMinuteInput().value);
  const second: number = parseFloat(getStartSecondInput().value);

  const timestamp = hour * 3600 + minute * 60 + second * 1;

  const title = getVideoTitleElement().innerHTML;
  const channelName = getChannelNameElement().innerHTML;
  const volume = parseInt(getVolumeInput().value);
  const untilEnd = getUntilEndInput().checked;
  let endTimestamp: number | undefined = undefined;

  const video = getYoutubePlayer();
  const maxDuration = video?.duration;
  //if until end is checked, the endtime will not save
  if (!untilEnd) {
    const endHour: number = parseFloat(getEndHourInput().value);
    const endMinute: number = parseFloat(getEndMinuteInput().value);
    const endSecond: number = parseFloat(getEndSecondInput().value);
    endTimestamp = endHour * 3600 + endMinute * 60 + endSecond * 1;

    if (endTimestamp >= maxDuration) endTimestamp = undefined; // assume it until end
  }

  if (endTimestamp !== undefined && endTimestamp <= timestamp) {
    addErrorMsg(
      "Either check the until end or end time should larger than start time"
    );
    getConfirmButton().disabled = false;
    return;
  }
  const data: MPlaylistItem = {
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
      getConfirmButton().disabled = false;
      return;
    }

    const list = Array.isArray(result["youtube_list"])
      ? (result["youtube_list"] as MPlaylistItem[])
      : [];

    chrome.storage.sync.set({
      youtube_list: [...list, data],
    }, () => {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError);
        getConfirmButton().disabled = false;
        return;
      }

      getDialog().close();
    });
  });
};

const onPlayVideo = () => {
  const video = getYoutubePlayer();
  video.play();
};

const onPauseVideo = () => {
  const video = getYoutubePlayer();
  video.pause();
};
const onVolumeChange = (volume: number) => {
  const video = getYoutubePlayer();
  applyVideoVolume(video, Number(volume));
};
const clearErrorMsg = () => {
  getErrorContainer()?.replaceChildren();
};
const addErrorMsg = (error: string) => {
  const message = document.createElement("p");
  message.innerHTML = error;
  getErrorContainer()?.append(message);
};
const disableEndTimeGroup = (disable: boolean) => {
  getEndHourInput().disabled = disable;
  getEndMinuteInput().disabled = disable;
  getEndSecondInput().disabled = disable;
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
