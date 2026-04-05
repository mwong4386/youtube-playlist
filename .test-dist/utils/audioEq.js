"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAudioEqSettings = exports.clampAudioEqValue = exports.cloneAudioEqSettings = exports.DEFAULT_AUDIO_EQ_SETTINGS = exports.AUDIO_EQ_MIN = exports.AUDIO_EQ_MAX = exports.AUDIO_EQ_BANDS = void 0;
const AudioEq_1 = require("../models/AudioEq");
Object.defineProperty(exports, "AUDIO_EQ_MAX", { enumerable: true, get: function () { return AudioEq_1.AUDIO_EQ_MAX; } });
Object.defineProperty(exports, "AUDIO_EQ_MIN", { enumerable: true, get: function () { return AudioEq_1.AUDIO_EQ_MIN; } });
Object.defineProperty(exports, "DEFAULT_AUDIO_EQ_SETTINGS", { enumerable: true, get: function () { return AudioEq_1.DEFAULT_AUDIO_EQ_SETTINGS; } });
const AUDIO_EQ_BANDS = [
    { key: "clearBass", label: "Clear Bass", shortLabel: "Bass", frequency: 70 },
    { key: "band400", label: "400 Hz", shortLabel: "400", frequency: 400 },
    { key: "band1k", label: "1 kHz", shortLabel: "1k", frequency: 1000 },
    { key: "band2k5", label: "2.5 kHz", shortLabel: "2.5k", frequency: 2500 },
    { key: "band6k3", label: "6.3 kHz", shortLabel: "6.3k", frequency: 6300 },
    { key: "band16k", label: "16 kHz", shortLabel: "16k", frequency: 16000 },
];
exports.AUDIO_EQ_BANDS = AUDIO_EQ_BANDS;
const clampAudioEqValue = (value) => {
    return Math.min(AudioEq_1.AUDIO_EQ_MAX, Math.max(AudioEq_1.AUDIO_EQ_MIN, Math.round(value)));
};
exports.clampAudioEqValue = clampAudioEqValue;
const LEGACY_PRESET_TO_EQ = {
    flat: { ...AudioEq_1.DEFAULT_AUDIO_EQ_SETTINGS },
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
const hasLegacyPreset = (value) => {
    return (!!value &&
        typeof value === "object" &&
        "preset" in value &&
        typeof value.preset === "string");
};
const normalizeAudioEqSettings = (value) => {
    if (hasLegacyPreset(value) && LEGACY_PRESET_TO_EQ[value.preset]) {
        return { ...LEGACY_PRESET_TO_EQ[value.preset] };
    }
    const settingsLikeValue = value;
    return AUDIO_EQ_BANDS.reduce((settings, band) => {
        const rawValue = settingsLikeValue && typeof settingsLikeValue === "object"
            ? settingsLikeValue[band.key]
            : undefined;
        settings[band.key] = Number.isFinite(rawValue)
            ? clampAudioEqValue(Number(rawValue))
            : AudioEq_1.DEFAULT_AUDIO_EQ_SETTINGS[band.key];
        return settings;
    }, {});
};
exports.normalizeAudioEqSettings = normalizeAudioEqSettings;
const cloneAudioEqSettings = (value) => {
    return normalizeAudioEqSettings(value);
};
exports.cloneAudioEqSettings = cloneAudioEqSettings;
