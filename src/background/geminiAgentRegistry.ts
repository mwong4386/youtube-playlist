import { AUDIO_EQ_PROFILE_STORAGE_KEY } from "../models/AudioEqProfile";
import {
  AUDIO_EQ_BANDS,
  AUDIO_EQ_MAX,
  AUDIO_EQ_MIN,
} from "../utils/audioEq";
import { readStoredAudioEqProfiles } from "../utils/audioEqProfiles";

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

registerTool(getPlaylistInfoTool);
registerTool(createEqProfileTool);
registerTool(adjustSongEqTool);
