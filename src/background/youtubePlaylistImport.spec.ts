import test from "node:test";
import MsgType from "../constants/msgType";
import {
  buildImportedPlaylistItems,
  extractPlaylistEntriesFromHtml,
  importYoutubePlaylist,
  normalizeYoutubePlaylistUrl,
  resolveYoutubePlaylist,
  resolveYoutubePlaylistByFetch,
} from "./youtubePlaylistImport";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";
import MPlaylistItem from "../models/MPlaylistItem";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

const expectPlaylistImportErrorCode = (
  error: unknown,
  code: string
): void => {
  expectEqual(error instanceof Error, true);
  expectEqual((error as { code?: string } | undefined)?.code, code);
};

const createPlaylistItem = (
  videoId: string,
  overrides: Partial<MPlaylistItem> = {}
): MPlaylistItem => ({
  id: `${videoId}-id`,
  title: `Song ${videoId}`,
  channelName: `Channel ${videoId}`,
  url: `https://www.youtube.com/watch?v=${videoId}`,
  videoId,
  timestamp: 0,
  endTimestamp: undefined,
  maxDuration: 0,
  volume: 100,
  audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
  ...overrides,
});

test("extractPlaylistEntriesFromHtml reads playlist entries from a ytInitialData-like HTML payload", () => {
  const html = `
    <html>
      <body>
        <script nonce="abc">
          var ytInitialData = {
            "contents": {
              "twoColumnBrowseResultsRenderer": {
                "tabs": [
                  {
                    "tabRenderer": {
                      "content": {
                        "sectionListRenderer": {
                          "contents": [
                            {
                              "itemSectionRenderer": {
                                "contents": [
                                  {
                                    "playlistVideoListRenderer": {
                                      "contents": [
                                        {
                                          "playlistVideoRenderer": {
                                            "videoId": "video-1",
                                            "title": {
                                              "runs": [
                                                { "text": "First song" }
                                              ]
                                            },
                                            "shortBylineText": {
                                              "runs": [
                                                { "text": "First channel" }
                                              ]
                                            },
                                            "lengthSeconds": "245"
                                          }
                                        },
                                        {
                                          "playlistVideoRenderer": {
                                            "videoId": "video-2",
                                            "title": {
                                              "simpleText": "Second song"
                                            },
                                            "shortBylineText": {
                                              "simpleText": "Second channel"
                                            },
                                            "lengthText": {
                                              "simpleText": "3:05"
                                            }
                                          }
                                        }
                                      ]
                                    }
                                  }
                                ]
                              }
                            }
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            }
          };
        </script>
      </body>
    </html>
  `;

  expectEqual(extractPlaylistEntriesFromHtml(html), [
    {
      videoId: "video-1",
      title: "First song",
      channelName: "First channel",
      durationSeconds: 245,
    },
    {
      videoId: "video-2",
      title: "Second song",
      channelName: "Second channel",
      durationSeconds: 185,
    },
  ]);
});

test("buildImportedPlaylistItems assigns default playback settings", () => {
  expectEqual(
    buildImportedPlaylistItems([
      {
        videoId: "abc123",
        title: "Song",
        channelName: "Channel",
        durationSeconds: 203,
      },
    ]),
    [
      {
        id: "abc123-0",
        title: "Song",
        channelName: "Channel",
        url: "https://www.youtube.com/watch?v=abc123",
        videoId: "abc123",
        timestamp: 0,
        endTimestamp: undefined,
        geminiSuggestedStartTimestamp: undefined,
        geminiSuggestedEndTimestamp: undefined,
        maxDuration: 203,
        volume: 100,
        audioEq: DEFAULT_AUDIO_EQ_SETTINGS,
      },
    ]
  );
});

test("buildImportedPlaylistItems clones default audio eq settings per item", () => {
  const items = buildImportedPlaylistItems([
    {
      videoId: "abc123",
      title: "Song A",
      channelName: "Channel A",
    },
    {
      videoId: "def456",
      title: "Song B",
      channelName: "Channel B",
    },
  ]);

  expectEqual(items[0]?.audioEq === items[1]?.audioEq, false);
});

