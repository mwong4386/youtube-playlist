import AudioEqSettings, {
  DEFAULT_AUDIO_EQ_SETTINGS,
  normalizeAudioEqSettings,
} from "../models/AudioEq";

const AUDIO_EQ_PRESET_LABELS: Record<AudioEqSettings["preset"], string> = {
  flat: "Flat",
  bassBoost: "Bass Boost",
  trebleBoost: "Treble Boost",
};

const getAudioEqPresetLabel = (preset: AudioEqSettings["preset"]) => {
  return AUDIO_EQ_PRESET_LABELS[preset];
};

export {
  AUDIO_EQ_PRESET_LABELS,
  DEFAULT_AUDIO_EQ_SETTINGS,
  getAudioEqPresetLabel,
  normalizeAudioEqSettings,
};
