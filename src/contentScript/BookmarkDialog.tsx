const BookmarkDialog = () => {
  return (
    <dialog id="cs-dialog" className="cs-dialog yt-playlist-panel">
      <form method="dialog" className="cs-dialog-container">
        <div className="cs-dialog-content">
          <div className="cs-dialog-header yt-playlist-panel__header">
            <div className="cs-title-block">
              <p className="cs-heading yt-playlist-panel__title">Add To Playlist</p>
            </div>
            <button
              className="cs-button yt-playlist-panel__close"
              value="cancel"
              aria-label="Close add panel"
            >
              x
            </button>
          </div>
          <p id="cs-video-title" className="cs-video-title"></p>
          <p id="cs-channel-name" className="cs-channel-name"></p>
          <div className="cs-time-container">
            <label className="cs-time-label">Start Time</label>
            <div className="cs-row-group">
              <span className="cs-time cs-time-field">
                <input
                  id="cs-start-hour"
                  className="cs-time-inputgroup"
                  type="text"
                  name="cs-start-hour"
                  defaultValue="00"
                  placeholder="HH"
                  maxLength={2}
                  size={2}
                  pattern="[0-9]{0,2}"
                />
                <span className="cs-semicolon">:</span>
                <input
                  id="cs-start-minute"
                  className="cs-time-inputgroup"
                  type="text"
                  name="cs-start-minute"
                  defaultValue="00"
                  placeholder="mm"
                  maxLength={2}
                  size={2}
                  pattern="[0-5]?[0-9]"
                />
                <span className="cs-semicolon">:</span>
                <input
                  id="cs-start-second"
                  className="cs-time-inputgroup"
                  type="text"
                  name="cs-start-second"
                  defaultValue="00"
                  placeholder="ss"
                  maxLength={2}
                  size={2}
                  pattern="[0-5]?[0-9]"
                />
              </span>
              <button id="cs-reset-starttime" className="cs-button cs-reset-button" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  preserveAspectRatio="xMidYMid meet"
                  viewBox="0 0 24 24"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M10 2h4m-2 12v-4m-8 3a8 8 0 0 1 8-7a8 8 0 1 1-5.3 14L4 17.6" />
                    <path d="M9 17H4v5" />
                  </g>
                </svg>
              </button>
            </div>
          </div>
          <div className="cs-time-container">
            <label className="cs-time-label">End Time</label>
            <div className="cs-row-group">
              <span className="cs-time cs-time-field">
                <input
                  id="cs-end-hour"
                  className="cs-time-inputgroup"
                  type="text"
                  name="cs-end-hour"
                  defaultValue="00"
                  placeholder="HH"
                  maxLength={2}
                  size={2}
                  pattern="[0-9]{0,2}"
                  disabled
                />
                <span className="cs-semicolon">:</span>
                <input
                  id="cs-end-minute"
                  className="cs-time-inputgroup"
                  type="text"
                  name="cs-end-minute"
                  defaultValue="00"
                  placeholder="mm"
                  maxLength={2}
                  size={2}
                  pattern="[0-5]?[0-9]"
                  disabled
                />
                <span className="cs-semicolon">:</span>
                <input
                  id="cs-end-second"
                  className="cs-time-inputgroup"
                  type="text"
                  name="cs-end-second"
                  defaultValue="00"
                  placeholder="ss"
                  maxLength={2}
                  size={2}
                  pattern="[0-5]?[0-9]"
                  disabled
                />
              </span>
              <input
                className="cs-checkbox"
                type="checkbox"
                id="cs-untilEnd"
                name="cs-untilEnd"
                value="Y"
                defaultChecked
              />
              <label className="cs-time-label cs-until-end" htmlFor="cs-untilEnd">
                Until End
              </label>
            </div>
          </div>
          <div className="cs-time-container cs-volume-row">
            <label className="cs-time-label">Volume</label>
            <input className="cs-volume" type="range" min="0" max="100" step="1" id="cs-volume" />
            <span id="cs-volume-text" className="cs-volume-text"></span>
          </div>
          <div className="cs-error-container"></div>
          <div className="cs-button-group">
            <button
              id="cs-confirm-button"
              className="cs-button cs-dialog-button cs-confirm-button"
              type="button"
            >
              Add
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
};

export default BookmarkDialog;
