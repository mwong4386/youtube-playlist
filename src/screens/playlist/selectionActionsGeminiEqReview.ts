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
  suggestion: GeminiSongEqSuggestion | null;
  isLoading: boolean;
};

type GeminiEqSubmission = {
  state: GeminiEqReviewState;
  runtimeRequest: GeminiSongEqUserRequest | null;
  requestToken: number;
};

const SINGLE_SONG_MESSAGE = "Please select one song for Gemini EQ.";
const GENERATING_MESSAGE = "Generating suggestion...";
const REVIEW_MESSAGE = "Review the suggestion.";

const createInitialGeminiEqReviewState = (): GeminiEqReviewState => ({
  request: "",
  status: "",
  suggestion: null,
  isLoading: false,
});

const isGeminiEqActionDisabled = (selectedCount: number) => selectedCount !== 1;

const resetGeminiEqReviewState = (): GeminiEqReviewState =>
  createInitialGeminiEqReviewState();

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

  return {
    state: {
      ...state,
      request: trimmedRequest,
      status: GENERATING_MESSAGE,
      suggestion: null,
      isLoading: true,
    },
    runtimeRequest: {
      userRequest: trimmedRequest,
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
  state.suggestion;

export {
  GENERATING_MESSAGE,
  REVIEW_MESSAGE,
  SINGLE_SONG_MESSAGE,
  createGeminiEqSubmission,
  createInitialGeminiEqReviewState,
  getGeminiEqSuggestionToApply,
  isGeminiEqActionDisabled,
  resetGeminiEqReviewState,
  resolveGeminiEqSubmission,
};
export type { GeminiEqReviewState };
