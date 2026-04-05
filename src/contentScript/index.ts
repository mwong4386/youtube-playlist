import { v4 as uuidv4 } from "uuid";
import csMsgType from "../constants/csMsgType";
import MsgType from "../constants/msgType";
import AudioEqSettings from "../models/AudioEq";
import {
  AUDIO_EQ_MAX,
  AUDIO_EQ_MIN,
  cloneAudioEqSettings,
  AUDIO_EQ_BANDS,
  normalizeAudioEqSettings,
} from "../utils/audioEq";
import MPlaylistItem from "../models/MPlaylistItem";
import { getHourMinuteSecond } from "../utils/date";
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
let hasInjectedVolumeBridge = false;
let audioContext: AudioContext | null = null;
let currentEqVideo: HTMLVideoElement | null = null;
let currentEqSource: MediaElementAudioSourceNode | null = null;
let eqFilters: Partial<Record<keyof AudioEqSettings, BiquadFilterNode>> = {};
let currentAudioEqSettings = cloneAudioEqSettings();
let currentEqButton: HTMLButtonElement | null = null;
let currentEqPanel: HTMLDivElement | null = null;
let cleanupEqOutsideClick: (() => void) | null = null;
let isCurrentPlaybackTab = false;

const YT_VOLUME_EVENT = "youtube-playlist:set-volume";
const PLAYER_VOLUME_RETRY_DELAYS_MS = [120, 320, 700];

const ensureAudioEqGraph = (video: HTMLVideoElement) => {
  const hasAllFilters = AUDIO_EQ_BANDS.every((band) => !!eqFilters[band.key]);

  if (
    audioContext &&
    currentEqVideo === video &&
    currentEqSource &&
    hasAllFilters
  ) {
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => undefined);
    }
    return {
      context: audioContext,
      filters: eqFilters as Record<keyof AudioEqSettings, BiquadFilterNode>,
    };
  }

  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }

  if (currentEqSource && currentEqVideo !== video) {
    try {
      currentEqSource.disconnect();
    } catch (error) {
      // Ignore disconnect errors when YouTube swaps media elements.
    }
  }

  Object.values(eqFilters).forEach((filter) => {
    try {
      filter?.disconnect();
    } catch (error) {
      // Ignore disconnect errors while rebuilding the chain.
    }
  });

  currentEqSource = audioContext.createMediaElementSource(video);
  let previousNode: AudioNode = currentEqSource;
  eqFilters = {};

  for (const band of AUDIO_EQ_BANDS) {
    const filter = audioContext.createBiquadFilter();
    filter.frequency.value = band.frequency;
    if (band.key === "clearBass") {
      filter.type = "lowshelf";
    } else if (band.key === "band16k") {
      filter.type = "highshelf";
    } else {
      filter.type = "peaking";
      filter.Q.value = 1.1;
    }

    previousNode.connect(filter);
    previousNode = filter;
    eqFilters[band.key] = filter;
  }

  previousNode.connect(audioContext.destination);
  currentEqVideo = video;

  return {
    context: audioContext,
    filters: eqFilters as Record<keyof AudioEqSettings, BiquadFilterNode>,
  };
};

const applyVideoEq = (
  video: HTMLVideoElement,
  settings?: Partial<AudioEqSettings> | null,
) => {
  const normalizedSettings = normalizeAudioEqSettings({
    ...currentAudioEqSettings,
    ...settings,
  });
  currentAudioEqSettings = normalizedSettings;
  const graph = ensureAudioEqGraph(video);
  if (!graph) {
    return;
  }

  for (const band of AUDIO_EQ_BANDS) {
    graph.filters[band.key].gain.value = normalizedSettings[band.key];
  }
  syncEqPanelUi(normalizedSettings);
};

