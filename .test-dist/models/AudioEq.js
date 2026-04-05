"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAudioEqSettings = exports.DEFAULT_AUDIO_EQ_SETTINGS = void 0;
const DEFAULT_AUDIO_EQ_SETTINGS = {
    preset: "flat",
};
exports.DEFAULT_AUDIO_EQ_SETTINGS = DEFAULT_AUDIO_EQ_SETTINGS;
const normalizeAudioEqSettings = (value) => {
    if (value?.preset === "bassBoost" ||
        value?.preset === "trebleBoost" ||
        value?.preset === "flat") {
        return {
            preset: value.preset,
        };
    }
    return { ...DEFAULT_AUDIO_EQ_SETTINGS };
};
exports.normalizeAudioEqSettings = normalizeAudioEqSettings;
