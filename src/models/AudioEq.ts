type AudioEqPreset = "flat" | "bassBoost" | "trebleBoost";

interface AudioEqSettings {
  preset: AudioEqPreset;
}

const DEFAULT_AUDIO_EQ_SETTINGS: AudioEqSettings = {
  preset: "flat",
};

const normalizeAudioEqSettings = (
  value?: Partial<AudioEqSettings> | null,
): AudioEqSettings => {
  if (
    value?.preset === "bassBoost" ||
    value?.preset === "trebleBoost" ||
    value?.preset === "flat"
  ) {
    return {
      preset: value.preset,
    };
  }

  return { ...DEFAULT_AUDIO_EQ_SETTINGS };
};

export default AudioEqSettings;
export { DEFAULT_AUDIO_EQ_SETTINGS, normalizeAudioEqSettings };
export type { AudioEqPreset };
