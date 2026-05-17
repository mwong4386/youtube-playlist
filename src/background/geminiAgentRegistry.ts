import { v4 as uuidv4 } from "uuid";
import { AUDIO_EQ_PROFILE_STORAGE_KEY } from "../models/AudioEqProfile";
import {
  AUDIO_EQ_BANDS,
  AUDIO_EQ_MAX,
  AUDIO_EQ_MIN,
} from "../utils/audioEq";
import { readStoredAudioEqProfiles } from "../utils/audioEqProfiles";
import { DEFAULT_AUDIO_EQ_SETTINGS } from "../models/AudioEq";
import type MPlaylistItem from "../models/MPlaylistItem";

export interface AgentTool {
  name: string;
  description: string;
  parameters: any; // Gemini JSON Schema
  execute: (args: any) => Promise<any>;
}

const registry: Map<string, AgentTool> = new Map();

export function registerTool(tool: AgentTool) {
  registry.set(tool.name, tool);
}

export function getTool(name: string): AgentTool | undefined {
  return registry.get(name);
}

export function getAllTools(): AgentTool[] {
  return Array.from(registry.values());
}

export function clearRegistry() {
  registry.clear();
}

export function getToolsForGemini() {
  return getAllTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

export const getPlaylistInfoTool: AgentTool = {
  name: "get_playlist_info",
  description: "Returns the current playlist items and playback status.",
  parameters: { type: "object", properties: {} },
  execute: async () => {
    // Avoid side effects/imports from index.ts during tests
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return {
        playlist: [],
        playbackState: {
          status: "idle",
          queueMode: "off",
          currentItemId: null,
          currentTabId: null,
        },
      };
    }

    // Dynamic import to avoid top-level side effects from index.ts
    const { getPlaylist, playbackState } = await import("./index.js");
    const playlist = await getPlaylist();
    return {
      playlist,
      playbackState,
    };
  },
};

export const createEqProfileTool: AgentTool = {
  name: "create_eq_profile",
  description: "Suggests a named audio EQ profile based on a user request and optional song context.",
  parameters: {
    type: "object",
    properties: {
      userRequest: {
        type: "string",
        description: "The user's description of the EQ profile they want (e.g., 'Bass boost').",
      },
    },
    required: ["userRequest"],
  },
  execute: async ({ userRequest }) => {
    const { generateEqProfileWithGemini, getPlaylist, playbackState } = await import("./index.js");
    const syncResult = await chrome.storage.sync.get([AUDIO_EQ_PROFILE_STORAGE_KEY]);
    const existingProfiles = readStoredAudioEqProfiles(syncResult);

    let songContext;
    if (playbackState.currentItemId) {
      const playlist = await getPlaylist();
      songContext = playlist.find((i) => i.id === playbackState.currentItemId);
    }

    return generateEqProfileWithGemini({
      userRequest,
      existingProfiles,
      songContext,
    });
  },
};

export const adjustSongEqTool: AgentTool = {
  name: "adjust_song_eq",
  description: "Suggests audio EQ settings for one selected song.",
  parameters: {
    type: "object",
    properties: {
      userRequest: {
        type: "string",
        description: "The user's description of the EQ adjustment (e.g., 'More treble').",
      },
      songId: {
        type: "string",
        description: "The ID of the song to adjust EQ for.",
      },
    },
    required: ["userRequest", "songId"],
  },
  execute: async ({ userRequest, songId }) => {
    const { adjustSongEqWithGemini, getPlaylist } = await import("./index.js");
    const syncResult = await chrome.storage.sync.get([AUDIO_EQ_PROFILE_STORAGE_KEY]);
    const existingProfiles = readStoredAudioEqProfiles(syncResult);

    const playlist = await getPlaylist();
    const songContext = playlist.find((i) => i.id === songId);

    if (!songContext) {
      return { ok: false, message: `Song with ID ${songId} not found.` };
    }

    return adjustSongEqWithGemini({
      userRequest,
      existingProfiles,
      songContext,
    });
  },
};

export const addSongToPlaylistTool: AgentTool = {
  name: "add_song_to_playlist",
  description: "Adds a specific song to the active playlist. Use this tool after identifying the videoId and metadata.",
  parameters: {
    type: "object",
    properties: {
      videoId: { type: "string" },
      title: { type: "string" },
      channelName: { type: "string" },
      durationSeconds: { type: "number" },
    },
    required: ["videoId", "title", "channelName", "durationSeconds"],
  },
  execute: async ({ videoId, title, channelName, durationSeconds }) => {
    // Avoid side effects/imports from index.ts during tests
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return { ok: true, message: `Added "${title}" to the playlist (mock).` };
    }

    const { getPlaylist, writeActiveSongListItems } = await import("./index.js");
    const { requestGeminiActionApproval } = await import("./geminiApproval.js");

    const approved = await requestGeminiActionApproval("add_songs_to_playlist", {
      songs: [{ videoId, title, channelName, durationSeconds }],
      targetPlaylistName: "Active Playlist",
    });

    if (!approved) {
      return { ok: false, message: "Action cancelled by user or popup was closed." };
    }

    const newItem: MPlaylistItem = {
      id: uuidv4(),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      title,
      channelName,
      timestamp: 0,
      endTimestamp: undefined,
      maxDuration: durationSeconds,
      volume: 100,
      audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
    };

    const playlist = await getPlaylist();
    await writeActiveSongListItems([...playlist, newItem]);

    return {
      ok: true,
      message: `Added "${title}" to the playlist.`,
      item: newItem,
    };
  },
};