const ensureFloatingPanelStyles = () => {
  if (document.getElementById("yt-playlist-panel-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "yt-playlist-panel-style";
  style.textContent = `
    .yt-playlist-panel {
      position: absolute;
      right: 24px;
      bottom: 136px;
      width: 360px;
      padding: 16px 16px 14px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(17, 17, 17, 0.96), rgba(28, 28, 28, 0.94));
      color: #fff;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
      z-index: 2147483647;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      box-sizing: border-box;
    }
    .yt-playlist-panel[hidden] {
      display: none;
    }
    .yt-playlist-panel__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .yt-playlist-panel__title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin: 0;
    }
    .yt-playlist-panel__close {
      border: 0;
      padding: 0;
      background: transparent;
      color: rgba(255, 255, 255, 0.8);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }
    .yt-playlist-panel__close:hover {
      color: #fff;
    }
    .yt-playlist-panel__close:active {
      color: rgba(255, 255, 255, 0.7);
    }
    dialog.yt-playlist-panel {
      margin: 0;
      border: 0;
      inset: auto auto auto auto;
      overflow: hidden;
    }
    dialog.yt-playlist-panel::backdrop {
      background: transparent;
    }
    @media (max-width: 640px) {
      .yt-playlist-panel,
      dialog.yt-playlist-panel {
        right: 16px;
        left: 16px;
        bottom: 16px;
        width: auto;
        max-width: none;
        inset: auto 16px 16px 16px;
      }
    }
    .yt-playlist-eq-panel {
      max-width: calc(100vw - 32px);
    }
    .yt-playlist-eq-panel__header {
      margin-bottom: 14px;
    }
    .yt-playlist-eq-panel__title {
      margin: 0;
    }
    .yt-playlist-eq-panel__hint {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.64);
      margin-top: 4px;
    }
    .yt-playlist-eq-panel__bands {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      align-items: end;
    }
    .yt-playlist-eq-panel__band {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .yt-playlist-eq-panel__value {
      font-size: 11px;
      color: #f7c66e;
      min-height: 14px;
    }
    .yt-playlist-eq-panel__track {
      height: 156px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .yt-playlist-eq-panel__slider {
      width: 22px;
      height: 132px;
      margin: 0;
      writing-mode: vertical-lr;
      direction: rtl;
      accent-color: #f7c66e;
      cursor: pointer;
    }
    .yt-playlist-eq-panel__label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
      line-height: 1.2;
      min-height: 28px;
    }
    .yt-playlist-eq-panel__scale {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.45);
    }
    .yt-playlist-eq-button {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      min-width: 38px;
      height: 100%;
      padding: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .yt-playlist-eq-button__label {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      text-align: center;
      line-height: 1;
      transform: translateY(-1px);
      pointer-events: none;
    }
  `;

  document.head.append(style);
};

const formatEqValue = (value: number) => {
  return value > 0 ? `+${value}` : `${value}`;
};

const positionPanelAboveAnchor = (
  panel: HTMLElement,
  anchor: HTMLElement | null,
  horizontalAnchor?: HTMLElement | null,
) => {
  if (!anchor) {
    panel.style.removeProperty("top");
    panel.style.removeProperty("bottom");
    panel.style.removeProperty("right");
    panel.style.removeProperty("left");
    return;
  }

  const anchorRect = anchor.getBoundingClientRect();
  const horizontalRect = (horizontalAnchor ?? anchor).getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const gap = 14;
  const margin = 16;
  const rightInset = -10;
  const top = Math.max(
    window.scrollY + margin,
    window.scrollY + anchorRect.top - panelRect.height - gap,
  );
  const left = Math.max(
    window.scrollX + margin,
    window.scrollX + horizontalRect.right - panelRect.width + rightInset,
  );

  panel.style.top = `${Math.round(top)}px`;
  panel.style.left = `${Math.round(left)}px`;
  panel.style.bottom = "auto";
  panel.style.right = "auto";
};

const getRightControlsAnchor = () => {
  const rightControls = Array.from(getRightControls());
  return rightControls[rightControls.length - 1] ?? null;
};

const closeBookmarkDialog = () => {
  const dialog = document.getElementById("cs-dialog") as HTMLDialogElement | null;
  if (dialog?.open) {
    dialog.close();
  }
};

const closeEqPanel = () => {
  if (currentEqPanel && !currentEqPanel.hidden) {
    currentEqPanel.hidden = true;
  }
};

const ensureEqOutsideClickHandler = (
  panel: HTMLDivElement,
  button: HTMLButtonElement,
) => {
  cleanupEqOutsideClick?.();
  const onDocumentPointerDown = (event: MouseEvent) => {
    if (panel.hidden) {
      return;
    }

    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    if (panel.contains(target) || button.contains(target)) {
      return;
    }

    panel.hidden = true;
  };

  document.addEventListener("mousedown", onDocumentPointerDown);
  cleanupEqOutsideClick = () => {
    document.removeEventListener("mousedown", onDocumentPointerDown);
  };
};

const syncEqPanelUi = (settings: AudioEqSettings = currentAudioEqSettings) => {
  if (!currentEqPanel) {
    return;
  }

  for (const band of AUDIO_EQ_BANDS) {
    const slider = currentEqPanel.querySelector(
      `[data-eq-slider="${band.key}"]`,
    ) as HTMLInputElement | null;
    const value = currentEqPanel.querySelector(
      `[data-eq-value="${band.key}"]`,
    ) as HTMLElement | null;

    if (slider && slider.value !== settings[band.key].toString()) {
      slider.value = settings[band.key].toString();
    }
    if (value) {
      value.textContent = formatEqValue(settings[band.key]);
    }
  }

  const hint = currentEqPanel.querySelector(
    "[data-eq-save-hint]",
  ) as HTMLElement | null;
  if (hint) {
    hint.textContent = isCurrentPlaybackTab
      ? "Drag to preview. Release to save to the current song."
      : "Preview only here. Start playback from the playlist to save.";
  }
};

const readEqPanelSettings = (): AudioEqSettings => {
  return AUDIO_EQ_BANDS.reduce((settings, band) => {
    const slider = currentEqPanel?.querySelector(
      `[data-eq-slider="${band.key}"]`,
    ) as HTMLInputElement | null;
    settings[band.key] = slider ? Number(slider.value) : currentAudioEqSettings[band.key];
    return settings;
  }, cloneAudioEqSettings(currentAudioEqSettings));
};

const sendEqSettingsToBackground = (settings: AudioEqSettings, persist: boolean) => {
  chrome.runtime.sendMessage({
    name: MsgType.AudioEqChange,
    audioEq: settings,
    persist,
  });
};

const ensureEqPanel = () => {
  ensureFloatingPanelStyles();
  if (currentEqPanel) {
    syncEqPanelUi();
    return currentEqPanel;
  }

  const panel = document.createElement("div");
  panel.className = "yt-playlist-panel yt-playlist-eq-panel";
  panel.hidden = true;

  const bandsMarkup = AUDIO_EQ_BANDS.map(
    (band) => `
      <div class="yt-playlist-eq-panel__band">
        <span class="yt-playlist-eq-panel__value" data-eq-value="${band.key}">0</span>
        <div class="yt-playlist-eq-panel__track">
          <input
            class="yt-playlist-eq-panel__slider"
            data-eq-slider="${band.key}"
            type="range"
            min="${AUDIO_EQ_MIN}"
            max="${AUDIO_EQ_MAX}"
            step="1"
            value="0"
          />
        </div>
        <span class="yt-playlist-eq-panel__label">${band.shortLabel}</span>
      </div>
    `,
  ).join("");

  panel.innerHTML = `
    <div class="yt-playlist-panel__header yt-playlist-eq-panel__header">
      <div>
        <p class="yt-playlist-panel__title yt-playlist-eq-panel__title">Song EQ</p>
        <div class="yt-playlist-eq-panel__hint" data-eq-save-hint></div>
      </div>
      <button class="yt-playlist-panel__close yt-playlist-eq-panel__close" type="button" aria-label="Close EQ panel">x</button>
    </div>
    <div class="yt-playlist-eq-panel__bands">${bandsMarkup}</div>
    <div class="yt-playlist-eq-panel__scale">
      <span>${AUDIO_EQ_MIN}</span>
      <span>0</span>
      <span>+${AUDIO_EQ_MAX}</span>
    </div>
  `;

  panel
    .querySelector(".yt-playlist-eq-panel__close")
    ?.addEventListener("click", () => {
      panel.hidden = true;
    });

  panel.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement;
    if (!target.matches("[data-eq-slider]")) {
      return;
    }

    const nextSettings = readEqPanelSettings();
    const video = getYoutubePlayer();
    if (video) {
      applyVideoEq(video, nextSettings);
    }
  });

  panel.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement;
    if (!target.matches("[data-eq-slider]")) {
      return;
    }

    const nextSettings = readEqPanelSettings();
    const video = getYoutubePlayer();
    if (video) {
      applyVideoEq(video, nextSettings);
    }
    if (isCurrentPlaybackTab) {
      sendEqSettingsToBackground(nextSettings, true);
    }
  });

  document.body.append(panel);
  currentEqPanel = panel;
  syncEqPanelUi();
  return currentEqPanel;
};

