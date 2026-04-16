import test from "node:test";
import type MPlaylistItem from "../models/MPlaylistItem";
import { getPlaybackNavigationTarget } from "./playbackNavigation";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const createItem = (id: string): MPlaylistItem => ({
  id,
  title: `Song ${id}`,
  channelName: `Artist ${id}`,
  url: `https://www.youtube.com/watch?v=${id}`,
  videoId: id,
  timestamp: 0,
  endTimestamp: undefined,
  maxDuration: 200,
  volume: 100,
  audioEq: {
    clearBass: 0,
    band400: 0,
    band1k: 0,
    band2k5: 0,
    band6k3: 0,
    band16k: 0,
  },
});

const playlist = [createItem("a"), createItem("b"), createItem("c")];

test("getPlaybackNavigationTarget returns the next playlist item with wraparound", () => {
  const item = getPlaybackNavigationTarget({
    playlist,
    currentItemId: "c",
    queueMode: "sequential",
    direction: "next",
  });

  expectEqual(item?.id, "a");
});

test("getPlaybackNavigationTarget returns the previous playlist item with wraparound", () => {
  const item = getPlaybackNavigationTarget({
    playlist,
    currentItemId: "a",
    queueMode: "sequential",
    direction: "previous",
  });

  expectEqual(item?.id, "c");
});

test("getPlaybackNavigationTarget falls back to the first item for next when nothing is active", () => {
  const item = getPlaybackNavigationTarget({
    playlist,
    currentItemId: null,
    queueMode: "off",
    direction: "next",
  });

  expectEqual(item?.id, "a");
});

test("getPlaybackNavigationTarget falls back to the last item for previous when nothing is active", () => {
  const item = getPlaybackNavigationTarget({
    playlist,
    currentItemId: null,
    queueMode: "off",
    direction: "previous",
  });

  expectEqual(item?.id, "c");
});

test("getPlaybackNavigationTarget uses the supplied random picker in random mode next navigation", () => {
  const item = getPlaybackNavigationTarget({
    playlist,
    currentItemId: "a",
    queueMode: "random",
    direction: "next",
    pickRandomIndex: () => 2,
  });

  expectEqual(item?.id, "c");
});
