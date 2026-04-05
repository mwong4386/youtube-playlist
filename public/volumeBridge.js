(() => {
  const EVENT_NAME = "youtube-playlist:set-volume";
  if (window.__youtubePlaylistVolumeBridgeInstalled) {
    return;
  }

  window.__youtubePlaylistVolumeBridgeInstalled = true;
  window.addEventListener(EVENT_NAME, (event) => {
    const detail = event && event.detail ? event.detail : {};
    const volume = Number(detail.volume);
    const muted =
      typeof detail.muted === "boolean" ? detail.muted : volume <= 0;
    if (!Number.isFinite(volume)) {
      return;
    }

    const player = document.getElementById("movie_player");
    if (!player || typeof player.setVolume !== "function") {
      return;
    }

    player.setVolume(Math.max(0, Math.min(100, volume)));
    if (muted && typeof player.mute === "function") {
      player.mute();
    } else if (!muted && typeof player.unMute === "function") {
      player.unMute();
    }
  });
})();