const ensureEqButton = () => {
  if (currentEqButton) {
    return currentEqButton;
  }

  const button = document.createElement("button");
  button.className = "ytp-button yt-playlist-eq-button";
  button.title = "Click to open song EQ";
  button.innerHTML = `<span class="yt-playlist-eq-button__label">EQ</span>`;
  const panel = ensureEqPanel();
  ensureEqOutsideClickHandler(panel, button);
  button.addEventListener("click", () => {
    if (panel.hidden) {
      closeBookmarkDialog();
    }
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      positionPanelAboveAnchor(panel, button, getRightControlsAnchor());
      syncEqPanelUi();
    }
  });

  currentEqButton = button;
  return button;
};

const ensureYoutubeVolumeBridge = () => {
  if (hasInjectedVolumeBridge) {
    return;
  }

  const script = document.createElement("script");
  script.dataset.youtubePlaylistVolumeBridge = "true";
  script.src = chrome.runtime.getURL("volumeBridge.js");

  (document.documentElement || document.head || document.body).appendChild(
    script,
  );
  script.addEventListener("load", () => {
    script.remove();
  });
  hasInjectedVolumeBridge = true;
};

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

  const normalizedVolume = Math.max(0, Math.min(100, volume));
  const nextVolume = normalizedVolume / 100;

  const syncNativeVolume = () => {
    const currentVideo = getYoutubePlayer() || video;
    ensureYoutubeVolumeBridge();
    window.dispatchEvent(
      new CustomEvent(YT_VOLUME_EVENT, {
        detail: { volume: normalizedVolume },
      }),
    );
    if (Math.abs(currentVideo.volume - nextVolume) > 0.001) {
      currentVideo.volume = nextVolume;
    }
    currentVideo.muted = nextVolume === 0;
  };

  syncNativeVolume();

  const timeoutIds = PLAYER_VOLUME_RETRY_DELAYS_MS.map((delay) =>
    window.setTimeout(syncNativeVolume, delay),
  );

  cleanupVolumeEnforcer = () => {
    timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  };
};

