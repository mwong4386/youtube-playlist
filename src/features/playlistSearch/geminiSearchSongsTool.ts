import type { AgentTool } from "../../background/geminiAgentRegistry";
import {
  ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
  SONG_LISTS_STORAGE_KEY,
} from "../../models/SongList";
import { normalizeSongListsState } from "../../utils/songLists";
import { getStorageMap } from "../../utils/syncStorage";
import { searchSongs } from "./searchSongs";

const searchSongsTool: AgentTool = {
  name: "search_songs",
  description:
    "Searches saved songs by title or channel name in the active playlist, a named playlist, or all playlists.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Optional search text to match against saved song titles and channel names.",
      },
      playlistName: {
        type: "string",
        description:
          "Optional exact playlist name to search. If omitted, searches the active playlist.",
      },
      includeAllPlaylists: {
        type: "boolean",
        description:
          "When true, searches every playlist and ignores playlistName.",
      },
      limit: {
        type: "number",
        description: "Optional maximum result count. Defaults to 10 and caps at 50.",
      },
    },
  },
  execute: async ({ query, playlistName, includeAllPlaylists, limit }) => {
    if (typeof chrome === "undefined") {
      return searchSongs(
        { songLists: { default: { items: [] } }, activeSongListName: "default" },
        { query, playlistName, includeAllPlaylists, limit },
      );
    }

    const storageMap = await getStorageMap([
      SONG_LISTS_STORAGE_KEY,
      ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
    ]);
    const state = normalizeSongListsState(storageMap);

    return searchSongs(state, {
      query,
      playlistName,
      includeAllPlaylists,
      limit,
    });
  },
};

export { searchSongsTool };