test("extractPlaylistEntriesFromHtml throws parse-failed when ytInitialData is missing", () => {
  let error: unknown;

  try {
    extractPlaylistEntriesFromHtml("<html><body>no playlist data</body></html>");
  } catch (caught) {
    error = caught;
  }

  expectPlaylistImportErrorCode(error, "parse-failed");
});

test("resolveYoutubePlaylistByFetch normalizes the playlist url before fetching", async () => {
  let requestedUrl = "";
  const fetcher = async (url: string) => {
    requestedUrl = url;
    return {
      ok: true,
      text: async () => `
        <script>var ytInitialData = {
          "contents": {
            "twoColumnBrowseResultsRenderer": {
              "tabs": [
                {
                  "tabRenderer": {
                    "content": {
                      "sectionListRenderer": {
                        "contents": [
                          {
                            "itemSectionRenderer": {
                              "contents": [
                                {
                                  "playlistVideoListRenderer": {
                                    "contents": [
                                      {
                                        "playlistVideoRenderer": {
                                          "videoId": "abc123",
                                          "title": {"simpleText": "Song"},
                                          "shortBylineText": {"simpleText": "Channel"}
                                        }
                                      }
                                    ]
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }
        };</script>
      `,
    };
  };

  const items = await resolveYoutubePlaylistByFetch(
    "https://www.youtube.com/watch?v=abc123&t=42s&list=PL123",
    fetcher
  );

  expectEqual(
    requestedUrl,
    normalizeYoutubePlaylistUrl(
      "https://www.youtube.com/watch?v=abc123&t=42s&list=PL123"
    )
  );
  expectEqual(items[0]?.id, "abc123-0");
});

test("resolveYoutubePlaylistByFetch throws playlist-unavailable for non-ok responses", async () => {
  const fetcher = async () => {
    return {
      ok: false,
      text: async () => "",
    };
  };

  let error: unknown;

  try {
    await resolveYoutubePlaylistByFetch(
      "https://www.youtube.com/watch?v=abc123&list=PL123",
      fetcher
    );
  } catch (caught) {
    error = caught;
  }

  expectEqual((error as { code?: string } | undefined)?.code, "playlist-unavailable");
});

test("resolveYoutubePlaylistByFetch throws playlist-empty when the html has no entries", async () => {
  const fetcher = async () => {
    return {
      ok: true,
      text: async () => "<html><body><script>var ytInitialData = {};</script></body></html>",
    };
  };

  let error: unknown;

  try {
    await resolveYoutubePlaylistByFetch(
      "https://www.youtube.com/watch?v=abc123&list=PL123",
      fetcher
    );
  } catch (caught) {
    error = caught;
  }

  expectEqual((error as { code?: string } | undefined)?.code, "playlist-empty");
});

test("resolveYoutubePlaylistByFetch throws parse-failed for invalid ytInitialData json", async () => {
  const fetcher = async () => {
    return {
      ok: true,
      text: async () =>
        "<html><body><script>var ytInitialData = { invalid json };</script></body></html>",
    };
  };

  let error: unknown;

  try {
    await resolveYoutubePlaylistByFetch(
      "https://www.youtube.com/watch?v=abc123&list=PL123",
      fetcher
    );
  } catch (caught) {
    error = caught;
  }

  expectPlaylistImportErrorCode(error, "parse-failed");
});

test("resolveYoutubePlaylistByFetch throws invalid-url for playlist urls without a list id", async () => {
  let error: unknown;

  try {
    await resolveYoutubePlaylistByFetch(
      "https://www.youtube.com/watch?v=abc123",
      async () => {
        throw new Error("should not fetch");
      }
    );
  } catch (caught) {
    error = caught;
  }

  expectPlaylistImportErrorCode(error, "invalid-url");
});

