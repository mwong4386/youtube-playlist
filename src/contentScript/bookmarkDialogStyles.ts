export const BOOKMARK_DIALOG_STYLE_ID = "yt-playlist-bookmark-dialog-style";

export const BOOKMARK_DIALOG_STYLE_TEXT = `
  .cs-dialog {
    --yt-playlist-surface: rgba(247, 247, 245, 0.98);
    --yt-playlist-surface-soft: rgba(255, 255, 255, 0.92);
    --yt-playlist-text: #171717;
    --yt-playlist-text-muted: rgba(23, 23, 23, 0.64);
    --yt-playlist-text-strong: rgba(23, 23, 23, 0.85);
    --yt-playlist-accent: #cc0000;
    --yt-playlist-accent-strong: #aa0000;
    --yt-playlist-danger: #c53b3b;
    --yt-playlist-border: rgba(23, 23, 23, 0.12);
  }
  .cs-dialog[data-theme="dark"] {
    --yt-playlist-surface: rgba(17, 17, 17, 0.96);
    --yt-playlist-surface-soft: rgba(255, 255, 255, 0.08);
    --yt-playlist-text: #fff;
    --yt-playlist-text-muted: rgba(255, 255, 255, 0.64);
    --yt-playlist-text-strong: rgba(255, 255, 255, 0.85);
    --yt-playlist-accent: #f7c66e;
    --yt-playlist-accent-strong: #ffd68a;
    --yt-playlist-danger: #ff8f8f;
    --yt-playlist-border: rgba(255, 255, 255, 0.12);
  }
  .cs-time {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--yt-playlist-border);
    border-radius: 12px;
    padding: 6px 8px;
    margin-left: 6px;
    background: color-mix(in srgb, var(--yt-playlist-surface-soft) 65%, transparent);
  }
  .cs-time input {
    border: 0;
    text-align: center;
    outline: 0;
    background: transparent;
    color: var(--yt-playlist-text);
  }
  .cs-dialog-button {
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: color-mix(in srgb, var(--yt-playlist-surface-soft) 80%, transparent);
    color: var(--yt-playlist-text);
  }
  .cs-semicolon {
    font-size: 20px;
    font-weight: bold;
    color: var(--yt-playlist-text-muted);
  }
  .cs-time-inputgroup {
    font-size: 18px;
    width: 2ch;
  }
  .cs-dialog-container {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    margin: 0;
  }
  .cs-dialog-header {
    margin-bottom: 14px;
  }
  .cs-button-group {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }
  .cs-confirm-button {
    width: 100%;
    font-size: 14px;
    border-width: 1px;
    font-weight: bold;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: var(--yt-playlist-accent);
    color: #181818;
  }
  .cs-channel-name {
    color: var(--yt-playlist-text-muted);
    font-size: 12px;
    line-height: 1.4;
    margin-bottom: 14px;
    margin-top: 0;
  }
  .cs-video-title {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.35;
    color: var(--yt-playlist-text);
    margin-bottom: 8px;
    margin-top: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cs-time-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    margin-bottom: 10px;
    gap: 8px;
    flex-wrap: nowrap;
  }
  .cs-time-label {
    display: inline-block;
    width: 84px;
    font-size: 13px;
    color: var(--yt-playlist-text-strong);
  }
  .cs-volume-text {
    min-width: 32px;
    font-size: 14px;
    color: var(--yt-playlist-accent);
    text-align: right;
  }
  .cs-dialog-content {
    padding: 0;
  }
  .cs-error-container p {
    font-size: 13px;
    color: var(--yt-playlist-danger);
    margin: 8px 0 0;
  }
  .cs-reset-button {
    border: 0;
    color: var(--yt-playlist-text-muted);
    background: transparent;
    padding: 6px;
    border-radius: 10px;
  }
  .cs-button:hover {
    cursor: pointer;
    background-color: color-mix(in srgb, var(--yt-playlist-surface-soft) 95%, transparent);
  }
  .cs-button:active {
    background-color: color-mix(in srgb, var(--yt-playlist-surface-soft) 100%, transparent);
  }
  .cs-confirm-button:hover {
    background: var(--yt-playlist-accent-strong);
  }
  .cs-confirm-button:active {
    background: var(--yt-playlist-accent);
  }
  .cs-volume {
    flex: 1;
    accent-color: var(--yt-playlist-accent);
  }
  .cs-checkbox {
    accent-color: var(--yt-playlist-accent);
  }
  .cs-until-end {
    width: auto;
    color: var(--yt-playlist-text-muted);
  }
  .cs-row-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    justify-content: flex-start;
    min-width: 0;
  }
  .cs-heading {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 0;
  }
  .cs-volume-row {
    align-items: center;
  }
  .cs-time input:disabled {
    color: color-mix(in srgb, var(--yt-playlist-text-muted) 72%, transparent);
  }
  .cs-dialog form {
    margin: 0;
  }
  .cs-title-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }
  .cs-time-field {
    margin-left: 0;
    flex: 0 0 auto;
  }
  .cs-time-container .cs-row-group .cs-time-label {
    flex: 0 0 auto;
  }
  @media (max-width: 640px) {
    .cs-time-container {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .cs-row-group {
      width: 100%;
      justify-content: flex-start;
    }
  }
`;
