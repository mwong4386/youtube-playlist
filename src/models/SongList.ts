import type MPlaylistItem from "./MPlaylistItem";

export const SONG_LISTS_STORAGE_KEY = "songLists";
export const ACTIVE_SONG_LIST_NAME_STORAGE_KEY = "activeSongListName";
export const DEFAULT_SONG_LIST_NAME = "default";

export interface PlaylistSourceRecord {
  url: string;
  lastCheckedAt?: string;
  lastSeenVideoIds: string[];
  pendingNewItems?: MPlaylistItem[];
  pendingSnapshotVideoIds?: string[];
}

export interface SongListRecord {
  items: MPlaylistItem[];
  playlistSources?: PlaylistSourceRecord[];
}

export interface SongListsState {
  songLists: Record<string, SongListRecord>;
  activeSongListName: string;
}
