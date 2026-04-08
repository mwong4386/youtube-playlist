export const MARKER_STYLE_ID = "yt-playlist-marker-style";

export const MARKER_STYLE_TEXT = `
  .csm-marker {
    position: relative;
    cursor: pointer;
  }
  .csm-marker-background {
    transform: perspective(60px) rotateX(10deg) rotateZ(-45deg);
    border-radius: 50% 50% 50% 0;
    width: 30px;
    height: 30px;
    background-color: red;
  }
  .csm-marker-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
  }
  .csm-timer {
    color: white;
    height: 12px;
    font-size: 12px;
    font-weight: bold;
  }
`;
