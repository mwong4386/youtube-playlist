import type AudioEqSettings from "./AudioEq";
import type AudioEqProfile from "./AudioEqProfile";
import type { GeminiAnalyzeFailure } from "./GeminiSettings";

type GeminiCapabilityName = "create-eq-profile" | "adjust-song-eq";

type GeminiContextScope =
  | "eqBandContract"
  | "existingEqProfiles"
  | "currentSong";

type GeminiFunctionName = "createEqProfile" | "adjustSongEq";

type GeminiCapability = {
  name: GeminiCapabilityName;
  allowedContext: readonly GeminiContextScope[];
  allowedFunctions: readonly GeminiFunctionName[];
};

const CREATE_EQ_PROFILE_FUNCTION_NAME: GeminiFunctionName = "createEqProfile";
const ADJUST_SONG_EQ_FUNCTION_NAME: GeminiFunctionName = "adjustSongEq";

type GeminiSongContext = {
  id: string;
  title: string;
  channelName: string;
  videoId: string;
  url: string;
  audioEq: AudioEqSettings;
};

type GeminiEqProfileUserRequest = {
  userRequest: string;
  existingProfiles: AudioEqProfile[];
  songContext?: GeminiSongContext;
};

type GeminiSongEqUserRequest = {
  userRequest: string;
  existingProfiles: AudioEqProfile[];
  songContext: GeminiSongContext;
};

type GeminiCreateEqProfileFunctionCall = {
  functionName: GeminiFunctionName;
  arguments: {
    name: string;
    audioEq: AudioEqSettings;
    reason?: string;
  };
};

type GeminiAdjustSongEqFunctionCall = {
  functionName: GeminiFunctionName;
  arguments: {
    songId: string;
    audioEq: AudioEqSettings;
    reason?: string;
  };
};

type GeminiEqProfileSuggestion = {
  name: string;
  audioEq: AudioEqSettings;
  reason: string;
};

type GeminiEqProfileSuccess = {
  ok: true;
  suggestion: GeminiEqProfileSuggestion;
};

type GeminiSongEqSuggestion = {
  songId: string;
  audioEq: AudioEqSettings;
  reason: string;
};

type GeminiSongEqSuccess = {
  ok: true;
  suggestion: GeminiSongEqSuggestion;
};

type GeminiEqProfileSuggestionFailure = GeminiAnalyzeFailure;
type GeminiSongEqSuggestionFailure = GeminiAnalyzeFailure;

type GeminiEqProfileResponse =
  | GeminiEqProfileSuccess
  | GeminiEqProfileSuggestionFailure;

type GeminiSongEqResponse = GeminiSongEqSuccess | GeminiSongEqSuggestionFailure;

const CREATE_EQ_PROFILE_CAPABILITY: GeminiCapability = {
  name: "create-eq-profile",
  allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
  allowedFunctions: [CREATE_EQ_PROFILE_FUNCTION_NAME],
};

const ADJUST_SONG_EQ_CAPABILITY: GeminiCapability = {
  name: "adjust-song-eq",
  allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
  allowedFunctions: [ADJUST_SONG_EQ_FUNCTION_NAME],
};

export { ADJUST_SONG_EQ_CAPABILITY, CREATE_EQ_PROFILE_CAPABILITY };
export type {
  GeminiAdjustSongEqFunctionCall,
  GeminiCapability,
  GeminiCapabilityName,
  GeminiContextScope,
  GeminiCreateEqProfileFunctionCall,
  GeminiEqProfileResponse,
  GeminiEqProfileSuggestion,
  GeminiEqProfileSuggestionFailure,
  GeminiEqProfileSuccess,
  GeminiEqProfileUserRequest,
  GeminiFunctionName,
  GeminiSongContext,
  GeminiSongEqResponse,
  GeminiSongEqSuggestion,
  GeminiSongEqSuggestionFailure,
  GeminiSongEqSuccess,
  GeminiSongEqUserRequest,
};
