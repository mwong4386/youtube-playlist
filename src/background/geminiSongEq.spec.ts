import test from "node:test";
import {
  ADJUST_SONG_EQ_CAPABILITY,
  type GeminiCapability,
  type GeminiCapabilityName,
  type GeminiContextScope,
  type GeminiFunctionName,
  type GeminiSongContext,
  type GeminiSongEqSuggestionFailure,
} from "../models/GeminiActions";
import { GeminiAnalyzeErrorCode } from "../models/GeminiSettings";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

test("ADJUST_SONG_EQ_CAPABILITY exposes the approved action contract", () => {
  const capabilityName: GeminiCapabilityName = "adjust-song-eq";
  const contextScope: GeminiContextScope = "existingEqProfiles";
  const functionName: GeminiFunctionName = "adjustSongEq";
  const songContext: GeminiSongContext = {
    id: "song-1",
    title: "Song Title",
    channelName: "Artist",
    videoId: "abc123",
    url: "https://www.youtube.com/watch?v=abc123",
    audioEq: {
      clearBass: 0,
      band400: 0,
      band1k: 0,
      band2k5: 0,
      band6k3: 3,
      band16k: 4,
    },
  };
  const capability: GeminiCapability = ADJUST_SONG_EQ_CAPABILITY;
  const failure: GeminiSongEqSuggestionFailure = {
    ok: false,
    code: GeminiAnalyzeErrorCode.InvalidResponse,
    message: "Gemini did not return a usable song EQ adjustment.",
  };

  expectEqual(capabilityName, "adjust-song-eq");
  expectEqual(contextScope, "existingEqProfiles");
  expectEqual(functionName, "adjustSongEq");
  expectEqual(songContext.id, "song-1");
  expectEqual(failure.ok, false);
  expectEqual(capability, {
    name: "adjust-song-eq",
    allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
    allowedFunctions: ["adjustSongEq"],
  });
});