const onYoutubeVideoPage = (
  url: string,
  videoId: string,
  isPlayTab: boolean,
  endTimestamp: number | undefined,
  enablePin: boolean,
  volume: number | false | undefined,
  audioEq?: AudioEqSettings,
) => {
  isCurrentPlaybackTab = isPlayTab;
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
          (event?.target as HTMLInputElement)?.select(),
        );
      }
      getResetStartTimeButton()?.addEventListener("click", onResetClick);
      const volume = getVolumeInput();
      volume.oninput = (event: Event) => {
        getVolumeText().innerHTML = volume.value;
        applyVideoVolume(video, parseInt(volume.value));
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
    const eqButton = ensureEqButton();
    const rightControls = getRightControls();
    for (let rightControl of rightControls) {
      rightControl.prepend(bookmarkBtn);
      bookmarkBtn.insertAdjacentElement("afterend", eqButton);
    }
    ensureEqPanel();
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
    ensureEqButton();
    ensureEqPanel();
  }

  currentAudioEqSettings = normalizeAudioEqSettings(audioEq);
  syncEqPanelUi(currentAudioEqSettings);

  if (isPlayTab) {
    video = video || getYoutubePlayer(); /*document.getElementsByClassName(
      "video-stream html5-main-video"
    )[0] as HTMLVideoElement;*/

    cleanupPlaybackHandlers?.();
    cleanupPlaybackHandlers = null;
    //Register different event handler to notify the status of the video
    let isEnd = false;
    const timeupdateHandler = () => {
      //The comparison use === instead of >=, as i want to keep the video if the user
      //jump to later video
      if (!isEnd && Math.floor(video.currentTime) === endTimestamp) {
        isEnd = true;
        chrome.runtime.sendMessage({ name: MsgType.VideoEnd, videoId });
      }
    };
    if (endTimestamp) {
      video.addEventListener("timeupdate", timeupdateHandler);
    }

    const endedHandler = () => {
      let count = 0;
      //stop the video if the next video is auto play
      const interval = setInterval(() => {
        const overlay = getAutonavCountdownOverlay();
        if (overlay && overlay.style.display !== "none") {
          getAutonavCancelButton()?.click();
          clearInterval(interval);
        } else if (count++ > 9) {
          clearInterval(interval);
        }
      }, 500);
      chrome.runtime.sendMessage({ name: MsgType.VideoEnd, videoId });
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

    ensureVideoPlayback(video);

    if (volume !== undefined && volume !== false) {
      applyVideoVolume(video, volume);
    }
    applyVideoEq(video, currentAudioEqSettings);

    // If autoplay already started before these listeners were attached,
    // push the current state once so the popup stays in sync.
    if (video.ended) {
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
      enterpictureinpictureHandler,
    );

    const leavepictureinpictureHandler = () => {
      chrome.runtime.sendMessage({ name: MsgType.ExitPip });
    };
    video.addEventListener(
      "leavepictureinpicture",
      leavepictureinpictureHandler,
    );
    cleanupPlaybackHandlers = () => {
      video.removeEventListener("timeupdate", timeupdateHandler);
      video.removeEventListener("ended", endedHandler);
      video.removeEventListener("play", playHandler);
      video.removeEventListener("pause", pauseHandler);
      video.removeEventListener(
        "enterpictureinpicture",
        enterpictureinpictureHandler,
      );
      video.removeEventListener(
        "leavepictureinpicture",
        leavepictureinpictureHandler,
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
    false,
  );

  getEndHourInput().value = end_hours.toString();
  getEndMinuteInput().value = end_minutes.toString();
  getEndSecondInput().value = end_seconds.toString();

  const dialog = getDialog();
  getConfirmButton().disabled = false;
  const isUntilEnd = getEndTime() === _duration;
  getUntilEndInput().checked = isUntilEnd;
  disableEndTimeGroup(isUntilEnd);
  closeEqPanel();
  dialog.showModal();
  positionPanelAboveAnchor(
    dialog,
    getBookmarkButton(),
    getRightControlsAnchor(),
  );
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
  const audioEq = cloneAudioEqSettings(currentAudioEqSettings);
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
      "Either check the until end or end time should larger than start time",
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
    audioEq,
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

    chrome.storage.sync.set(
      {
        youtube_list: [...list, data],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.log(chrome.runtime.lastError);
          getConfirmButton().disabled = false;
          return;
        }

        getDialog().close();
      },
    );
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
const onAudioEqChange = (audioEq?: Partial<AudioEqSettings>) => {
  const video = getYoutubePlayer();
  applyVideoEq(video, audioEq);
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
  const { type, url, videoId, isPlayTab, endTimestamp, enablePin, volume, audioEq } =
    request;
  switch (type) {
    case csMsgType.OnYoutubeVideoPage:
      if (new URL(window.location.href).searchParams.get("v") === videoId) {
        // if the information is outdated, ignore it
        onYoutubeVideoPage(
          url.split("?")[0],
          videoId,
          isPlayTab,
          endTimestamp,
          enablePin,
          volume,
          audioEq,
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
    case csMsgType.AudioEqChange:
      onAudioEqChange(audioEq);
      break;
    default:
  }
  sendResponse({ state: "ok" });
});

chrome.storage.onChanged.addListener(
  (
    changes: { [key: string]: chrome.storage.StorageChange },
    namespace: "sync" | "local" | "managed" | "session",
  ) => {
    if ("enablePin" in changes) {
      setPinVisibility(!!changes["enablePin"].newValue);
    }
  },
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
      undefined,
      undefined,
    );
  });
})();
