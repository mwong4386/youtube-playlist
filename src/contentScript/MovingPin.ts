import { createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import { _duration } from ".";
import { formatPlayerTime } from "../utils/date";
import { EndMarkerPin, StartMarkerPin } from "./MarkerPins";
import { MARKER_STYLE_ID, MARKER_STYLE_TEXT } from "./markerStyles";

let starttime: number = 0; //the time stored for the start time pin
export const setStartTime = (time: number) => {
  starttime = time;
};
export const getStartTime = () => {
  return starttime;
};
let endtime: number = 0; //the time stored for the end time pin
export const setEndTime = (time: number) => {
  endtime = time;
};
export const getEndTime = () => {
  return endtime;
};
let maxX: number = NaN; //the maximum value in x axis for video playbar
export const setMaxX = (x: number) => {
  maxX = x;
};
let startMarkerRoot: Root | null = null;
let endMarkerRoot: Root | null = null;

export const moveStartPin = (time: number) => {
  const startmarker = document.getElementById(
    "csm-start-marker"
  ) as HTMLElement;
  if (!startmarker) return;
  const startmarkertimer = document.getElementById(
    "csm-start-timer"
  ) as HTMLElement;
  startmarkertimer.textContent = formatPlayerTime(time);
  const position = (time / _duration) * maxX - 25;
  startmarker.style.left = `${position}px`;
};

export const moveEndPin = (time: number) => {
  const endmarker = document.getElementById("csm-end-marker") as HTMLElement;
  if (!endmarker) return;
  const endmarkertimer = document.getElementById(
    "csm-end-timer"
  ) as HTMLElement;
  endmarkertimer.textContent = formatPlayerTime(time);
  const position = (time / _duration) * maxX - 25;
  endmarker.style.left = `${position}px`;
};

const ensureMarkerStyles = () => {
  if (document.getElementById(MARKER_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = MARKER_STYLE_ID;
  style.textContent = MARKER_STYLE_TEXT;
  document.head.append(style);
};

const ensureStartMarkerMounted = (player: Element) => {
  let marker = document.getElementById("csm-start-marker") as HTMLElement | null;
  if (marker) {
    return marker;
  }

  const host = document.createElement("div");
  host.id = "yt-playlist-start-marker-host";
  player.append(host);
  startMarkerRoot = createRoot(host);
  startMarkerRoot.render(createElement(StartMarkerPin));
  marker = document.getElementById("csm-start-marker") as HTMLElement | null;
  return marker;
};

const ensureEndMarkerMounted = (player: Element) => {
  let marker = document.getElementById("csm-end-marker") as HTMLElement | null;
  if (marker) {
    return marker;
  }

  const host = document.createElement("div");
  host.id = "yt-playlist-end-marker-host";
  player.append(host);
  endMarkerRoot = createRoot(host);
  endMarkerRoot.render(createElement(EndMarkerPin));
  marker = document.getElementById("csm-end-marker") as HTMLElement | null;
  return marker;
};
//Hide the pin if enablepin is false, but still create the pin for recording the time
export const createStartPin = (enablePin: boolean) => {
  const player = document.querySelector("#player .ytp-chrome-bottom");
  if (!player) return;

  ensureMarkerStyles();
  const startmarker = ensureStartMarkerMounted(player);
  if (!startmarker) {
    return;
  }

  startmarker.style.display = enablePin ? "flex" : "none";
  if (startmarker.dataset.dragBound === "true") {
    return;
  }

  let x = 0;
  let startx = 0;
  const startmarkertimer = document.getElementById(
    "csm-start-timer"
  ) as HTMLElement | null;

  const mouseMoveHandler = (event: MouseEvent) => {
    event.preventDefault();
    //startx is the starting position of this dragging
    //event.pageX - x is the distance of the dragging
    //sum of them calculate the updated position
    let position = startx + event.pageX - x;
    //25 is the half width of the pin
    position = bound(position);
    startmarker.style.left = `${position}px`;
    //calculate the time
    starttime = Math.floor(((position + 25) / maxX) * _duration);
    if (startmarkertimer) {
      startmarkertimer.textContent = formatPlayerTime(starttime);
    }
  };
  const mouseUpHandler = () => {
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
    document.removeEventListener("visibilitychange", focusoutHandler);
  };
  //i.e. if user go to other tab, count it end and unregister those handler
  const focusoutHandler = () => {
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
    document.removeEventListener("visibilitychange", focusoutHandler);
  };
  const mouseDownHandler = (event: MouseEvent) => {
    x = event.pageX;
    startx = parseInt(startmarker.style.left?.replace("px", "")) || 0; //last position in term of x-axis
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
    document.addEventListener("visibilitychange", focusoutHandler);
  };
  startmarker.addEventListener("mousedown", mouseDownHandler);
  startmarker.dataset.dragBound = "true";
};

//Hide the pin if enablepin is false, but still create the pin for recording the time
export const createStopPin = (enablePin: boolean) => {
  const player = document.querySelector("#player .ytp-chrome-bottom");
  if (!player) return;

  ensureMarkerStyles();
  const endmarker = ensureEndMarkerMounted(player);
  if (!endmarker) {
    return;
  }

  endmarker.style.display = enablePin ? "flex" : "none";
  if (endmarker.dataset.dragBound !== "true") {
    let x = 0;
    let startx = 0;
    const endmarkertimer = document.getElementById(
      "csm-end-timer"
    ) as HTMLElement | null;

    const mouseMoveHandler = (event: MouseEvent) => {
      event.preventDefault();
      let position = startx + event.pageX - x;
      position = bound(position);
      endmarker.style.left = `${position}px`;
      endtime = Math.floor(((position + 25) / maxX) * _duration);
      if (endmarkertimer) {
        endmarkertimer.textContent = formatPlayerTime(endtime);
      }
    };
    const mouseUpHandler = () => {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
      document.removeEventListener("visibilitychange", focusoutHandler);
    };
    const focusoutHandler = () => {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
      document.removeEventListener("visibilitychange", focusoutHandler);
    };
    const mouseDownHandler = (event: MouseEvent) => {
      x = event.pageX;
      startx = parseInt(endmarker.style.left?.replace("px", "")) || 0; //last position in term of x-axis
      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
      document.addEventListener("visibilitychange", focusoutHandler);
    };
    endmarker.addEventListener("mousedown", mouseDownHandler);
    endmarker.dataset.dragBound = "true";
  }

  if (endtime > 0) {
    moveEndPin(endtime);
  }
};

export const setPinVisibility = (enablePin: boolean) => {
  const startmarker = document.getElementById(
    "csm-start-marker"
  ) as HTMLElement;
  const endmarker = document.getElementById("csm-end-marker") as HTMLElement;
  if (!startmarker || !endmarker) return;
  if (!enablePin) {
    startmarker.style.display = "none";
    endmarker.style.display = "none";
  } else {
    startmarker.style.display = "flex";
    endmarker.style.display = "flex";
  }
};

//25 is the half width of the pin, we want the center of the pin pointing to the time frame
const bound = (position: number) => {
  return position < -25 ? -25 : position > maxX - 25 ? maxX - 25 : position;
};
