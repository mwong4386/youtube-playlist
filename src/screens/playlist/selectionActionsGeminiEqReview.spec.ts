import test from "node:test";
import type AudioEqProfile from "../../models/AudioEqProfile";
import type { GeminiSongEqSuggestion } from "../../models/GeminiActions";
import { GeminiAnalyzeErrorCode } from "../../models/GeminiSettings";
import type MPlaylistItem from "../../models/MPlaylistItem";
import {
  createGeminiEqBatchSubmission,
  createGeminiEqSubmission,
  DEFAULT_GEMINI_SONG_EQ_REQUEST,
  isGeminiEqActionDisabled,
  resolveGeminiEqBatchCompletion,
  resolveGeminiEqBatchProgress,
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

const secondSelectedSong: MPlaylistItem = {
  ...selectedSong,
  id: "song-2",
  title: "Song Two",
  url: "https://youtube.com/watch?v=def",
  videoId: "def",
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
  isLoading: false,
  totalCount: 0,
  successCount: 0,
  failCount: 0,
  messages: [],
};

const existingProfiles: AudioEqProfile[] = [];

test("gemini eq batch trims requests and creates one runtime request per selected song", () => {
  const submission = createGeminiEqBatchSubmission({
    state: {
      ...initialState,
      request: "  brighten the vocals  ",
    },
    selectedSongs: [selectedSong, secondSelectedSong],
    audioEqProfiles: existingProfiles,
    requestToken: 1,
  });

  expectEqual(submission.runtimeRequests.length, 2);
  expectEqual(submission.runtimeRequests[0].userRequest, "brighten the vocals");
  expectEqual(submission.runtimeRequests[0].songContext.id, "song-1");
  expectEqual(submission.runtimeRequests[1].songContext.id, "song-2");
  expectEqual(submission.state.isLoading, true);
  expectEqual(submission.state.totalCount, 2);

  const progressState = resolveGeminiEqBatchProgress({
    state: submission.state,
    result: {
      ok: true,
      suggestion,
    },
    songTitle: "Song One",
    requestToken: submission.requestToken,
    latestRequestToken: submission.requestToken,
    active: true,
  });

  expectEqual(progressState.successCount, 1);
  expectEqual(progressState.failCount, 0);
  expectEqual(progressState.messages[0], "Song One: EQ applied.");
});

test("gemini eq batch allows one song through the same auto-apply path", () => {
  const submission = createGeminiEqBatchSubmission({
    state: {
      ...initialState,
      request: "   ",
    },
    selectedSongs: [selectedSong],
    audioEqProfiles: existingProfiles,
    requestToken: 1,
  });

  expectEqual(submission.runtimeRequests.length, 1);
  expectEqual(
    submission.runtimeRequests[0].userRequest,
    DEFAULT_GEMINI_SONG_EQ_REQUEST,
  );
  expectEqual(submission.runtimeRequests[0].songContext.id, "song-1");
  expectEqual(submission.state.status, "Generating EQ for 1 song...");
  expectEqual(submission.state.isLoading, true);
});

test("gemini eq review sends a default song-context request for one blank selected song", () => {
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

  expectEqual(
    submission.runtimeRequest?.userRequest,
    DEFAULT_GEMINI_SONG_EQ_REQUEST,
  );
});

test("gemini eq batch ignores stale late progress and completion", () => {
  const submission = createGeminiEqBatchSubmission({
    state: {
      ...initialState,
      request: "more bass",
    },
    selectedSongs: [selectedSong],
    audioEqProfiles: existingProfiles,
    requestToken: 3,
  });

  const progressState = resolveGeminiEqBatchProgress({
    state: initialState,
    result: {
      ok: true,
      suggestion,
    },
    songTitle: "Song One",
    requestToken: submission.requestToken,
    latestRequestToken: submission.requestToken + 1,
    active: true,
  });

  const completedState = resolveGeminiEqBatchCompletion({
    state: progressState,
    requestToken: submission.requestToken,
    latestRequestToken: submission.requestToken + 1,
    active: true,
  });

  expectEqual(completedState.isLoading, false);
  expectEqual(completedState.status, "");
});

test("gemini eq batch reports mixed success and failure totals", () => {
  const successState = resolveGeminiEqBatchProgress({
    state: {
      ...initialState,
      isLoading: true,
      totalCount: 2,
    },
    result: {
      ok: true,
      suggestion,
    },
    songTitle: "Song One",
    requestToken: 1,
    latestRequestToken: 1,
    active: true,
  });

  const failedState = resolveGeminiEqBatchProgress({
    state: successState,
    result: {
      ok: false,
      code: GeminiAnalyzeErrorCode.RequestFailed,
      message: "Gemini could not analyze that song.",
    },
    songTitle: "Song Two",
    requestToken: 1,
    latestRequestToken: 1,
    active: true,
  });

  const completedState = resolveGeminiEqBatchCompletion({
    state: failedState,
    requestToken: 1,
    latestRequestToken: 1,
    active: true,
  });

  expectEqual(
    completedState.status,
    "Gemini EQ applied to 1 of 2 songs. 1 failed.",
  );
  expectEqual(completedState.messages.length, 2);
  expectEqual(
    completedState.messages[1],
    "Song Two: Gemini could not analyze that song.",
  );
});

test("gemini eq action is disabled only when no songs are selected", () => {
  expectEqual(isGeminiEqActionDisabled(0), true);
  expectEqual(isGeminiEqActionDisabled(1), false);
  expectEqual(isGeminiEqActionDisabled(2), false);
});