test("resolveYoutubePlaylist falls back to temporary tab extraction when fetch parsing fails", async () => {
  let fallbackUrl = "";

  const items = await resolveYoutubePlaylist(
    "https://www.youtube.com/watch?v=abc123&t=42s&list=PL123",
    {
      fetchPlaylist: async () => {
        const error = new Error("parse failed") as Error & { code?: string };
        error.code = "parse-failed";
        throw error;
      },
      extractPlaylistFromTab: async (playlistUrl: string) => {
        fallbackUrl = playlistUrl;
        return [
          createPlaylistItem("fallback-video", {
            id: "fallback-video-0",
            title: "Fallback song",
            channelName: "Fallback channel",
          }),
        ];
      },
    }
  );

  expectEqual(
    fallbackUrl,
    normalizeYoutubePlaylistUrl(
      "https://www.youtube.com/watch?v=abc123&t=42s&list=PL123"
    )
  );
  expectEqual(items, [
    createPlaylistItem("fallback-video", {
      id: "fallback-video-0",
      title: "Fallback song",
      channelName: "Fallback channel",
    }),
  ]);
});

test("resolveYoutubePlaylist registers the fallback listener before opening the temporary tab", async () => {
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome;
  const imported = [
    createPlaylistItem("fast-fallback-video", {
      id: "fast-fallback-video-0",
    }),
  ];
  let messageListener:
    | ((
        message: unknown,
        sender?: { tab?: { id?: number } }
      ) => void)
    | null = null;

  (globalThis as unknown as {
    chrome?: {
      runtime: {
        onMessage: {
          addListener: (
            callback: (
              message: unknown,
              sender?: { tab?: { id?: number } }
            ) => void
          ) => void;
          removeListener: (
            callback: (
              message: unknown,
              sender?: { tab?: { id?: number } }
            ) => void
          ) => void;
        };
      };
      storage: {
        sync: Record<string, unknown>;
      };
      tabs: {
        create: (properties: {
          url: string;
          active: boolean;
        }) => Promise<{ id?: number }>;
        remove: (tabId: number) => Promise<void>;
      };
    };
  }).chrome = {
    runtime: {
      onMessage: {
        addListener: (callback) => {
          messageListener = callback;
        },
        removeListener: (callback) => {
          if (messageListener === callback) {
            messageListener = null;
          }
        },
      },
    },
    storage: {
      sync: {},
    },
    tabs: {
      create: async () => {
        if (!messageListener) {
          throw new Error("listener missing before tab creation");
        }

        const tabId = 99;
        setTimeout(() => {
          messageListener?.(
            {
              name: MsgType.ImportYoutubePlaylistFallbackResult,
              items: imported,
            },
            { tab: { id: tabId } }
          );
        }, 0);

        return { id: tabId };
      },
      remove: async () => undefined,
    },
  };

  try {
    const items = await resolveYoutubePlaylist(
      "https://www.youtube.com/watch?v=abc123&list=PL123",
      {
        fetchPlaylist: async () => {
          const error = new Error("parse failed") as Error & { code?: string };
          error.code = "parse-failed";
          throw error;
        },
      }
    );

    expectEqual(items, imported);
  } finally {
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  }
});

test("importYoutubePlaylist appends new imported items and writes the merged playlist", async () => {
  const existing = [createPlaylistItem("existing-video")];
  const imported = [
    createPlaylistItem("existing-video", { id: "duplicate-import" }),
    createPlaylistItem("new-video"),
  ];
  const writes: MPlaylistItem[][] = [];

  const response = await importYoutubePlaylist(
    {
      playlistUrl: "https://www.youtube.com/watch?v=abc123&list=PL123",
      mode: "append",
    },
    {
      readPlaylist: async () => existing,
      writePlaylist: async (playlist) => {
        writes.push(playlist);
      },
      resolvePlaylist: async () => imported,
    }
  );

  expectEqual(response, {
    ok: true,
    importedCount: 1,
    skippedDuplicates: 1,
  });
  expectEqual(writes, [[...existing, imported[1]]]);
});

test("importYoutubePlaylist returns an error when append mode only finds duplicates", async () => {
  const existing = [createPlaylistItem("shared-video")];
  let writes = 0;

  const response = await importYoutubePlaylist(
    {
      playlistUrl: "https://www.youtube.com/watch?v=abc123&list=PL123",
      mode: "append",
    },
    {
      readPlaylist: async () => existing,
      writePlaylist: async () => {
        writes += 1;
      },
      resolvePlaylist: async () => [
        createPlaylistItem("shared-video", { id: "duplicate-import" }),
      ],
    }
  );

  expectEqual(response, {
    ok: false,
    code: "playlist-unchanged",
    message: "All videos in this playlist are already saved.",
  });
  expectEqual(writes, 0);
});

