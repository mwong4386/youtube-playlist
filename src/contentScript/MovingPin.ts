import { _duration, getHtmlFromResource } from ".";
import { formatPlayerTime } from "../utils/date";

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

export const moveStartPin = (time: number) => {
  const startmarker = document.getElementById(
    "csm-start-marker"
  ) as HTMLElement;
  if (!startmarker) return;
  const startmarkertimer = document.getElementById(
    "csm-start-timer"
  ) as HTMLElement;
  startmarkertimer.innerHTML = formatPlayerTime(time);
  const position = (time / _duration) * maxX - 25;
  startmarker.style.left = `${position}px`;
};

export const moveEndPin = (time: number) => {
  const endmarker = document.getElementById("csm-end-marker") as HTMLElement;
  if (!endmarker) return;
  const endmarkertimer = document.getElementById(
    "csm-end-timer"
  ) as HTMLElement;
  endmarkertimer.innerHTML = formatPlayerTime(time);
  const position = (time / _duration) * maxX - 25;
  endmarker.style.left = `${position}px`;
};
//Hide the pin if enablepin is false, but still create the pin for recording the time
export const createStartPin = (enablePin: boolean) => {
  return getHtmlFromResource("/marker.html").then((html) => {
    const player = document.querySelector("#player .ytp-chrome-bottom");
    if (!player) return;
    let x: any, startx: any;

    player.insertAdjacentHTML("beforeend", html);

    const startmarker = document.getElementById(
      "csm-start-marker"
    ) as HTMLElement;
    if (!enablePin) {
      startmarker.style.display = "none";
    }
    const startmarkertimer = document.getElementById(
      "csm-start-timer"
    ) as HTMLElement;
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
      startmarkertimer.innerHTML = formatPlayerTime(starttime);
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
  });
};

//Hide the pin if enablepin is false, but still create the pin for recording the time
export const createStopPin = (enablePin: boolean) => {
  return getHtmlFromResource("/endmarker.html").then((html) => {
    const player = document.querySelector("#player .ytp-chrome-bottom");
    if (!player) return;
    let x: any, startx: any;
    player.insertAdjacentHTML("beforeend", html);

    const endmarker = document.getElementById("csm-end-marker") as HTMLElement;
    if (!enablePin) {
      endmarker.style.display = "none";
    }
    const endmarkertimer = document.getElementById(
      "csm-end-timer"
    ) as HTMLElement;
    const mouseMoveHandler = (event: MouseEvent) => {
      event.preventDefault();
      //
      let position = startx + event.pageX - x;
      position = bound(position);
      endmarker.style.left = `${position}px`;
      endtime = Math.floor(((position + 25) / maxX) * _duration);
      endmarkertimer.innerHTML = formatPlayerTime(endtime);
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
    if (endtime > 0) {
      moveEndPin(endtime);
    }
  });
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
