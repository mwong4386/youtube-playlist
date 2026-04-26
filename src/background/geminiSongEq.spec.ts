import test from "node:test";
import {
  ADJUST_SONG_EQ_CAPABILITY,
  type GeminiAdjustSongEqFunctionCall,
  type GeminiCapability,
  type GeminiCapabilityName,
  type GeminiCreateEqProfileFunctionCall,
  type GeminiContextScope,
  type GeminiFunctionName,
  type GeminiSongContext,
  type GeminiSongEqResponse,
  type GeminiSongEqSuccess,
  type GeminiSongEqSuggestion,
  type GeminiSongEqSuggestionFailure,
  type GeminiSongEqUserRequest,
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
  const userRequest: GeminiSongEqUserRequest = {
    userRequest: "Make this song brighter without adding harshness.",
    existingProfiles: [
      {
        id: "bright",
        name: "Bright",
        audioEq: {
          clearBass: 0,
          band400: -1,
          band1k: 1,
          band2k5: 2,
          band6k3: 3,
          band16k: 2,
        },
      },
    ],
    songContext,
  };
  const functionCall: GeminiAdjustSongEqFunctionCall = {
    functionName: "adjustSongEq",
    arguments: {
      songId: "song-1",
      audioEq: {
        clearBass: 0,
        band400: 0,
        band1k: 1,
        band2k5: 2,
        band6k3: 2,
        band16k: 3,
      },
      reason: "Adds air while keeping the upper mids controlled.",
    },
  };
  const suggestion: GeminiSongEqSuggestion = {
    songId: "song-1",
    audioEq: functionCall.arguments.audioEq,
    reason: "Adds air while keeping the upper mids controlled.",
  };
  const success: GeminiSongEqSuccess = {
    ok: true,
    suggestion,
  };
  const response: GeminiSongEqResponse = success;
  const failure: GeminiSongEqSuggestionFailure = {
    ok: false,
    code: GeminiAnalyzeErrorCode.InvalidResponse,
    message: "Gemini did not return a usable song EQ adjustment.",
  };
  const failureResponse: GeminiSongEqResponse = failure;

  expectEqual(capabilityName, "adjust-song-eq");
  expectEqual(contextScope, "existingEqProfiles");
  expectEqual(functionName, "adjustSongEq");
  expectEqual(songContext.id, "song-1");
  expectEqual(userRequest.songContext.id, "song-1");
  expectEqual(functionCall.functionName, "adjustSongEq");
  expectEqual(suggestion.songId, "song-1");
  expectEqual(success.ok, true);
  expectEqual(response.ok, true);
  expectEqual(failure.ok, false);
  expectEqual(failureResponse.ok, false);
  expectEqual(capability, {
    name: "adjust-song-eq",
    allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
    allowedFunctions: ["adjustSongEq"],
  });
});

const invalidCreateEqProfileCall: GeminiCreateEqProfileFunctionCall = {
  // @ts-expect-error create-profile calls must use the createEqProfile function.
  functionName: "adjustSongEq",
  arguments: {
    name: "Warm Vocal",
    audioEq: {
      clearBass: 2,
      band400: 1,
      band1k: 3,
      band2k5: 2,
      band6k3: 1,
      band16k: -1,
    },
  },
};

const invalidAdjustSongEqCall: GeminiAdjustSongEqFunctionCall = {
  // @ts-expect-error song EQ calls must use the adjustSongEq function.
  functionName: "createEqProfile",
  arguments: {
    songId: "song-1",
    audioEq: {
      clearBass: 0,
      band400: 0,
      band1k: 1,
      band2k5: 2,
      band6k3: 2,
      band16k: 3,
    },
  },
};

void invalidCreateEqProfileCall;
void invalidAdjustSongEqCall;
