import AudioEqSettings, {
  AUDIO_EQ_MAX,
  AUDIO_EQ_MIN,
  DEFAULT_AUDIO_EQ_SETTINGS,
} from "../models/AudioEq";

const AUDIO_EQ_BANDS = [
  { key: "clearBass", label: "Clear Bass", shortLabel: "Bass", frequency: 70 },
  { key: "band400", label: "400 Hz", shortLabel: "400", frequency: 400 },
  { key: "band1k", label: "1 kHz", shortLabel: "1k", frequency: 1000 },
  { key: "band2k5", label: "2.5 kHz", shortLabel: "2.5k", frequency: 2500 },
  { key: "band6k3", label: "6.3 kHz", shortLabel: "6.3k", frequency: 6300 },
  { key: "band16k", label: "16 kHz", shortLabel: "16k", frequency: 16000 },
] as const;

type AudioEqBandDefinition = (typeof AUDIO_EQ_BANDS)[number];

const clampAudioEqValue = (value: number) => {
  return Math.min(AUDIO_EQ_MAX, Math.max(AUDIO_EQ_MIN, Math.round(value)));
};

const LEGACY_PRESET_TO_EQ: Record<string, AudioEqSettings> = {
  flat: { ...DEFAULT_AUDIO_EQ_SETTINGS },
  bassBoost: {
    clearBass: 7,
    band400: 4,
    band1k: 1,
    band2k5: 0,
    band6k3: -1,
    band16k: -2,
  },
  trebleBoost: {
    clearBass: -2,
    band400: -1,
    band1k: 1,
    band2k5: 4,
    band6k3: 6,
    band16k: 7,
  },
};

const hasLegacyPreset = (
  value: Partial<AudioEqSettings> | { preset?: string } | null | undefined,
): value is { preset: string } => {
  return (
    !!value &&
    typeof value === "object" &&
    "preset" in value &&
    typeof value.preset === "string"
  );
};

const normalizeAudioEqSettings = (
  value?: Partial<AudioEqSettings> | { preset?: string } | null,
): AudioEqSettings => {
  if (hasLegacyPreset(value) && LEGACY_PRESET_TO_EQ[value.preset]) {
    return { ...LEGACY_PRESET_TO_EQ[value.preset] };
  }

  const settingsLikeValue = value as Partial<AudioEqSettings> | null | undefined;

  return AUDIO_EQ_BANDS.reduce((settings, band) => {
    const rawValue =
      settingsLikeValue && typeof settingsLikeValue === "object"
        ? settingsLikeValue[band.key]
        : undefined;
    settings[band.key] = Number.isFinite(rawValue)
      ? clampAudioEqValue(Number(rawValue))
      : DEFAULT_AUDIO_EQ_SETTINGS[band.key];
    return settings;
  }, {} as AudioEqSettings);
};

const cloneAudioEqSettings = (value?: Partial<AudioEqSettings> | null) => {
  return normalizeAudioEqSettings(value);
};

export {
  AUDIO_EQ_BANDS,
  AUDIO_EQ_MAX,
  AUDIO_EQ_MIN,
  DEFAULT_AUDIO_EQ_SETTINGS,
  cloneAudioEqSettings,
  clampAudioEqValue,
  normalizeAudioEqSettings,
};
export type { AudioEqBandDefinition };