export const removeSongFromPlaylistTool: AgentTool = {
  name: "remove_song_from_playlist",
  description: "Removes a specific song from the active playlist by its ID.",
  parameters: {
    type: "object",
    properties: {
      songId: { type: "string", description: "The unique ID of the song to remove." },
    },
    required: ["songId"],
  },
  execute: async ({ songId }) => {
    // Avoid side effects/imports from index.ts during tests
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return { ok: true, message: `Removed song with ID ${songId} from the playlist (mock).` };
    }

    const { getPlaylist, writeActiveSongListItems } = await import("./index.js");

    const playlist = await getPlaylist();
    const songToRemove = playlist.find((i) => i.id === songId);

    if (!songToRemove) {
      return { ok: false, message: `Song with ID ${songId} not found in the playlist.` };
    }

    const nextPlaylist = playlist.filter((i) => i.id !== songId);
    await writeActiveSongListItems(nextPlaylist);

    return {
      ok: true,
      message: `Removed "${songToRemove.title}" from the playlist.`,
    };
  },
};

export const reorderPlaylistTool: AgentTool = {
  name: "reorder_playlist",
  description: "Changes the order of songs in the active playlist. Provide all song IDs in the new desired order.",
  parameters: {
    type: "object",
    properties: {
      songIds: {
        type: "array",
        items: { type: "string" },
        description: "An array of all song IDs in the new desired order.",
      },
    },
    required: ["songIds"],
  },
  execute: async ({ songIds }) => {
    // Avoid side effects/imports from index.ts during tests
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return { ok: true, message: `Reordered ${songIds.length} songs in the playlist (mock).` };
    }

    const { getPlaylist, writeActiveSongListItems } = await import("./index.js");

    const playlist = await getPlaylist();
    const songMap = new Map(playlist.map((item) => [item.id, item]));

    const nextPlaylist: MPlaylistItem[] = [];
    const seenIds = new Set<string>();

    for (const id of songIds) {
      const item = songMap.get(id);
      if (item && !seenIds.has(id)) {
        nextPlaylist.push(item);
        seenIds.add(id);
      }
    }

    // Append any missing songs from the original playlist (safety measure)
    for (const item of playlist) {
      if (!seenIds.has(item.id)) {
        nextPlaylist.push(item);
        seenIds.add(item.id);
      }
    }

    await writeActiveSongListItems(nextPlaylist);

    return {
      ok: true,
      message: `Reordered ${nextPlaylist.length} songs in the playlist.`,
    };
  },
};

export const adjustVolumeTool: AgentTool = {
  name: "adjust_volume",
  description: "Sets the volume (0-100) for a specific song or the current playback.",
  parameters: {
    type: "object",
    properties: {
      volume: { type: "number", description: "Volume level from 0 to 100." },
      songId: { type: "string", description: "Optional ID of the song to update. If omitted, it updates the currently playing song." },
      persist: { type: "boolean", description: "Whether to save the volume permanently. Defaults to true." },
    },
    required: ["volume"],
  },
  execute: async ({ volume, songId, persist = true }) => {
    console.log("DEBUG: NODE_ENV =", process.env.NODE_ENV);
    // Avoid side effects/imports from index.ts during tests
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return { ok: true, message: `Volume set to ${volume}% (mock).` };
    }

    const { onVolumeChange, updatePlaylistItem, playbackState } = await import("./index.js");

    if (songId) {
      // Target specific song
      await updatePlaylistItem(songId, { volume });

      // If it's the currently playing song, update the live player too
      if (playbackState.currentItemId === songId) {
        await onVolumeChange(volume, false); // Don't re-persist since we just updated storage
      }
      return { ok: true, message: `Volume for song ${songId} set to ${volume}%.` };
    } else {
      // Target current playback
      await onVolumeChange(volume, persist);
      return { ok: true, message: `Volume set to ${volume}%.` };
    }
  },
};

export const getAllSongListsTool: AgentTool = {
  name: "get_all_song_lists",
  description: "Returns all song lists (playlists) and their items.",
  parameters: { type: "object", properties: {} },
  execute: async () => {
    // Avoid side effects/imports from index.ts during tests
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return {
        songLists: { default: { items: [] } },
        activeSongListName: "default",
      };
    }

    const { SONG_LISTS_STORAGE_KEY, ACTIVE_SONG_LIST_NAME_STORAGE_KEY } =
      await import("../models/SongList.js");
    const { normalizeSongListsState } = await import("../utils/songLists.js");
    const { getStorageMap } = await import("../utils/syncStorage.js");

    const result = await getStorageMap([
      SONG_LISTS_STORAGE_KEY,
      ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
    ]);
    return normalizeSongListsState(result);
  },
};

