import type AudioEqProfile from "../../models/AudioEqProfile";
import type {
  GeminiSongEqResponse,
  GeminiSongEqSuggestion,
  GeminiSongEqUserRequest,
} from "../../models/GeminiActions";
import type MPlaylistItem from "../../models/MPlaylistItem";

type GeminiEqReviewState = {
  request: string;
  status: string;
  isLoading: boolean;
  suggestion?: GeminiSongEqSuggestion | null;
  totalCount: number;
  successCount: number;
  failCount: number;
  messages: string[];
};

type GeminiEqBatchSubmission = {
  state: GeminiEqReviewState;
  runtimeRequests: GeminiSongEqUserRequest[];
  requestToken: number;
};

type GeminiEqSubmission = {
  state: GeminiEqReviewState;
  runtimeRequest: GeminiSongEqUserRequest | null;
  requestToken: number;
};

const NO_SONG_MESSAGE = "Please select at least one song for Gemini EQ.";
const SINGLE_SONG_MESSAGE = "Please select one song for Gemini EQ.";
const GENERATING_MESSAGE = "Generating suggestion...";
const REVIEW_MESSAGE = "Review the suggestion.";
const DEFAULT_GEMINI_SONG_EQ_REQUEST =
  "No specific EQ preference. Infer a tasteful EQ from the song content.";

const normalizeGeminiSongEqRequest = (request: string) =>
  request.trim() || DEFAULT_GEMINI_SONG_EQ_REQUEST;

const createInitialGeminiEqReviewState = (): GeminiEqReviewState => ({
  request: "",
  status: "",
  isLoading: false,
  suggestion: null,
  totalCount: 0,
  successCount: 0,
  failCount: 0,
  messages: [],
});

const isGeminiEqActionDisabled = (selectedCount: number) => selectedCount === 0;

const resetGeminiEqReviewState = (): GeminiEqReviewState =>
  createInitialGeminiEqReviewState();

const createGeminiEqBatchSubmission = ({
  state,
  selectedSongs,
  audioEqProfiles,
  requestToken,
}: {
  state: GeminiEqReviewState;
  selectedSongs: MPlaylistItem[];
  audioEqProfiles: AudioEqProfile[];
  requestToken: number;
}): GeminiEqBatchSubmission => {
  if (selectedSongs.length === 0) {
    return {
      state: {
        ...state,
        status: NO_SONG_MESSAGE,
        isLoading: false,
        suggestion: null,
        totalCount: 0,
        successCount: 0,
        failCount: 0,
        messages: [],
      },
      runtimeRequests: [],
      requestToken,
    };
  }

  const trimmedRequest = state.request.trim();
  const runtimeRequest = normalizeGeminiSongEqRequest(trimmedRequest);

  return {
    state: {
      ...state,
      request: trimmedRequest,
      status: `Generating EQ for ${selectedSongs.length} ${
        selectedSongs.length === 1 ? "song" : "songs"
      }...`,
      isLoading: true,
      suggestion: null,
      totalCount: selectedSongs.length,
      successCount: 0,
      failCount: 0,
      messages: [],
    },
    runtimeRequests: selectedSongs.map((selectedSong) => ({
      userRequest: runtimeRequest,
      existingProfiles: audioEqProfiles,
      songContext: {
        id: selectedSong.id,
        title: selectedSong.title,
        channelName: selectedSong.channelName,
        videoId: selectedSong.videoId,
        url: selectedSong.url,
        audioEq: selectedSong.audioEq,
      },
    })),
    requestToken,
  };
};

const createGeminiEqSubmission = ({
  state,
  selectedCount,
  selectedSong,
  audioEqProfiles,
  requestToken,
}: {
  state: GeminiEqReviewState;
  selectedCount: number;
  selectedSong?: MPlaylistItem;
  audioEqProfiles: AudioEqProfile[];
  requestToken: number;
}): GeminiEqSubmission => {
  if (selectedCount !== 1 || !selectedSong) {
    return {
      state: {
        ...state,
        status: SINGLE_SONG_MESSAGE,
        suggestion: null,
        isLoading: false,
      },
      runtimeRequest: null,
      requestToken,
    };
  }

  const trimmedRequest = state.request.trim();
  const runtimeRequest = normalizeGeminiSongEqRequest(trimmedRequest);

  return {
    state: {
      ...state,
      request: trimmedRequest,
      status: GENERATING_MESSAGE,
      suggestion: null,
      isLoading: true,
    },
    runtimeRequest: {
      userRequest: runtimeRequest,
      existingProfiles: audioEqProfiles,
      songContext: {
        id: selectedSong.id,
        title: selectedSong.title,
        channelName: selectedSong.channelName,
        videoId: selectedSong.videoId,
        url: selectedSong.url,
        audioEq: selectedSong.audioEq,
      },
    },
    requestToken,
  };
};

