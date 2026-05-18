import type MPlaylistItem from "../../models/MPlaylistItem";
import type { SongListRecord } from "../../models/SongList";

const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;

type PlaylistSearchState = {
  songLists: Record<string, Pick<SongListRecord, "items">>;
  activeSongListName: string;
};

type SearchSongsOptions = {
  query?: string;
  playlistName?: string;
  includeAllPlaylists?: boolean;
  limit?: number;
};

type SearchSongsResultItem = {
  songId: string;
  playlistName: string;
  title: string;
  channelName: string;
  videoId: string;
  url: string;
  timestamp: number;
  endTimestamp?: number;
  maxDuration: number;
  volume: number;
};

type SearchSongsSuccess = {
  ok: true;
  query: string;
  scope:
    | { type: "active"; playlistName: string }
    | { type: "playlist"; playlistName: string }
    | { type: "all" };
  totalMatches: number;
  results: SearchSongsResultItem[];
};

type SearchSongsFailure = {
  ok: false;
  message: string;
};

type SearchSongsResponse = SearchSongsSuccess | SearchSongsFailure;

const normalizeLimit = (limit: unknown) => {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.floor(limit)));
};

const matchesSong = (item: MPlaylistItem, normalizedQuery: string) => {
  if (!normalizedQuery) {
    return true;
  }

  return (
    item.title.toLocaleLowerCase().includes(normalizedQuery) ||
    item.channelName.toLocaleLowerCase().includes(normalizedQuery)
  );
};

const toResultItem = (
  item: MPlaylistItem,
  playlistName: string,
): SearchSongsResultItem => ({
  songId: item.id,
  playlistName,
  title: item.title,
  channelName: item.channelName,
  videoId: item.videoId,
  url: item.url,
  timestamp: item.timestamp,
  endTimestamp: item.endTimestamp,
  maxDuration: item.maxDuration,
  volume: item.volume,
});

const getScopedPlaylists = (
  state: PlaylistSearchState,
  options: SearchSongsOptions,
):
  | {
      ok: true;
      scope: SearchSongsSuccess["scope"];
      playlists: Array<{ playlistName: string; items: MPlaylistItem[] }>;
    }
  | SearchSongsFailure => {
  if (options.includeAllPlaylists) {
    return {
      ok: true,
      scope: { type: "all" },
      playlists: Object.entries(state.songLists).map(([playlistName, list]) => ({
        playlistName,
        items: list.items,
      })),
    };
  }

  const playlistName = options.playlistName?.trim() || state.activeSongListName;
  const playlist = state.songLists[playlistName];

  if (!playlist) {
    return {
      ok: false,
      message: `Playlist "${playlistName}" not found.`,
    };
  }

  return {
    ok: true,
    scope: options.playlistName?.trim()
      ? { type: "playlist", playlistName }
      : { type: "active", playlistName },
    playlists: [{ playlistName, items: playlist.items }],
  };
};

const searchSongs = (
  state: PlaylistSearchState,
  options: SearchSongsOptions = {},
): SearchSongsResponse => {
  const query = options.query?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase();
  const limit = normalizeLimit(options.limit);
  const scopedPlaylists = getScopedPlaylists(state, options);

  if (!scopedPlaylists.ok) {
    return scopedPlaylists;
  }

  const matches = scopedPlaylists.playlists.flatMap(({ playlistName, items }) =>
    items
      .filter((item) => matchesSong(item, normalizedQuery))
      .map((item) => toResultItem(item, playlistName)),
  );

  return {
    ok: true,
    query,
    scope: scopedPlaylists.scope,
    totalMatches: matches.length,
    results: matches.slice(0, limit),
  };
};

export { searchSongs };
export type {
  PlaylistSearchState,
  SearchSongsFailure,
  SearchSongsOptions,
  SearchSongsResponse,
  SearchSongsResultItem,
  SearchSongsSuccess,
};
