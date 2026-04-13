import test from "node:test";
import reducePlaybackState from "./playbackMachine.js";
import { createInitialPlaybackState } from "../models/PlaybackState.js";

test("initial playback state no longer tracks player pin visibility", () => {
  const state = createInitialPlaybackState() as unknown as Record<string, unknown>;

  if ("enablePin" in state) {
    throw new Error("enablePin should not exist in playback state");
  }
});

test("volume adjust toggle does not reintroduce removed player pin state", () => {
  const state = reducePlaybackState(createInitialPlaybackState(), {
    type: "TOGGLE_VOLUME_ADJUST",
  }) as unknown as Record<string, unknown>;

  if ("enablePin" in state) {
    throw new Error("enablePin should stay removed after reducer updates");
  }
});
