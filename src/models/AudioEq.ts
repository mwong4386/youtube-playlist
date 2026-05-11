type AudioEqBandKey =
  | "clearBass"
  | "band400"
  | "band1k"
  | "band2k5"
  | "band6k3"
  | "band16k";

type AudioEqSettings = Record<AudioEqBandKey, number>;

const AUDIO_EQ_MIN = -15;
const AUDIO_EQ_MAX = 15;

const DEFAULT_AUDIO_EQ_SETTINGS: AudioEqSettings = {
  clearBass: 0,
  band400: 0,
  band1k: 0,
  band2k5: 0,
  band6k3: 0,
  band16k: 0,
};

export default AudioEqSettings;
export { AUDIO_EQ_MAX, AUDIO_EQ_MIN, DEFAULT_AUDIO_EQ_SETTINGS };
export type { AudioEqBandKey };