const shouldIgnoreGeminiEqBatchUpdate = ({
  active,
  requestToken,
  latestRequestToken,
}: {
  active: boolean;
  requestToken: number;
  latestRequestToken: number;
}) => !active || requestToken !== latestRequestToken;

const resolveGeminiEqBatchProgress = ({
  state,
  result,
  songTitle,
  requestToken,
  latestRequestToken,
  active,
}: {
  state: GeminiEqReviewState;
  result: GeminiSongEqResponse;
  songTitle: string;
  requestToken: number;
  latestRequestToken: number;
  active: boolean;
}): GeminiEqReviewState => {
  if (
    shouldIgnoreGeminiEqBatchUpdate({
      active,
      requestToken,
      latestRequestToken,
    })
  ) {
    return state;
  }

  const nextSuccessCount = state.successCount + (result.ok ? 1 : 0);
  const nextFailCount = state.failCount + (result.ok ? 0 : 1);
  const completedCount = nextSuccessCount + nextFailCount;
  const resultMessage = result.ok
    ? `${songTitle}: EQ applied.`
    : `${songTitle}: ${result.message}`;

  return {
    ...state,
    successCount: nextSuccessCount,
    failCount: nextFailCount,
    status: `Processed ${completedCount} of ${state.totalCount} ${
      state.totalCount === 1 ? "song" : "songs"
    }...`,
    messages: [...state.messages, resultMessage],
  };
};

const resolveGeminiEqBatchCompletion = ({
  state,
  requestToken,
  latestRequestToken,
  active,
}: {
  state: GeminiEqReviewState;
  requestToken: number;
  latestRequestToken: number;
  active: boolean;
}): GeminiEqReviewState => {
  if (
    shouldIgnoreGeminiEqBatchUpdate({
      active,
      requestToken,
      latestRequestToken,
    })
  ) {
    return state;
  }

  return {
    ...state,
    isLoading: false,
    status: `Gemini EQ applied to ${state.successCount} of ${
      state.totalCount
    } ${state.totalCount === 1 ? "song" : "songs"}.${
      state.failCount > 0 ? ` ${state.failCount} failed.` : ""
    }`,
  };
};

const resolveGeminiEqSubmission = ({
  state,
  response,
  responseToken,
  latestRequestToken,
  active,
}: {
  state: GeminiEqReviewState;
  response: GeminiSongEqResponse;
  responseToken: number;
  latestRequestToken: number;
  active: boolean;
}): GeminiEqReviewState => {
  if (!active || responseToken !== latestRequestToken) {
    return state;
  }

  if (!response.ok) {
    return {
      ...state,
      status: response.message,
      isLoading: false,
    };
  }

  return {
    ...state,
    status: response.suggestion.reason || REVIEW_MESSAGE,
    suggestion: response.suggestion,
    isLoading: false,
  };
};

const getGeminiEqSuggestionToApply = (state: GeminiEqReviewState) =>
  state.suggestion || null;

export {
  DEFAULT_GEMINI_SONG_EQ_REQUEST,
  GENERATING_MESSAGE,
  NO_SONG_MESSAGE,
  REVIEW_MESSAGE,
  SINGLE_SONG_MESSAGE,
  createGeminiEqBatchSubmission,
  createGeminiEqSubmission,
  createInitialGeminiEqReviewState,
  getGeminiEqSuggestionToApply,
  isGeminiEqActionDisabled,
  resetGeminiEqReviewState,
  resolveGeminiEqBatchCompletion,
  resolveGeminiEqBatchProgress,
  resolveGeminiEqSubmission,
};
export type { GeminiEqBatchSubmission, GeminiEqReviewState, GeminiEqSubmission };
