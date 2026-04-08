import { v4 as uuidv4 } from "uuid";
import { createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import csMsgType from "../constants/csMsgType";
import MsgType from "../constants/msgType";
import AudioEqSettings from "../models/AudioEq";
import AudioEqProfile, {
  AUDIO_EQ_PROFILE_STORAGE_KEY,
} from "../models/AudioEqProfile";
import {
  cloneAudioEqSettings,
  AUDIO_EQ_BANDS,
  normalizeAudioEqSettings,
} from "../utils/audioEq";
import MPlaylistItem from "../models/MPlaylistItem";
import { getHourMinuteSecond } from "../utils/date";
import {
  clearSelectedAudioEqProfileId,
  normalizeSelectedAudioEqProfileId,
  readStoredAudioEqProfiles,
  selectAudioEqProfileAudioEqById,
} from "../utils/audioEqProfiles";
import {
  DEFAULT_THEME_PREFERENCE,
  getResolvedTheme,
  normalizeThemePreference,
  ResolvedTheme,
  THEME_PREFERENCE_KEY,
  ThemePreference,
} from "../utils/theme";
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
import EqPanel from "./EqPanel";
import BookmarkDialog from "./BookmarkDialog";
import {
  BOOKMARK_DIALOG_STYLE_ID,
  BOOKMARK_DIALOG_STYLE_TEXT,
} from "./bookmarkDialogStyles";
import { sanitizeYoutubeVideoTitle } from "./bookmarkDialogViewModel";
import {
  createBookmarkButtonFeedbackController,
  type BookmarkButtonFeedbackController,
  type BookmarkButtonVisualState,
} from "./bookmarkButtonFeedback";

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
let currentAudioEqProfiles: AudioEqProfile[] = [];
let currentEqButton: HTMLButtonElement | null = null;
let currentEqPanel: HTMLDivElement | null = null;
let currentEqPanelRoot: Root | null = null;
let currentEqPanelProfileSelectionId = "";
let currentBookmarkDialogRoot: Root | null = null;
let cleanupEqOutsideClick: (() => void) | null = null;
let isCurrentPlaybackTab = false;
let currentThemePreference: ThemePreference = DEFAULT_THEME_PREFERENCE;
let currentResolvedTheme: ResolvedTheme = "light";
let hasBoundBookmarkDialogHandlers = false;
let controlInjectionRetryId: number | null = null;
let currentBookmarkButton: HTMLButtonElement | null = null;
let bookmarkButtonFeedbackController: BookmarkButtonFeedbackController | null =
  null;

const YT_VOLUME_EVENT = "youtube-playlist:set-volume";
const PLAYER_VOLUME_RETRY_DELAYS_MS = [120, 320, 700];
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const getPanelThemeTargets = () => {
  const targets: HTMLElement[] = [];
  const dialog = document.getElementById("cs-dialog") as HTMLElement | null;

  if (dialog) {
    targets.push(dialog);
  }

  if (currentEqPanel) {
    targets.push(currentEqPanel);
  }

  return targets;
};

const applyContentScriptTheme = () => {
  currentResolvedTheme = getResolvedTheme(
    currentThemePreference,
    window.matchMedia(THEME_MEDIA_QUERY).matches,
  );

  for (const target of getPanelThemeTargets()) {
    target.dataset.theme = currentResolvedTheme;
  }
};

const syncContentScriptThemePreference = (value: unknown) => {
  currentThemePreference = normalizeThemePreference(value);
  applyContentScriptTheme();
};

const syncContentScriptAudioEqProfiles = (value: Record<string, unknown>) => {
  currentAudioEqProfiles = readStoredAudioEqProfiles(value);
  const normalizedSelectedProfileId = normalizeSelectedAudioEqProfileId(
    currentAudioEqProfiles,
    currentEqPanelProfileSelectionId,
  );

  if (normalizedSelectedProfileId !== currentEqPanelProfileSelectionId) {
    currentEqPanelProfileSelectionId = normalizedSelectedProfileId;
  }

  syncEqPanelUi();
};

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
  syncEqPanelUi();
};

