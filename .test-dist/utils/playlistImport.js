"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseImportedPlaylist = void 0;
const audioEq_1 = require("./audioEq");
const isRecord = (value) => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};
const isNonEmptyString = (value) => {
    return typeof value === "string" && value.trim().length > 0;
};
const isFiniteNumber = (value) => {
    return typeof value === "number" && Number.isFinite(value);
};
const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
const getItemError = (index, key, message) => {
    return `Item ${index + 1} has an invalid "${key}" field: ${message}`;
};
const parsePlaylistItem = (value, index, usedIds) => {
    if (!isRecord(value)) {
        return {
            error: `Item ${index + 1} must be a JSON object.`,
        };
    }
    const { id, title, channelName, url, videoId, timestamp, endTimestamp, geminiSuggestedStartTimestamp, geminiSuggestedEndTimestamp, maxDuration, volume, audioEq, } = value;
    if (!isNonEmptyString(title)) {
        return {
            error: getItemError(index, "title", "expected a non-empty string"),
        };
    }
    if (!isNonEmptyString(channelName)) {
        return {
            error: getItemError(index, "channelName", "expected a non-empty string"),
        };
    }
    if (!isNonEmptyString(url)) {
        return {
            error: getItemError(index, "url", "expected a non-empty string"),
        };
    }
    if (!isNonEmptyString(videoId)) {
        return {
            error: getItemError(index, "videoId", "expected a non-empty string"),
        };
    }
    if (!isFiniteNumber(timestamp)) {
        return {
            error: getItemError(index, "timestamp", "expected a finite number"),
        };
    }
    if (!isFiniteNumber(maxDuration)) {
        return {
            error: getItemError(index, "maxDuration", "expected a finite number"),
        };
    }
    if (!isFiniteNumber(volume)) {
        return {
            error: getItemError(index, "volume", "expected a finite number"),
        };
    }
    if (timestamp < 0 || maxDuration < 0) {
        return {
            error: getItemError(index, timestamp < 0 ? "timestamp" : "maxDuration", "expected a non-negative number"),
        };
    }
    if (endTimestamp !== undefined &&
        !isFiniteNumber(endTimestamp)) {
        return {
            error: getItemError(index, "endTimestamp", "expected a finite number"),
        };
    }
    if (isFiniteNumber(endTimestamp) && endTimestamp < 0) {
        return {
            error: getItemError(index, "endTimestamp", "expected a non-negative number"),
        };
    }
    if (isFiniteNumber(endTimestamp) && endTimestamp <= timestamp) {
        return {
            error: getItemError(index, "endTimestamp", "expected a value greater than timestamp"),
        };
    }
    if (geminiSuggestedStartTimestamp !== undefined &&
        !isFiniteNumber(geminiSuggestedStartTimestamp)) {
        return {
            error: getItemError(index, "geminiSuggestedStartTimestamp", "expected a finite number"),
        };
    }
    if (geminiSuggestedEndTimestamp !== undefined &&
        !isFiniteNumber(geminiSuggestedEndTimestamp)) {
        return {
            error: getItemError(index, "geminiSuggestedEndTimestamp", "expected a finite number"),
        };
    }
    if (isFiniteNumber(geminiSuggestedStartTimestamp) &&
        geminiSuggestedStartTimestamp < 0) {
        return {
            error: getItemError(index, "geminiSuggestedStartTimestamp", "expected a non-negative number"),
        };
    }
    if (isFiniteNumber(geminiSuggestedEndTimestamp) &&
        geminiSuggestedEndTimestamp < 0) {
        return {
            error: getItemError(index, "geminiSuggestedEndTimestamp", "expected a non-negative number"),
        };
    }
    const normalizedId = isNonEmptyString(id) && !usedIds.has(id) ? id : `${videoId}-${index}`;
    usedIds.add(normalizedId);
    return {
        item: {
            id: normalizedId,
            title: title.trim(),
            channelName: channelName.trim(),
            url: url.trim(),
            videoId: videoId.trim(),
            timestamp: Math.floor(timestamp),
            endTimestamp: endTimestamp === undefined
                ? undefined
                : Math.min(Math.floor(endTimestamp), Math.floor(maxDuration)),
            geminiSuggestedStartTimestamp: geminiSuggestedStartTimestamp === undefined
                ? undefined
                : Math.min(Math.floor(geminiSuggestedStartTimestamp), Math.floor(maxDuration)),
            geminiSuggestedEndTimestamp: geminiSuggestedEndTimestamp === undefined
                ? undefined
                : Math.min(Math.floor(geminiSuggestedEndTimestamp), Math.floor(maxDuration)),
            maxDuration: Math.floor(maxDuration),
            volume: clamp(Math.round(volume), 0, 100),
            audioEq: (0, audioEq_1.normalizeAudioEqSettings)(isRecord(audioEq) ? audioEq : audioEq_1.DEFAULT_AUDIO_EQ_SETTINGS),
        },
    };
};
const parseImportedPlaylist = (content) => {
    let parsed;
    try {
        parsed = JSON.parse(content);
    }
    catch (error) {
        return { error: "The selected file is not valid JSON." };
    }
    if (!Array.isArray(parsed)) {
        return { error: "The playlist file must contain a JSON array." };
    }
    if (parsed.length === 0) {
        return { error: "The playlist file is empty." };
    }
    const usedIds = new Set();
    const playlist = [];
    for (let index = 0; index < parsed.length; index++) {
        const result = parsePlaylistItem(parsed[index], index, usedIds);
        if (result.error) {
            return { error: result.error };
        }
        if (result.item) {
            playlist.push(result.item);
        }
    }
    return { playlist };
};
exports.parseImportedPlaylist = parseImportedPlaylist;
