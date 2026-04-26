import test from "node:test";
import type AudioEqProfile from "../../models/AudioEqProfile";
import type { GeminiSongEqSuggestion } from "../../models/GeminiActions";
import type MPlaylistItem from "../../models/MPlaylistItem";
import {
  createGeminiEqSubmission,
  getGeminiEqSuggestionToApply,
  isGeminiEqActionDisabled,
  resolveGeminiEqSubmission,
  type GeminiEqReviewState,
} from "./selectionActionsGeminiEqReview";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const audioEq = {
  clearBass: 0,
  band400: 0,
  band1k: 0,
  band2k5: 0,
  band6k3: 0,
  band16k: 0,
};

const selectedSong: MPlaylistItem = {
  id: "song-1",
  title: "Song One",
  channelName: "Channel",
  url: "https://youtube.com/watch?v=abc",
  videoId: "abc",
  timestamp: 0,
  endTimestamp: undefined,
  maxDuration: 300,
  volume: 75,
  audioEq,
};

const suggestion: GeminiSongEqSuggestion = {
  songId: "song-1",
  audioEq: {
    clearBass: 2,
    band400: 1,
    band1k: 0,
    band2k5: 1,
    band6k3: 2,
    band16k: 3,
  },
  reason: "Adds presence without muddy bass.",
};

const initialState: GeminiEqReviewState = {
  request: "",
  status: "",
  suggestion: null,
  isLoading: false,
};

const existingProfiles: AudioEqProfile[] = [];

test("gemini eq review trims requests and waits for explicit apply", () => {
  const submission = createGeminiEqSubmission({
    state: {
      ...initialState,
      request: "  brighten the vocals  ",
    },
    selectedCount: 1,
    selectedSong,
    audioEqProfiles: existingProfiles,
    requestToken: 1,
  });

  expectEqual(submission.runtimeRequest?.userRequest, "brighten the vocals");
  expectEqual(submission.state.isLoading, true);
  expectEqual(getGeminiEqSuggestionToApply(submission.state), null);

  const reviewedState = resolveGeminiEqSubmission({
    state: submission.state,
    response: {
      ok: true,
      suggestion,
    },
    responseToken: submission.requestToken,
    latestRequestToken: submission.requestToken,
    active: true,
  });

  expectEqual(reviewedState.suggestion, suggestion);
  expectEqual(getGeminiEqSuggestionToApply(reviewedState), suggestion);
});

test("gemini eq review allows empty requests for context-based suggestions", () => {
  const submission = createGeminiEqSubmission({
    state: {
      ...initialState,
      request: "   ",
    },
    selectedCount: 1,
    selectedSong,
    audioEqProfiles: existingProfiles,
    requestToken: 1,
  });

  expectEqual(submission.runtimeRequest?.userRequest, "");
  expectEqual(submission.runtimeRequest?.songContext.id, "song-1");
  expectEqual(submission.state.status, "Generating suggestion...");
  expectEqual(submission.state.isLoading, true);
});

test("gemini eq review ignores stale late responses", () => {
  const submission = createGeminiEqSubmission({
    state: {
      ...initialState,
      request: "more bass",
    },
    selectedCount: 1,
    selectedSong,
    audioEqProfiles: existingProfiles,
    requestToken: 3,
  });

  const reviewedState = resolveGeminiEqSubmission({
    state: initialState,
    response: {
      ok: true,
      suggestion,
    },
    responseToken: submission.requestToken,
    latestRequestToken: submission.requestToken + 1,
    active: true,
  });

  expectEqual(reviewedState.suggestion, null);
  expectEqual(getGeminiEqSuggestionToApply(reviewedState), null);
});

test("gemini eq action is disabled unless exactly one song is selected", () => {
  expectEqual(isGeminiEqActionDisabled(0), true);
  expectEqual(isGeminiEqActionDisabled(1), false);
  expectEqual(isGeminiEqActionDisabled(2), true);
});