const ensureFloatingPanelStyles = () => {
  if (document.getElementById("yt-playlist-panel-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "yt-playlist-panel-style";
  style.textContent = `
    .yt-playlist-panel {
      --yt-playlist-surface: rgba(247, 247, 245, 0.98);
      --yt-playlist-surface-strong: rgba(255, 255, 255, 0.98);
      --yt-playlist-text: #171717;
      --yt-playlist-text-muted: rgba(23, 23, 23, 0.64);
      --yt-playlist-text-subtle: rgba(23, 23, 23, 0.45);
      --yt-playlist-accent: #cc0000;
      --yt-playlist-border: rgba(23, 23, 23, 0.12);
      --yt-playlist-shadow: rgba(15, 23, 42, 0.18);
      --yt-playlist-close: rgba(23, 23, 23, 0.72);
      position: absolute;
      right: 24px;
      bottom: 136px;
      width: 360px;
      padding: 16px 16px 14px;
      border-radius: 18px;
      background: linear-gradient(
        180deg,
        var(--yt-playlist-surface-strong),
        var(--yt-playlist-surface)
      );
      color: var(--yt-playlist-text);
      border: 1px solid var(--yt-playlist-border);
      box-shadow: 0 18px 48px var(--yt-playlist-shadow);
      z-index: 2147483647;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      box-sizing: border-box;
    }
    .yt-playlist-panel[data-theme="dark"] {
      --yt-playlist-surface: rgba(17, 17, 17, 0.96);
      --yt-playlist-surface-strong: rgba(28, 28, 28, 0.94);
      --yt-playlist-text: #ffffff;
      --yt-playlist-text-muted: rgba(255, 255, 255, 0.64);
      --yt-playlist-text-subtle: rgba(255, 255, 255, 0.45);
      --yt-playlist-accent: #f7c66e;
      --yt-playlist-border: rgba(255, 255, 255, 0.08);
      --yt-playlist-shadow: rgba(0, 0, 0, 0.35);
      --yt-playlist-close: rgba(255, 255, 255, 0.8);
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
      color: var(--yt-playlist-close);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }
    .yt-playlist-panel__close:hover {
      color: var(--yt-playlist-text);
    }
    .yt-playlist-panel__close:active {
      color: var(--yt-playlist-text-muted);
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
      color: var(--yt-playlist-text-muted);
      margin-top: 4px;
    }
    .yt-playlist-eq-panel__profile {
      margin: 0 0 14px;
    }
    .yt-playlist-eq-panel__profile-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--yt-playlist-text-muted);
      margin-bottom: 6px;
    }
    .yt-playlist-eq-panel__profile-select {
      width: 100%;
      border-radius: 10px;
      border: 1px solid var(--yt-playlist-border);
      background: color-mix(in srgb, var(--yt-playlist-surface-strong) 94%, transparent);
      color: var(--yt-playlist-text);
      padding: 10px 12px;
      font: inherit;
      box-sizing: border-box;
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
      color: var(--yt-playlist-accent);
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
      accent-color: var(--yt-playlist-accent);
      cursor: pointer;
    }
    .yt-playlist-eq-panel__label {
      font-size: 11px;
      color: color-mix(in srgb, var(--yt-playlist-text) 85%, transparent);
      text-align: center;
      line-height: 1.2;
      min-height: 28px;
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
    .bookmark-button {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      height: 100%;
      padding: 0 8px;
      width: auto;
      left: 0;
      color: #ffffff;
      transition:
        color 180ms ease,
        filter 180ms ease,
        transform 180ms ease;
    }
    .bookmark-button__content {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      line-height: 1;
      transform-origin: center;
      pointer-events: none;
    }
    .bookmark-button__plus {
      line-height: 1;
      transform: translateY(-1px);
    }
    .bookmark-button__icon {
      width: 24px;
      height: 24px;
      fill: currentColor;
      filter: drop-shadow(0 0 12px rgba(255, 214, 10, 0.38));
    }
    .bookmark-button[data-feedback-state="success"] {
      color: #ffd60a;
      filter: drop-shadow(0 0 16px rgba(255, 214, 10, 0.48));
    }
    .bookmark-button[data-feedback-state="success"] .bookmark-button__content {
      animation: yt-playlist-bookmark-wave 1400ms cubic-bezier(0.22, 0.61, 0.36, 1) 1;
    }
    @keyframes yt-playlist-bookmark-wave {
      0% {
        transform: translateX(-9px) translateY(-5px) scale(0.96);
      }
      12.5% {
        transform: translateX(-6px) translateY(-2px) scale(1);
      }
      25% {
        transform: translateX(-3px) translateY(3px) scale(1.04);
      }
      37.5% {
        transform: translateX(0) translateY(7px) scale(1.08);
      }
      50% {
        transform: translateX(3px) translateY(10px) scale(1.1);
      }
      62.5% {
        transform: translateX(6px) translateY(7px) scale(1.08);
      }
      75% {
        transform: translateX(9px) translateY(2px) scale(1.04);
      }
      87.5% {
        transform: translateX(12px) translateY(-2px) scale(1);
      }
      100% {
        transform: translateX(15px) translateY(-5px) scale(0.98);
      }
    }
  `;

  document.head.append(style);
};

const MUSIC_NOTE_ICON = `
  <svg class="bookmark-button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M16.5 3.75a.75.75 0 0 0-.93-.73l-6.5 1.63a.75.75 0 0 0-.57.73v9.39a3.26 3.26 0 1 0 1.5 2.73V9.97l5-1.25v4.55a3.25 3.25 0 1 0 1.5 2.73V3.75Z" />
  </svg>
`;

const createBookmarkButtonContent = (state: BookmarkButtonVisualState) => {
  const content = document.createElement("span");
  content.className = "bookmark-button__content";

  if (state === "success") {
    content.innerHTML = MUSIC_NOTE_ICON;
    return content;
  }

  const plus = document.createElement("span");
  plus.className = "bookmark-button__plus";
  plus.textContent = "+";
  content.append(plus);
  return content;
};

const applyBookmarkButtonVisualState = (
  button: HTMLButtonElement,
  state: BookmarkButtonVisualState,
) => {
  button.dataset.feedbackState = state;
  button.replaceChildren(createBookmarkButtonContent(state));
  button.title =
    state === "success" ? "Added to song list" : "Click to open bookmark dialog";
  button.setAttribute(
    "aria-label",
    state === "success" ? "Added to song list" : "Open add to playlist dialog",
  );
  button.disabled = state === "success";
};

const ensureBookmarkButtonFeedbackController = (button: HTMLButtonElement) => {
  if (currentBookmarkButton === button && bookmarkButtonFeedbackController) {
    return bookmarkButtonFeedbackController;
  }

  bookmarkButtonFeedbackController?.dispose();
  currentBookmarkButton = button;
  bookmarkButtonFeedbackController = createBookmarkButtonFeedbackController({
    applyState: (state) => {
      applyBookmarkButtonVisualState(button, state);
    },
    clearScheduled: (timerId) => {
      window.clearTimeout(timerId);
    },
    schedule: (callback, delayMs) => {
      return window.setTimeout(callback, delayMs);
    },
  });

  return bookmarkButtonFeedbackController;
};

const ensureBookmarkDialogStyles = () => {
  if (document.getElementById(BOOKMARK_DIALOG_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = BOOKMARK_DIALOG_STYLE_ID;
  style.textContent = BOOKMARK_DIALOG_STYLE_TEXT;
  document.head.append(style);
};

const ensureBookmarkDialog = () => {
  ensureFloatingPanelStyles();
  ensureBookmarkDialogStyles();

  if (!document.body) {
    return;
  }

  if (currentBookmarkDialogRoot && document.getElementById("cs-dialog")) {
    return;
  }

  const host = document.createElement("div");
  host.id = "yt-playlist-bookmark-dialog-host";
  document.body.append(host);
  currentBookmarkDialogRoot = createRoot(host);
  currentBookmarkDialogRoot.render(createElement(BookmarkDialog));
  applyContentScriptTheme();
};

const clearControlInjectionRetry = () => {
  if (controlInjectionRetryId !== null) {
    window.clearTimeout(controlInjectionRetryId);
    controlInjectionRetryId = null;
  }
};

const ensureControlButtonsInjected = (
  bookmarkButton: HTMLButtonElement,
  eqButton: HTMLButtonElement,
) => {
  const rightControl = getRightControlsAnchor();
  if (!rightControl) {
    return false;
  }

  if (bookmarkButton.parentElement !== rightControl) {
    rightControl.prepend(bookmarkButton);
  }
  if (eqButton.parentElement !== rightControl || bookmarkButton.nextElementSibling !== eqButton) {
    bookmarkButton.insertAdjacentElement("afterend", eqButton);
  }
  return true;
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

const normalizeEqPanelProfileSelection = () => {
  const normalizedSelectedProfileId = normalizeSelectedAudioEqProfileId(
    currentAudioEqProfiles,
    currentEqPanelProfileSelectionId,
  );
  if (normalizedSelectedProfileId !== currentEqPanelProfileSelectionId) {
    currentEqPanelProfileSelectionId = normalizedSelectedProfileId;
  }
};

const syncEqPanelUi = () => {
  if (!currentEqPanel || !currentEqPanelRoot) {
    return;
  }

  normalizeEqPanelProfileSelection();
  currentEqPanelRoot.render(
    createElement(EqPanel, {
      settings: currentAudioEqSettings,
      profiles: currentAudioEqProfiles,
      selectedProfileId: currentEqPanelProfileSelectionId,
      isCurrentPlaybackTab,
      onClose: () => {
        currentEqPanel?.setAttribute("hidden", "true");
      },
      onProfileChange: (profileId: string) => {
        currentEqPanelProfileSelectionId = profileId;

        if (!currentEqPanelProfileSelectionId) {
          syncEqPanelUi();
          return;
        }

        const selectedProfile = selectAudioEqProfileAudioEqById(
          currentAudioEqProfiles,
          currentEqPanelProfileSelectionId,
        );
        if (!selectedProfile) {
          currentEqPanelProfileSelectionId = "";
          syncEqPanelUi();
          return;
        }

        const video = getYoutubePlayer();
        if (video) {
          applyVideoEq(video, selectedProfile);
        } else {
          currentAudioEqSettings = normalizeAudioEqSettings(selectedProfile);
          syncEqPanelUi();
        }

        if (isCurrentPlaybackTab) {
          sendEqSettingsToBackground(selectedProfile, true);
        }
      },
      onSliderInput: (bandKey: keyof AudioEqSettings, value: number) => {
        if (currentEqPanelProfileSelectionId) {
          currentEqPanelProfileSelectionId = clearSelectedAudioEqProfileId(
            currentEqPanelProfileSelectionId,
          );
        }

        const nextSettings = normalizeAudioEqSettings({
          ...currentAudioEqSettings,
          [bandKey]: value,
        });
        const video = getYoutubePlayer();
        if (video) {
          applyVideoEq(video, nextSettings);
        } else {
          currentAudioEqSettings = nextSettings;
          syncEqPanelUi();
        }
      },
      onSliderChange: (bandKey: keyof AudioEqSettings, value: number) => {
        if (currentEqPanelProfileSelectionId) {
          currentEqPanelProfileSelectionId = clearSelectedAudioEqProfileId(
            currentEqPanelProfileSelectionId,
          );
        }

        const nextSettings = normalizeAudioEqSettings({
          ...currentAudioEqSettings,
          [bandKey]: value,
        });
        const video = getYoutubePlayer();
        if (video) {
          applyVideoEq(video, nextSettings);
        } else {
          currentAudioEqSettings = nextSettings;
          syncEqPanelUi();
        }
        if (isCurrentPlaybackTab) {
          sendEqSettingsToBackground(nextSettings, true);
        }
      },
    }),
  );
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
  panel.dataset.theme = currentResolvedTheme;
  const panelRoot = document.createElement("div");
  panel.append(panelRoot);
  currentEqPanelRoot = createRoot(panelRoot);

  document.body.append(panel);
  currentEqPanel = panel;
  applyContentScriptTheme();
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
      currentEqPanelProfileSelectionId = "";
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
  currentEqPanelProfileSelectionId = "";
  ensureBookmarkDialog();
  const bookmark = getBookmarkButton();
  setStartTime(0);
  let video: HTMLVideoElement = getYoutubePlayer();
  const eqButton = ensureEqButton();

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
    if (!hasBoundBookmarkDialogHandlers) {
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
      volume.oninput = () => {
        getVolumeText().textContent = volume.value;
        const currentVideo = getYoutubePlayer();
        if (currentVideo) {
          applyVideoVolume(currentVideo, parseInt(volume.value));
        }
      };
      hasBoundBookmarkDialogHandlers = true;
    } else {
      getConfirmButton().removeEventListener("click", onCSConfirm);
      getConfirmButton().addEventListener("click", onCSConfirm);
    }
    //Add a + button to the youtube control button group, it will open the dialog
    const bookmarkBtn = document.createElement("button");
    bookmarkBtn.className = "ytp-button bookmark-button";
    ensureBookmarkButtonFeedbackController(bookmarkBtn);

    bookmarkBtn.addEventListener("click", onCSOpenDialogClickHandler);
    const injected = ensureControlButtonsInjected(bookmarkBtn, eqButton);
    clearControlInjectionRetry();
    if (!injected) {
      let remainingAttempts = 20;
      const retry = () => {
        const isInjected = ensureControlButtonsInjected(bookmarkBtn, eqButton);
        if (isInjected) {
          clearControlInjectionRetry();
          return;
        }

        if (remainingAttempts-- <= 0) {
          clearControlInjectionRetry();
          return;
        }

        controlInjectionRetryId = window.setTimeout(retry, 250);
      };

      controlInjectionRetryId = window.setTimeout(retry, 250);
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
    ensureBookmarkButtonFeedbackController(bookmark);
    ensureControlButtonsInjected(bookmark, eqButton);
    ensureEqPanel();
  }

  currentAudioEqSettings = normalizeAudioEqSettings(audioEq);
  syncEqPanelUi();

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

const onCSOpenDialogClickHandler = () => {
  //Tidy up the information showing on the dialog
  clearErrorMsg();
  const title = sanitizeYoutubeVideoTitle(document.title);

  const channelName = getChannelNameFromPage()?.textContent || "";

  getVideoTitleElement().textContent = title;
  getChannelNameElement().textContent = channelName;

  const video: HTMLVideoElement | undefined = getYoutubePlayer();
  const volumeRate = Math.floor(video.volume * 100).toString();
  getVolumeInput().value = volumeRate;
  getVolumeText().textContent = volumeRate;

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
  applyContentScriptTheme();
  dialog.dataset.theme = currentResolvedTheme;
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

  const title = getVideoTitleElement().textContent || "";
  const channelName = getChannelNameElement().textContent || "";
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
        const bookmarkButton = getBookmarkButton();
        if (bookmarkButton) {
          ensureBookmarkButtonFeedbackController(bookmarkButton).showSuccess();
        }
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
  message.textContent = error;
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
    if (namespace === "sync" && THEME_PREFERENCE_KEY in changes) {
      syncContentScriptThemePreference(changes[THEME_PREFERENCE_KEY].newValue);
    }
    if (namespace === "sync" && AUDIO_EQ_PROFILE_STORAGE_KEY in changes) {
      syncContentScriptAudioEqProfiles(
        typeof changes[AUDIO_EQ_PROFILE_STORAGE_KEY].newValue === "undefined"
          ? {}
          : {
              [AUDIO_EQ_PROFILE_STORAGE_KEY]:
                changes[AUDIO_EQ_PROFILE_STORAGE_KEY].newValue,
            },
      );
    }
  },
);

const themeMediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
const onThemeMediaQueryChange = () => {
  applyContentScriptTheme();
};

if (typeof themeMediaQuery.addEventListener === "function") {
  themeMediaQuery.addEventListener("change", onThemeMediaQueryChange);
} else {
  themeMediaQuery.addListener(onThemeMediaQueryChange);
}

chrome.storage.sync.get([THEME_PREFERENCE_KEY], (result) => {
  syncContentScriptThemePreference(result[THEME_PREFERENCE_KEY]);
});

chrome.storage.sync.get([AUDIO_EQ_PROFILE_STORAGE_KEY], (result) => {
  syncContentScriptAudioEqProfiles(result);
});

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
