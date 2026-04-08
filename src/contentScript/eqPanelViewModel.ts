import AudioEqProfile from "../models/AudioEqProfile";

export const getEqPanelHintText = (isCurrentPlaybackTab: boolean) => {
  return isCurrentPlaybackTab
    ? "Drag to preview. Release to save to the current song."
    : "Preview only here. Start playback from the playlist to save.";
};

export const shouldShowEqProfileSelect = (profiles: AudioEqProfile[]) => {
  return profiles.length > 0;
};
