"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const playlistImport_1 = require("./playlistImport");
const expectEqual = (actual, expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
    }
};
(0, node_test_1.default)("parseImportedPlaylist accepts a valid playlist and normalizes values", () => {
    const result = (0, playlistImport_1.parseImportedPlaylist)(JSON.stringify([
        {
            id: "abc",
            title: " Song ",
            channelName: " Channel ",
            url: " https://youtube.com/watch?v=123 ",
            videoId: "123",
            timestamp: 12.9,
            endTimestamp: 48.2,
            geminiSuggestedStartTimestamp: 13.6,
            geminiSuggestedEndTimestamp: 49.4,
            maxDuration: 60.7,
            volume: 104.4,
            audioEq: {
                clearBass: 9.9,
                band400: 3.6,
                band1k: 1.2,
                band2k5: 0,
                band6k3: -1.2,
                band16k: -2,
            },
        },
    ]));
    expectEqual(result.error, undefined);
    expectEqual(result.playlist, [
        {
            id: "abc",
            title: "Song",
            channelName: "Channel",
            url: "https://youtube.com/watch?v=123",
            videoId: "123",
            timestamp: 12,
            endTimestamp: 48,
            geminiSuggestedStartTimestamp: 13,
            geminiSuggestedEndTimestamp: 49,
            maxDuration: 60,
            volume: 100,
            audioEq: {
                clearBass: 10,
                band400: 4,
                band1k: 1,
                band2k5: 0,
                band6k3: -1,
                band16k: -2,
            },
        },
    ]);
});
(0, node_test_1.default)("parseImportedPlaylist fills in default eq settings for old playlists", () => {
    const result = (0, playlistImport_1.parseImportedPlaylist)(JSON.stringify([
        {
            id: "legacy",
            title: "Song",
            channelName: "Channel",
            url: "https://youtube.com/watch?v=123",
            videoId: "123",
            timestamp: 12,
            endTimestamp: 48,
            maxDuration: 60,
            volume: 40,
        },
    ]));
    expectEqual(result.error, undefined);
    expectEqual(result.playlist?.[0]?.audioEq, {
        clearBass: 0,
        band400: 0,
        band1k: 0,
        band2k5: 0,
        band6k3: 0,
        band16k: 0,
    });
});
(0, node_test_1.default)("parseImportedPlaylist migrates legacy eq presets", () => {
    const result = (0, playlistImport_1.parseImportedPlaylist)(JSON.stringify([
        {
            id: "legacy-preset",
            title: "Song",
            channelName: "Channel",
            url: "https://youtube.com/watch?v=123",
            videoId: "123",
            timestamp: 12,
            endTimestamp: 48,
            maxDuration: 60,
            volume: 40,
            audioEq: {
                preset: "trebleBoost",
            },
        },
    ]));
    expectEqual(result.error, undefined);
    expectEqual(result.playlist?.[0]?.audioEq, {
        clearBass: -2,
        band400: -1,
        band1k: 1,
        band2k5: 4,
        band6k3: 6,
        band16k: 7,
    });
});
(0, node_test_1.default)("parseImportedPlaylist rejects non-array JSON payloads", () => {
    const result = (0, playlistImport_1.parseImportedPlaylist)(JSON.stringify({
        id: "abc",
    }));
    expectEqual(result, {
        error: "The playlist file must contain a JSON array.",
    });
});
(0, node_test_1.default)("parseImportedPlaylist rejects items with invalid values", () => {
    const result = (0, playlistImport_1.parseImportedPlaylist)(JSON.stringify([
        {
            id: "abc",
            title: "Song",
            channelName: "Channel",
            url: "https://youtube.com/watch?v=123",
            videoId: "123",
            timestamp: 12,
            endTimestamp: 6,
            maxDuration: 60,
            volume: 50,
        },
    ]));
    expectEqual(result, {
        error: 'Item 1 has an invalid "endTimestamp" field: expected a value greater than timestamp',
    });
});