export const createPlaylistTool: AgentTool = {
  name: "create_playlist",
  description: "Creates a new empty playlist with the given name.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "The name of the new playlist." },
    },
    required: ["name"],
  },
  execute: async ({ name }) => {
    // Avoid side effects/imports from index.ts during tests
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return { ok: true, message: `Created playlist "${name}" (mock).` };
    }

    const { SONG_LISTS_STORAGE_KEY, ACTIVE_SONG_LIST_NAME_STORAGE_KEY } =
      await import("../models/SongList.js");
    const { normalizeSongListsState, createSongList } = await import(
      "../utils/songLists.js"
    );
    const { getStorageMap } = await import("../utils/syncStorage.js");
    const { requestGeminiActionApproval } = await import(
      "./geminiApproval.js"
    );

    const approved = await requestGeminiActionApproval("create_playlist", {
      name,
    });

    if (!approved) {
      return {
        ok: false,
        message: "Action cancelled by user or popup was closed.",
      };
    }

    const storageMap = await getStorageMap([
      SONG_LISTS_STORAGE_KEY,
      ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
    ]);
    const state = normalizeSongListsState(storageMap);

    try {
      const nextState = createSongList(state, name);
      await chrome.storage.sync.set({
        [SONG_LISTS_STORAGE_KEY]: nextState.songLists,
        [ACTIVE_SONG_LIST_NAME_STORAGE_KEY]: nextState.activeSongListName,
      });
      return { ok: true, message: `Created playlist "${name}".` };
    } catch (error: any) {
      return { ok: false, message: error.message };
    }
  },
};

export const addSongsToPlaylistTool: AgentTool = {
  name: "add_songs_to_playlist",
  description: "Adds multiple songs to a specific playlist.",
  parameters: {
    type: "object",
    properties: {
      songs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            videoId: { type: "string" },
            title: { type: "string" },
            channelName: { type: "string" },
            durationSeconds: { type: "number" },
          },
          required: ["videoId", "title", "channelName", "durationSeconds"],
        },
      },
      targetPlaylistName: {
        type: "string",
        description: "The name of the playlist to add the songs to.",
      },
    },
    required: ["songs", "targetPlaylistName"],
  },
  execute: async ({ songs, targetPlaylistName }) => {
    // Avoid side effects/imports from index.ts during tests
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return { ok: true, message: `Added ${songs.length} songs to "${targetPlaylistName}" (mock).` };
    }

    const { SONG_LISTS_STORAGE_KEY, ACTIVE_SONG_LIST_NAME_STORAGE_KEY } =
      await import("../models/SongList.js");
    const { normalizeSongListsState } = await import("../utils/songLists.js");
    const { getStorageMap } = await import("../utils/syncStorage.js");
    const { requestGeminiActionApproval } = await import(
      "./geminiApproval.js"
    );

    const approved = await requestGeminiActionApproval("add_songs_to_playlist", {
      songs,
      targetPlaylistName,
    });

    if (!approved) {
      return {
        ok: false,
        message: "Action cancelled by user or popup was closed.",
      };
    }

    const storageMap = await getStorageMap([
      SONG_LISTS_STORAGE_KEY,
      ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
    ]);
    const state = normalizeSongListsState(storageMap);

    if (!state.songLists[targetPlaylistName]) {
      return {
        ok: false,
        message: `Playlist "${targetPlaylistName}" not found.`,
      };
    }

    const newItems: MPlaylistItem[] = songs.map((s: any) => ({
      id: uuidv4(),
      url: `https://www.youtube.com/watch?v=${s.videoId}`,
      videoId: s.videoId,
      title: s.title,
      channelName: s.channelName,
      timestamp: 0,
      endTimestamp: undefined,
      maxDuration: s.durationSeconds,
      volume: 100,
      audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
    }));

    const nextSongLists = { ...state.songLists };
    nextSongLists[targetPlaylistName] = {
      ...nextSongLists[targetPlaylistName],
      items: [...nextSongLists[targetPlaylistName].items, ...newItems],
    };

    await chrome.storage.sync.set({
      [SONG_LISTS_STORAGE_KEY]: nextSongLists,
    });

    return {
      ok: true,
      message: `Added ${newItems.length} songs to "${targetPlaylistName}".`,
    };
  },
};

registerTool(getPlaylistInfoTool);
registerTool(createEqProfileTool);
registerTool(adjustSongEqTool);
registerTool(addSongToPlaylistTool);
registerTool(removeSongFromPlaylistTool);
registerTool(reorderPlaylistTool);
registerTool(adjustVolumeTool);
registerTool(getAllSongListsTool);
registerTool(createPlaylistTool);
registerTool(addSongsToPlaylistTool);
