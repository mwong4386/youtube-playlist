import test from "node:test";
import { parseImportedPlaylist } from "./playlistImport";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("parseImportedPlaylist accepts a valid playlist and normalizes values", () => {
  const result = parseImportedPlaylist(
    JSON.stringify([
      {
        id: "abc",
        title: " Song ",
        channelName: " Channel ",
        url: " https://youtube.com/watch?v=123 ",
        videoId: "123",
        timestamp: 12.9,
        endTimestamp: 48.2,
        maxDuration: 60.7,
        volume: 104.4,
        audioEq: {
          preset: "bassBoost",
        },
      },
    ])
  );

  expectEqual(result.error, undefined);
  expectEqual(result.playlist, [
    {
      id: "abc",
      title: "Song",
      channelName: "Channel",
      url: "https://youtube.com/watch?v=123",
      videoId: "123",
      timestamp: 12,
      endTimestamp: 48,
      maxDuration: 60,
      volume: 100,
      audioEq: {
        preset: "bassBoost",
      },
    },
  ]);
});

test("parseImportedPlaylist fills in default eq settings for old playlists", () => {
  const result = parseImportedPlaylist(
    JSON.stringify([
      {
        id: "legacy",
        title: "Song",
        channelName: "Channel",
        url: "https://youtube.com/watch?v=123",
        videoId: "123",
        timestamp: 12,
        endTimestamp: 48,
        maxDuration: 60,
        volume: 40,
      },
    ])
  );

  expectEqual(result.error, undefined);
  expectEqual(result.playlist?.[0]?.audioEq, {
    preset: "flat",
  });
});

test("parseImportedPlaylist rejects non-array JSON payloads", () => {
  const result = parseImportedPlaylist(
    JSON.stringify({
      id: "abc",
    })
  );

  expectEqual(result, {
    error: "The playlist file must contain a JSON array.",
  });
});

test("parseImportedPlaylist rejects items with invalid values", () => {
  const result = parseImportedPlaylist(
    JSON.stringify([
      {
        id: "abc",
        title: "Song",
        channelName: "Channel",
        url: "https://youtube.com/watch?v=123",
        videoId: "123",
        timestamp: 12,
        endTimestamp: 6,
        maxDuration: 60,
        volume: 50,
      },
    ])
  );

  expectEqual(result, {
    error:
      'Item 1 has an invalid "endTimestamp" field: expected a value greater than timestamp',
  });
});
