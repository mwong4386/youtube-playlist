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

registerTool(getPlaylistInfoTool);
