import test from "node:test";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";
import type MPlaylistItem from "../models/MPlaylistItem";
import type { PlaylistSourceRecord } from "../models/SongList";
import {
  addPendingPlaylistUpdateItem,
  addPendingPlaylistUpdates,
  dismissPendingPlaylistUpdateItem,
  dismissPendingPlaylistUpdates,
  findNewPlaylistItems,
  isPlaylistSourceDueForRefresh,
  updatePlaylistSourceAfterRefresh,
} from "./playlistUpdateDetection";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

const item = (id: string): MPlaylistItem => ({
  id,
  title: `Song ${id}`,
  channelName: "Channel",
  url: `https://www.youtube.com/watch?v=${id}`,
  videoId: id,
  timestamp: 0,
  endTimestamp: undefined,
  maxDuration: 0,
  volume: 100,
  audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
});

test("isPlaylistSourceDueForRefresh returns true when never checked", () => {
  expectEqual(
    isPlaylistSourceDueForRefresh(
      {
        url: "https://www.youtube.com/playlist?list=PL123",
        lastSeenVideoIds: [],
      },
      new Date("2026-05-03T12:00:00.000Z")
    ),
    true
  );
});

test("isPlaylistSourceDueForRefresh waits for 24 hours", () => {
  const source: PlaylistSourceRecord = {
    url: "https://www.youtube.com/playlist?list=PL123",
    lastCheckedAt: "2026-05-03T00:30:00.000Z",
    lastSeenVideoIds: [],
  };

  expectEqual(
    isPlaylistSourceDueForRefresh(
      source,
      new Date("2026-05-03T23:00:00.000Z")
    ),
    false
  );
  expectEqual(
    isPlaylistSourceDueForRefresh(
      source,
      new Date("2026-05-04T00:30:00.000Z")
    ),
    true
  );
});

test("findNewPlaylistItems compares imported videoIds against last seen snapshot", () => {
  expectEqual(
    findNewPlaylistItems(
      {
        url: "https://www.youtube.com/playlist?list=PL123",
        lastSeenVideoIds: ["old"],
      },
      [item("new"), item("old")]
    ),
    [item("new")]
  );
});

test("updatePlaylistSourceAfterRefresh stores pending items and fetched snapshot", () => {
  expectEqual(
    updatePlaylistSourceAfterRefresh(
      {
        url: "https://www.youtube.com/playlist?list=PL123",
        lastSeenVideoIds: ["old"],
      },
      [item("new"), item("old")],
      new Date("2026-05-03T12:00:00.000Z")
    ),
    {
      url: "https://www.youtube.com/playlist?list=PL123",
      lastCheckedAt: "2026-05-03T12:00:00.000Z",
      lastSeenVideoIds: ["old"],
      pendingNewItems: [item("new")],
      pendingSnapshotVideoIds: ["new", "old"],
    }
  );
});

test("updatePlaylistSourceAfterRefresh advances snapshot when there are no new items", () => {
  expectEqual(
    updatePlaylistSourceAfterRefresh(
      {
        url: "https://www.youtube.com/playlist?list=PL123",
        lastSeenVideoIds: ["old"],
        pendingNewItems: [item("stale")],
        pendingSnapshotVideoIds: ["stale", "old"],
      },
      [item("old")],
      new Date("2026-05-03T12:00:00.000Z")
    ),
    {
      url: "https://www.youtube.com/playlist?list=PL123",
      lastCheckedAt: "2026-05-03T12:00:00.000Z",
      lastSeenVideoIds: ["old"],
    }
  );
});

test("addPendingPlaylistUpdates appends pending items and advances snapshot", () => {
  expectEqual(
    addPendingPlaylistUpdates([item("old")], {
      url: "https://www.youtube.com/playlist?list=PL123",
      lastSeenVideoIds: ["old"],
      pendingNewItems: [item("new")],
      pendingSnapshotVideoIds: ["new", "old"],
    }),
    {
      items: [item("old"), item("new")],
      source: {
        url: "https://www.youtube.com/playlist?list=PL123",
        lastSeenVideoIds: ["new", "old"],
      },
    }
  );
});

test("addPendingPlaylistUpdateItem appends one pending item and keeps remaining updates pending", () => {
  expectEqual(
    addPendingPlaylistUpdateItem([item("old")], {
      url: "https://www.youtube.com/playlist?list=PL123",
      lastSeenVideoIds: ["old"],
      pendingNewItems: [item("new-1"), item("new-2")],
      pendingSnapshotVideoIds: ["new-1", "new-2", "old"],
    }, "new-1"),
    {
      items: [item("old"), item("new-1")],
      source: {
        url: "https://www.youtube.com/playlist?list=PL123",
        lastSeenVideoIds: ["old"],
        pendingNewItems: [item("new-2")],
        pendingSnapshotVideoIds: ["new-1", "new-2", "old"],
      },
    }
  );
});

test("dismissPendingPlaylistUpdateItem removes one pending item and advances snapshot after the last decision", () => {
  expectEqual(
    dismissPendingPlaylistUpdateItem({
      url: "https://www.youtube.com/playlist?list=PL123",
      lastSeenVideoIds: ["old"],
      pendingNewItems: [item("new")],
      pendingSnapshotVideoIds: ["new", "old"],
    }, "new"),
    {
      url: "https://www.youtube.com/playlist?list=PL123",
      lastSeenVideoIds: ["new", "old"],
    }
  );
});

test("dismissPendingPlaylistUpdates advances snapshot without appending items", () => {
  expectEqual(
    dismissPendingPlaylistUpdates({
      url: "https://www.youtube.com/playlist?list=PL123",
      lastSeenVideoIds: ["old"],
      pendingNewItems: [item("new")],
      pendingSnapshotVideoIds: ["new", "old"],
    }),
    {
      url: "https://www.youtube.com/playlist?list=PL123",
      lastSeenVideoIds: ["new", "old"],
    }
  );
});
