const getById = <T extends HTMLElement>(id: string) => {
  return document.getElementById(id) as T;
};

const getByClassName = <T extends Element>(className: string) => {
  return document.getElementsByClassName(className) as HTMLCollectionOf<T>;
};

export const getBookmarkButton = () => {
  return document.querySelector(".bookmark-button") as HTMLButtonElement | null;
};

export const getYoutubePlayer = () => {
  const mainPlayerVideo = document.querySelector(
    "#movie_player video.video-stream.html5-main-video"
  ) as HTMLVideoElement | null;

  if (mainPlayerVideo) {
    return mainPlayerVideo;
  }

  const visibleVideo = Array.from(document.getElementsByTagName("video")).find(
    (video) => video.offsetParent !== null
  );

  if (visibleVideo) {
    return visibleVideo as HTMLVideoElement;
  }

  const videos = document.getElementsByTagName("video");
  return videos[videos.length - 1] as HTMLVideoElement;
};

export const getPlayerControls = () => {
  return document.querySelector("#player .ytp-chrome-bottom") as HTMLElement | null;
};

export const getRightControls = () => {
  return getByClassName<HTMLElement>("ytp-right-controls");
};

export const getAutonavCountdownOverlay = () => {
  return document.querySelector(
    ".ytp-autonav-endscreen-countdown-overlay"
  ) as HTMLElement | null;
};

export const getAutonavCancelButton = () => {
  return document.querySelector(
    ".ytp-autonav-endscreen-upnext-cancel-button"
  ) as HTMLButtonElement | null;
};

export const getChannelNameFromPage = () => {
  return document.querySelector(
    "#owner #upload-info ytd-channel-name .yt-formatted-string"
  ) as HTMLElement | null;
};

export const getConfirmButton = () => getById<HTMLButtonElement>("cs-confirm-button");

export const getDialog = () => getById<HTMLDialogElement>("cs-dialog");

export const getUntilEndInput = () => getById<HTMLInputElement>("cs-untilEnd");

export const getTimeInputs = () => {
  return getByClassName<HTMLElement>("cs-time-inputgroup");
};

export const getResetStartTimeButton = () =>
  getById<HTMLButtonElement>("cs-reset-starttime");

export const getVolumeInput = () => getById<HTMLInputElement>("cs-volume");

export const getVolumeText = () => getById<HTMLElement>("cs-volume-text");

export const getEqPresetInput = () =>
  getById<HTMLSelectElement>("cs-eq-preset");

export const getVideoTitleElement = () => getById<HTMLElement>("cs-video-title");

export const getChannelNameElement = () => getById<HTMLElement>("cs-channel-name");

export const getStartHourInput = () => getById<HTMLInputElement>("cs-start-hour");

export const getStartMinuteInput = () =>
  getById<HTMLInputElement>("cs-start-minute");

export const getStartSecondInput = () =>
  getById<HTMLInputElement>("cs-start-second");

export const getEndHourInput = () => getById<HTMLInputElement>("cs-end-hour");

export const getEndMinuteInput = () => getById<HTMLInputElement>("cs-end-minute");

export const getEndSecondInput = () => getById<HTMLInputElement>("cs-end-second");

export const getErrorContainer = () => {
  return document.querySelector(".cs-error-container") as HTMLElement | null;
};
