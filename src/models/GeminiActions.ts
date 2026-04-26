import type AudioEqSettings from "./AudioEq";
import type AudioEqProfile from "./AudioEqProfile";
import type { GeminiAnalyzeFailure } from "./GeminiSettings";

type GeminiCapabilityName = "create-eq-profile";

type GeminiContextScope =
  | "eqBandContract"
  | "existingEqProfiles"
  | "currentSong";

type GeminiFunctionName = "createEqProfile";

type GeminiCapability = {
  name: GeminiCapabilityName;
  allowedContext: readonly GeminiContextScope[];
  allowedFunctions: readonly GeminiFunctionName[];
};

const CREATE_EQ_PROFILE_FUNCTION_NAME: GeminiFunctionName = "createEqProfile";

type GeminiSongContext = {
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

type GeminiCreateEqProfileFunctionCall = {
  functionName: GeminiFunctionName;
  arguments: {
    name: string;
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

type GeminiEqProfileSuggestionFailure = GeminiAnalyzeFailure;

type GeminiEqProfileResponse =
  | GeminiEqProfileSuccess
  | GeminiEqProfileSuggestionFailure;

const CREATE_EQ_PROFILE_CAPABILITY: GeminiCapability = {
  name: "create-eq-profile",
  allowedContext: ["eqBandContract", "existingEqProfiles", "currentSong"],
  allowedFunctions: [CREATE_EQ_PROFILE_FUNCTION_NAME],
};

export { CREATE_EQ_PROFILE_CAPABILITY };
export type {
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
};
