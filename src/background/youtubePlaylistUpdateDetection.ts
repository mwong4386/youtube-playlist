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
  targetSongListName?: string;
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
  const targetSongListName =
    dependencies.targetSongListName ?? state.activeSongListName;
  const activeRecord = state.songLists[targetSongListName];
  const sources = activeRecord?.playlistSources ?? [];

  if (!activeRecord || sources.length === 0) {
    return { ok: true, checked: false, newItemCount: 0 };
  }

  let totalNewItems = 0;
  let hasError = false;
  let firstErrorMessage: string | undefined;
  let checkedAny = false;

  const nextSources = [...sources];

  for (let i = 0; i < nextSources.length; i++) {
    const source = nextSources[i];
    if (!dependencies.force && !isPlaylistSourceDueForRefresh(source, now)) {
      continue;
    }

    checkedAny = true;
    try {
      const fetchedItems = await resolvePlaylist(source.url);
      const nextSource = updatePlaylistSourceAfterRefresh(
        source,
        fetchedItems,
        now
      );
      nextSources[i] = nextSource;
      totalNewItems += nextSource.pendingNewItems?.length ?? 0;
    } catch (error) {
      hasError = true;
      if (!firstErrorMessage) {
        firstErrorMessage =
          error instanceof Error ? error.message : "Update check failed.";
      }
    }
  }

  if (checkedAny) {
    const nextState: SongListsState = {
      ...state,
      songLists: {
        ...state.songLists,
        [targetSongListName]: {
          ...activeRecord,
          playlistSources: nextSources,
        },
      },
    };

    await writeSongListsState(nextState);
  }

  return {
    ok: !hasError,
    checked: checkedAny,
    newItemCount: totalNewItems,
    message: firstErrorMessage,
  };
};

export type { RefreshResponse };
