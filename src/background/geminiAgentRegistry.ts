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

registerTool(getPlaylistInfoTool);
registerTool(createEqProfileTool);
registerTool(adjustSongEqTool);
registerTool(addSongToPlaylistTool);
registerTool(removeSongFromPlaylistTool);
registerTool(reorderPlaylistTool);
