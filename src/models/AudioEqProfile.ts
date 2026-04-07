import AudioEqSettings from "./AudioEq";

interface AudioEqProfile {
  id: string;
  name: string;
  audioEq: AudioEqSettings;
}

const AUDIO_EQ_PROFILE_STORAGE_KEY = "audio_eq_profiles";
const AUDIO_EQ_PROFILE_LIMIT = 10;

export default AudioEqProfile;
export { AUDIO_EQ_PROFILE_LIMIT, AUDIO_EQ_PROFILE_STORAGE_KEY };
