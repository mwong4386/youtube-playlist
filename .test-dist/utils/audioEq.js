"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAudioEqSettings = exports.getAudioEqPresetLabel = exports.DEFAULT_AUDIO_EQ_SETTINGS = exports.AUDIO_EQ_PRESET_LABELS = void 0;
const AudioEq_1 = require("../models/AudioEq");
Object.defineProperty(exports, "DEFAULT_AUDIO_EQ_SETTINGS", { enumerable: true, get: function () { return AudioEq_1.DEFAULT_AUDIO_EQ_SETTINGS; } });
Object.defineProperty(exports, "normalizeAudioEqSettings", { enumerable: true, get: function () { return AudioEq_1.normalizeAudioEqSettings; } });
const AUDIO_EQ_PRESET_LABELS = {
    flat: "Flat",
    bassBoost: "Bass Boost",
    trebleBoost: "Treble Boost",
};
exports.AUDIO_EQ_PRESET_LABELS = AUDIO_EQ_PRESET_LABELS;
const getAudioEqPresetLabel = (preset) => {
    return AUDIO_EQ_PRESET_LABELS[preset];
};
exports.getAudioEqPresetLabel = getAudioEqPresetLabel;
