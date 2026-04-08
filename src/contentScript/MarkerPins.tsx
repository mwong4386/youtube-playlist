const markerContainerStyle: React.CSSProperties = {
  position: "absolute",
  top: "-52px",
  left: "-25px",
  width: "50px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

export const StartMarkerPin = () => {
  return (
    <div id="csm-start-marker" style={markerContainerStyle}>
      <div id="csm-start-timer" className="csm-timer"></div>
      <div className="csm-marker">
        <div className="csm-marker-background"></div>
        <div className="csm-marker-text">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 16 16"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="m4.25 3l1.166-.624l8 5.333v1.248l-8 5.334l-1.166-.624V3zm1.5 1.401v7.864l5.898-3.932L5.75 4.401z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export const EndMarkerPin = () => {
  return (
    <div id="csm-end-marker" style={markerContainerStyle}>
      <div id="csm-end-timer" className="csm-timer"></div>
      <div className="csm-marker">
        <div className="csm-marker-background"></div>
        <div className="csm-marker-text">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 16 16"
          >
            <path fill="currentColor" d="M4.5 3H6v10H4.5V3zm7 0v10H10V3h1.5z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
