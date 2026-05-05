import type MPlaylistItem from "../models/MPlaylistItem";
import {
  ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
  DEFAULT_SONG_LIST_NAME,
  SONG_LISTS_STORAGE_KEY,
  type PlaylistSourceRecord,
  type SongListRecord,
  type SongListsState,
} from "../models/SongList";
import { getStorageMap } from "./syncStorage";

declare const chrome: {
  storage: {
    sync: {
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
};

type ReadSongListsStorageMap = (
  keys: string[]
) => Promise<Record<string, unknown>>;
type WriteSongListsStorageMap = (
  items: Record<string, unknown>
) => Promise<void>;

const SONG_LIST_STORAGE_KEYS = [
  SONG_LISTS_STORAGE_KEY,
  ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
];
const RESERVED_SONG_LIST_NAMES = new Set(["__proto__"]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasOwn = (object: object, key: string) => {
  return Object.prototype.hasOwnProperty.call(object, key);
};

const createSongListsMap = (): SongListsState["songLists"] =>
  Object.create(null) as SongListsState["songLists"];

const copySongLists = (
  songLists: Record<string, SongListRecord>
): SongListsState["songLists"] => {
  const nextSongLists = createSongListsMap();

  for (const [name, record] of Object.entries(songLists)) {
    nextSongLists[name] = record;
  }

  return nextSongLists;
};

const replaceSongListItems = (
  songLists: Record<string, SongListRecord>,
  targetListName: string,
  items: MPlaylistItem[]
): SongListsState["songLists"] => {
  const nextSongLists = copySongLists(songLists);
  const currentRecord = nextSongLists[targetListName] ?? { items: [] };
  nextSongLists[targetListName] = { ...currentRecord, items };
  return nextSongLists;
};

const isReservedSongListName = (name: string) => {
  return RESERVED_SONG_LIST_NAMES.has(name);
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

  const playlistSources = Array.isArray(value.playlistSources)
    ? value.playlistSources
        .map(normalizePlaylistSourceRecord)
        .filter(
          (source): source is PlaylistSourceRecord =>
            typeof source !== "undefined"
        )
    : undefined;

  return {
    items: value.items.filter(isStoredSongListItem),
    ...(playlistSources && playlistSources.length > 0
      ? { playlistSources }
      : {}),
  };
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

const normalizePlaylistSourceRecord = (
  value: unknown
): PlaylistSourceRecord | undefined => {
  if (!isRecord(value) || typeof value.url !== "string" || !value.url.trim()) {
    return undefined;
  }

  if (!isStringArray(value.lastSeenVideoIds)) {
    return undefined;
  }

  const pendingNewItems = Array.isArray(value.pendingNewItems)
    ? value.pendingNewItems.filter(isStoredSongListItem)
    : undefined;
  const pendingSnapshotVideoIds = isStringArray(value.pendingSnapshotVideoIds)
    ? value.pendingSnapshotVideoIds
    : undefined;

  return {
    url: value.url.trim(),
    lastCheckedAt:
      typeof value.lastCheckedAt === "string" ? value.lastCheckedAt : undefined,
    lastSeenVideoIds: value.lastSeenVideoIds,
    ...(pendingNewItems && pendingNewItems.length > 0
      ? { pendingNewItems }
      : {}),
    ...(pendingSnapshotVideoIds ? { pendingSnapshotVideoIds } : {}),
  };
};

export const buildDefaultSongListsState = (): SongListsState => {
  const songLists = createSongListsMap();
  songLists[DEFAULT_SONG_LIST_NAME] = { items: [] };

  return {
    songLists,
    activeSongListName: DEFAULT_SONG_LIST_NAME,
  };
};

export const normalizeSongListsState = (
  result: Record<string, unknown>
): SongListsState => {
  const storedSongLists = result[SONG_LISTS_STORAGE_KEY];
  const storedActiveSongListName = result[ACTIVE_SONG_LIST_NAME_STORAGE_KEY];

  if (!isRecord(storedSongLists)) {
    return buildDefaultSongListsState();
  }

  const songLists = createSongListsMap();

  for (const [name, value] of Object.entries(storedSongLists)) {
    songLists[name] = normalizeSongListRecord(value);
  }

  if (Object.keys(songLists).length === 0) {
    return buildDefaultSongListsState();
  }

  const activeSongListName =
    typeof storedActiveSongListName === "string" &&
    hasOwn(songLists, storedActiveSongListName)
      ? storedActiveSongListName
      : DEFAULT_SONG_LIST_NAME;

  if (activeSongListName === DEFAULT_SONG_LIST_NAME && !hasOwn(songLists, DEFAULT_SONG_LIST_NAME)) {
    songLists[DEFAULT_SONG_LIST_NAME] = { items: [] };
  }

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

  if (isReservedSongListName(name)) {
    throw new Error("That song list name is reserved.");
  }

  if (hasOwn(state.songLists, name)) {
    throw new Error("A song list with that name already exists.");
  }

  return {
    songLists: replaceSongListItems(state.songLists, name, []),
    activeSongListName: name,
  };
};

export const renameSongList = (
  state: SongListsState,
  oldName: string,
  rawNewName: string
): SongListsState => {
  const newName = rawNewName.trim();

  if (!hasOwn(state.songLists, oldName)) {
    throw new Error("Song list not found.");
  }

  if (!newName) {
    throw new Error("Song list name is required.");
  }

  if (isReservedSongListName(newName)) {
    throw new Error("That song list name is reserved.");
  }

  if (oldName === newName) {
    return state;
  }

  if (hasOwn(state.songLists, newName)) {
    throw new Error("A song list with that name already exists.");
  }

  const nextSongLists = createSongListsMap();
  const record = state.songLists[oldName];

  for (const [name, value] of Object.entries(state.songLists)) {
    if (name === oldName) {
      nextSongLists[newName] = record;
      continue;
    }

    nextSongLists[name] = value;
  }

  return {
    songLists: nextSongLists,
    activeSongListName:
      state.activeSongListName === oldName ? newName : state.activeSongListName,
  };
};

export const updateActiveSongListItems = (
  state: SongListsState,
  items: MPlaylistItem[]
): SongListsState => ({
  songLists: replaceSongListItems(
    state.songLists,
    state.activeSongListName,
    items
  ),
  activeSongListName: state.activeSongListName,
});

export const updateActiveSongListRecord = (
  state: SongListsState,
  updater: (record: SongListRecord) => SongListRecord
): SongListsState => {
  const currentRecord =
    state.songLists[state.activeSongListName] ??
    state.songLists[DEFAULT_SONG_LIST_NAME] ??
    { items: [] };

  return {
    songLists: {
      ...state.songLists,
      [state.activeSongListName]: updater(currentRecord),
    },
    activeSongListName: state.activeSongListName,
  };
};

export const readActiveSongListItemsFromStorageMap = (
  result: Record<string, unknown>
): MPlaylistItem[] => {
  const state = normalizeSongListsState(result);
  return state.songLists[state.activeSongListName].items;
};

export const buildActiveSongListStorageUpdate = (
  result: Record<string, unknown>,
  items: MPlaylistItem[]
): Record<string, unknown> => {
  const nextState = updateActiveSongListItems(normalizeSongListsState(result), items);

  return {
    [SONG_LISTS_STORAGE_KEY]: nextState.songLists,
  };
};

export const readActiveSongListItems = async (
  readStorageMap: ReadSongListsStorageMap = getStorageMap
): Promise<MPlaylistItem[]> => {
  const result = await readStorageMap(SONG_LIST_STORAGE_KEYS);
  return readActiveSongListItemsFromStorageMap(result);
};

export const writeActiveSongListItems = async (
  items: MPlaylistItem[],
  readStorageMap: ReadSongListsStorageMap = getStorageMap,
  writeStorageMap: WriteSongListsStorageMap = (nextItems) =>
    chrome.storage.sync.set(nextItems)
): Promise<void> => {
  const result = await readStorageMap(SONG_LIST_STORAGE_KEYS);
  await writeStorageMap(buildActiveSongListStorageUpdate(result, items));
};
