import test from "node:test";
import { extractPlaylistEntriesFromPage } from "./playlistImportFallback";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("extractPlaylistEntriesFromPage reads duration labels from playlist rows", () => {
  const root = {
    querySelectorAll: () => [
      {
        querySelector: (selector: string) => {
          switch (selector) {
            case "a#video-title":
              return {
                textContent: "First song",
                href: "https://www.youtube.com/watch?v=video-1",
              };
            case "ytd-channel-name a, #byline a":
              return {
                textContent: "First channel",
              };
            case "ytd-thumbnail-overlay-time-status-renderer span":
              return {
                textContent: "4:05",
              };
            default:
              return null;
          }
        },
      },
    ],
  };

  expectEqual(extractPlaylistEntriesFromPage(root as never), [
    {
      videoId: "video-1",
      title: "First song",
      channelName: "First channel",
      durationSeconds: 245,
    },
  ]);
});
