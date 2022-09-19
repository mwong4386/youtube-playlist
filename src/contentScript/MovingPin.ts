import { duration, getHtmlFromResource } from ".";
import { formatPlayerTime } from "../utils/date";

let starttime: number = 0;
export const setStartTime = (time: number) => {
  starttime = time;
};
export const getStartTime = () => {
  return starttime;
};
let endtime: number = 0;
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

export const moveStartPin = (starttime: number) => {
  const startmarker = document.getElementById(
    "csm-start-marker"
  ) as HTMLElement;
  const startmarkertimer = document.getElementById(
    "csm-start-timer"
  ) as HTMLElement;
  startmarkertimer.innerHTML = formatPlayerTime(starttime);
  const position = (starttime / duration) * maxX - 25;
  startmarker.style.left = `${position}px`;
};

export const moveEndPin = (starttime: number) => {
  const endmarker = document.getElementById("csm-end-marker") as HTMLElement;
  const endmarkertimer = document.getElementById(
    "csm-end-timer"
  ) as HTMLElement;
  endmarkertimer.innerHTML = formatPlayerTime(starttime);
  const position = (starttime / duration) * maxX - 25;
  console.log(position);
  endmarker.style.left = `${position}px`;
};

export const createStartPin = () => {
  return getHtmlFromResource("/marker.html").then((html) => {
    const player = document.querySelector("#player .ytp-chrome-bottom");
    if (!player) return;
    let x: any, startx: any;

    player.insertAdjacentHTML("beforeend", html);

    const startmarker = document.getElementById(
      "csm-start-marker"
    ) as HTMLElement;
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
      starttime = Math.floor(((position + 25) / maxX) * duration);
      startmarkertimer.innerHTML = formatPlayerTime(starttime);
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
      startx = parseInt(startmarker.style.left?.replace("px", "")) || 0; //last position in term of x-axis
      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
      document.addEventListener("visibilitychange", focusoutHandler);
    };
    startmarker.addEventListener("mousedown", mouseDownHandler);
  });
};

export const createStopPin = () => {
  return getHtmlFromResource("/endmarker.html").then((html) => {
    const player = document.querySelector("#player .ytp-chrome-bottom");
    if (!player) return;
    let x: any, startx: any;
    player.insertAdjacentHTML("beforeend", html);

    const endmarker = document.getElementById("csm-end-marker") as HTMLElement;
    const endmarkertimer = document.getElementById(
      "csm-end-timer"
    ) as HTMLElement;
    const mouseMoveHandler = (event: MouseEvent) => {
      event.preventDefault();
      //
      let position = startx + event.pageX - x;
      position = bound(position);
      endmarker.style.left = `${position}px`;
      endtime = Math.floor(((position + 25) / maxX) * duration);
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
  });
};

const bound = (position: number) => {
  return position < -25 ? -25 : position > maxX - 25 ? maxX - 25 : position;
};
