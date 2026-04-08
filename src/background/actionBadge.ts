import MPlaylistItem from "../models/MPlaylistItem";

export const SAVED_BADGE_TEXT = "✓";

export const getVideoIdFromWatchUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    if (
      !parsedUrl.hostname.includes("youtube.com") ||
      parsedUrl.pathname !== "/watch"
    ) {
      return null;
    }

    return parsedUrl.searchParams.get("v");
  } catch {
    return null;
  }
};

export const shouldShowSavedBadge = (
  url: string | null | undefined,
  playlist: MPlaylistItem[],
) => {
  const videoId = getVideoIdFromWatchUrl(url);
  if (!videoId) {
    return false;
  }

  return playlist.some((item) => item.videoId === videoId);
};
