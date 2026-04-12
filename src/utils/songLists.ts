import type MPlaylistItem from "../models/MPlaylistItem";
import {
  ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
  DEFAULT_SONG_LIST_NAME,
  SONG_LISTS_STORAGE_KEY,
  type SongListRecord,
  type SongListsState,
} from "../models/SongList";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasOwn = (object: object, key: string) => {
  return Object.prototype.hasOwnProperty.call(object, key);
};

const isStoredSongListItem = (value: unknown): value is MPlaylistItem => {
  if (!isRecord(value)) {
    return false;
  }

  const audioEq = value.audioEq;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.channelName === "string" &&
    typeof value.url === "string" &&
    typeof value.videoId === "string" &&
    typeof value.timestamp === "number" &&
    (typeof value.endTimestamp === "number" ||
      typeof value.endTimestamp === "undefined") &&
    typeof value.maxDuration === "number" &&
    typeof value.volume === "number" &&
    isRecord(audioEq) &&
    typeof audioEq.clearBass === "number" &&
    typeof audioEq.band400 === "number" &&
    typeof audioEq.band1k === "number" &&
    typeof audioEq.band2k5 === "number" &&
    typeof audioEq.band6k3 === "number" &&
    typeof audioEq.band16k === "number"
  );
};

const normalizeSongListRecord = (value: unknown): SongListRecord => {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return { items: [] };
  }

  return {
    items: value.items.filter(isStoredSongListItem),
  };
};

export const buildDefaultSongListsState = (): SongListsState => ({
  songLists: {
    [DEFAULT_SONG_LIST_NAME]: { items: [] },
  },
  activeSongListName: DEFAULT_SONG_LIST_NAME,
});

export const normalizeSongListsState = (
  result: Record<string, unknown>
): SongListsState => {
  const storedSongLists = result[SONG_LISTS_STORAGE_KEY];
  const storedActiveSongListName = result[ACTIVE_SONG_LIST_NAME_STORAGE_KEY];

  if (!isRecord(storedSongLists)) {
    return buildDefaultSongListsState();
  }

  const songLists = Object.entries(storedSongLists).reduce<
    SongListsState["songLists"]
  >((acc, [name, value]) => {
    acc[name] = normalizeSongListRecord(value);
    return acc;
  }, {});

  if (!hasOwn(songLists, DEFAULT_SONG_LIST_NAME)) {
    songLists[DEFAULT_SONG_LIST_NAME] = { items: [] };
  }

  const activeSongListName =
    typeof storedActiveSongListName === "string" &&
    hasOwn(songLists, storedActiveSongListName)
      ? storedActiveSongListName
      : DEFAULT_SONG_LIST_NAME;

  return {
    songLists,
    activeSongListName,
  };
};

export const createSongList = (
  state: SongListsState,
  rawName: string
): SongListsState => {
  const name = rawName.trim();

  if (!name) {
    throw new Error("Song list name is required.");
  }

  if (hasOwn(state.songLists, name)) {
    throw new Error("A song list with that name already exists.");
  }

  return {
    songLists: {
      ...state.songLists,
      [name]: { items: [] },
    },
    activeSongListName: name,
  };
};

export const updateActiveSongListItems = (
  state: SongListsState,
  items: MPlaylistItem[]
): SongListsState => ({
  songLists: {
    ...state.songLists,
    [state.activeSongListName]: { items },
  },
  activeSongListName: state.activeSongListName,
});