test("importYoutubePlaylist replaces the saved playlist in replace mode", async () => {
  const existing = [createPlaylistItem("existing-video")];
  const imported = [createPlaylistItem("imported-video")];
  const writes: MPlaylistItem[][] = [];

  const response = await importYoutubePlaylist(
    {
      playlistUrl: "https://www.youtube.com/watch?v=abc123&list=PL123",
      mode: "replace",
    },
    {
      readPlaylist: async () => existing,
      writePlaylist: async (playlist) => {
        writes.push(playlist);
      },
      resolvePlaylist: async () => imported,
    }
  );

  expectEqual(response, {
    ok: true,
    importedCount: 1,
    skippedDuplicates: 0,
  });
  expectEqual(writes, [imported]);
});

test("importYoutubePlaylist default storage path updates only the active named song list", async () => {
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome;
  const imported = [createPlaylistItem("imported-video")];
  const writes: Record<string, unknown>[] = [];

  (globalThis as unknown as {
    chrome?: {
      runtime: { onMessage: { addListener: () => void; removeListener: () => void } };
      storage: {
        sync: {
          get: (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => void;
          set: (items: Record<string, unknown>) => Promise<void>;
        };
      };
      tabs: {
        create: (properties: { url: string; active: boolean }) => Promise<{ id?: number }>;
        remove: (tabId: number) => Promise<void>;
      };
    };
  }).chrome = {
    runtime: {
      onMessage: {
        addListener: () => undefined,
        removeListener: () => undefined,
      },
    },
    storage: {
      sync: {
        get: (_keys, callback) => {
          callback({
            songLists: {
              default: { items: [createPlaylistItem("default-video")] },
              aimer: { items: [createPlaylistItem("aimer-video")] },
            },
            activeSongListName: "aimer",
          });
        },
        set: async (items) => {
          writes.push(items);
        },
      },
    },
    tabs: {
      create: async () => ({ id: 1 }),
      remove: async () => undefined,
    },
  };

  try {
    const response = await importYoutubePlaylist(
      {
        playlistUrl: "https://www.youtube.com/watch?v=abc123&list=PL123",
        mode: "replace",
      },
      {
        resolvePlaylist: async () => imported,
      }
    );

    expectEqual(response, {
      ok: true,
      importedCount: 1,
      skippedDuplicates: 0,
    });
    expectEqual(writes, [
      {
        songLists: {
          default: { items: [createPlaylistItem("default-video")] },
          aimer: { items: imported },
        },
      },
    ]);
  } finally {
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  }
});

test("importYoutubePlaylist returns invalid-url without reading or writing", async () => {
  let readCount = 0;
  let writeCount = 0;
  let resolveCount = 0;

  const response = await importYoutubePlaylist(
    {
      playlistUrl: "https://www.youtube.com/watch?v=abc123",
      mode: "append",
    },
    {
      readPlaylist: async () => {
        readCount += 1;
        return [];
      },
      writePlaylist: async () => {
        writeCount += 1;
      },
      resolvePlaylist: async () => {
        resolveCount += 1;
        return [];
      },
    }
  );

  expectEqual(response, {
    ok: false,
    code: "invalid-url",
    message: "Invalid YouTube playlist URL.",
  });
  expectEqual(readCount, 0);
  expectEqual(writeCount, 0);
  expectEqual(resolveCount, 0);
});

test("importYoutubePlaylist maps storage write failures to write-failed", async () => {
  const response = await importYoutubePlaylist(
    {
      playlistUrl: "https://www.youtube.com/watch?v=abc123&list=PL123",
      mode: "replace",
    },
    {
      readPlaylist: async () => [],
      writePlaylist: async () => {
        throw new Error("storage unavailable");
      },
      resolvePlaylist: async () => [createPlaylistItem("imported-video")],
    }
  );

  expectEqual(response, {
    ok: false,
    code: "write-failed",
    message: "Could not save imported playlist.",
  });
});
