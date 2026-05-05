import type MPlaylistItem from "../models/MPlaylistItem";
import {
  ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
  SONG_LISTS_STORAGE_KEY,
  type SongListsState,
} from "../models/SongList";
import {
  isPlaylistSourceDueForRefresh,
  updatePlaylistSourceAfterRefresh,
} from "../utils/playlistUpdateDetection";
import {
  buildDefaultSongListsState,
  normalizeSongListsState,
} from "../utils/songLists";
import { getStorageMap } from "../utils/syncStorage";
import { resolveYoutubePlaylist } from "./youtubePlaylistImport";

declare const chrome: {
  storage: {
    sync: {
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
};

interface RefreshResponse {
  ok: boolean;
  checked: boolean;
  newItemCount: number;
  message?: string;
}

interface RefreshDependencies {
  force?: boolean;
  now?: Date;
  readSongListsState?: () => Promise<SongListsState>;
  writeSongListsState?: (state: SongListsState) => Promise<void>;
  resolvePlaylist?: (url: string) => Promise<MPlaylistItem[]>;
}

const readStoredSongListsState = async () => {
  return normalizeSongListsState(
    await getStorageMap([
      SONG_LISTS_STORAGE_KEY,
      ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
    ])
  );
};

const writeStoredSongListsState = async (state: SongListsState) => {
  await chrome.storage.sync.set({
    [SONG_LISTS_STORAGE_KEY]: state.songLists,
    [ACTIVE_SONG_LIST_NAME_STORAGE_KEY]: state.activeSongListName,
  });
};

export const refreshActivePlaylistSource = async (
  dependencies: RefreshDependencies = {}
): Promise<RefreshResponse> => {
  const now = dependencies.now ?? new Date();
  const readSongListsState =
    dependencies.readSongListsState ?? readStoredSongListsState;
  const writeSongListsState =
    dependencies.writeSongListsState ?? writeStoredSongListsState;
  const resolvePlaylist = dependencies.resolvePlaylist ?? resolveYoutubePlaylist;
  const state = (await readSongListsState()) ?? buildDefaultSongListsState();
  const activeRecord = state.songLists[state.activeSongListName];
  const source = activeRecord?.playlistSources?.[0];

  if (!activeRecord || !source) {
    return { ok: true, checked: false, newItemCount: 0 };
  }

  if (!dependencies.force && !isPlaylistSourceDueForRefresh(source, now)) {
    return { ok: true, checked: false, newItemCount: 0 };
  }

  try {
    const fetchedItems = await resolvePlaylist(source.url);
    const nextSource = updatePlaylistSourceAfterRefresh(
      source,
      fetchedItems,
      now
    );
    const nextState: SongListsState = {
      ...state,
      songLists: {
        ...state.songLists,
        [state.activeSongListName]: {
          ...activeRecord,
          playlistSources: [
            nextSource,
            ...(activeRecord.playlistSources ?? []).slice(1),
          ],
        },
      },
    };

    await writeSongListsState(nextState);

    return {
      ok: true,
      checked: true,
      newItemCount: nextSource.pendingNewItems?.length ?? 0,
    };
  } catch (error) {
    return {
      ok: false,
      checked: true,
      newItemCount: 0,
      message:
        error instanceof Error
          ? error.message
          : "Could not check playlist updates.",
    };
  }
};

export type { RefreshResponse };
