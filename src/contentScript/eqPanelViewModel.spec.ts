import test from "node:test";
import {
  getEqPanelHintText,
  shouldShowEqProfileSelect,
} from "./eqPanelViewModel";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("getEqPanelHintText returns playback hint for active playback tabs", () => {
  expectEqual(
    getEqPanelHintText(true),
    "Drag to preview. Release to save to the current song."
  );
});

test("getEqPanelHintText returns preview hint for passive tabs", () => {
  expectEqual(
    getEqPanelHintText(false),
    "Preview only here. Start playback from the playlist to save."
  );
});

test("shouldShowEqProfileSelect is true when at least one profile exists", () => {
  expectEqual(
    shouldShowEqProfileSelect([
      {
        id: "profile-1",
        name: "Vocal Boost",
        audioEq: {
          clearBass: 0,
          band400: 0,
          band1k: 0,
          band2k5: 0,
          band6k3: 0,
          band16k: 0,
        },
      },
    ]),
    true
  );
});

test("shouldShowEqProfileSelect is false when no profiles exist", () => {
  expectEqual(shouldShowEqProfileSelect([]), false);
});
