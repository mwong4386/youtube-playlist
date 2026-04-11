import {
  parseDurationLabelToSeconds,
  type ImportedYoutubePlaylistEntry,
} from "../background/youtubePlaylistImport";

interface PlaylistImportFallbackNode {
  textContent?: string | null;
  href?: string;
  querySelector: (selector: string) => PlaylistImportFallbackNode | null;
}

interface PlaylistImportFallbackRoot {
  querySelectorAll: (selector: string) => ArrayLike<PlaylistImportFallbackNode>;
}

const extractPlaylistEntriesFromPage = (
  root: PlaylistImportFallbackRoot,
): ImportedYoutubePlaylistEntry[] => {
  const playlistItems = Array.from(
    root.querySelectorAll("ytd-playlist-video-renderer"),
  );

  return playlistItems
    .map<ImportedYoutubePlaylistEntry | undefined>((playlistItem) => {
      const titleElement = playlistItem.querySelector("a#video-title");
      const channelElement = playlistItem.querySelector(
        "ytd-channel-name a, #byline a",
      );
      const durationElement = playlistItem.querySelector(
        "ytd-thumbnail-overlay-time-status-renderer span",
      );

      if (!titleElement || !channelElement) {
        return undefined;
      }

      const title = titleElement.textContent?.trim();
      const channelName = channelElement.textContent?.trim();
      const durationSeconds = durationElement?.textContent
        ? parseDurationLabelToSeconds(durationElement.textContent)
        : undefined;

      if (!title || !channelName) {
        return undefined;
      }

      let videoId = "";
      try {
        const titleUrl = new URL(
          titleElement.href || "",
          "https://www.youtube.com",
        );
        videoId = titleUrl.searchParams.get("v")?.trim() ?? "";
      } catch {
        videoId = "";
      }

      if (!videoId) {
        return undefined;
      }

      return {
        videoId,
        title,
        channelName,
        durationSeconds,
      };
    })
    .filter(
      (entry): entry is ImportedYoutubePlaylistEntry => typeof entry !== "undefined",
    );
};

export { extractPlaylistEntriesFromPage };
