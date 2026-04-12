import type MPlaylistItem from "../../models/MPlaylistItem";
import {
  DEFAULT_SONG_LIST_NAME,
  type SongListRecord,
} from "../../models/SongList";

const hasOwn = (object: object, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);

const normalizeSongListName = (rawName: string): string => {
  return rawName.trim();
};

const normalizeSongListNames = (names: string[]): string[] => {
  return names.map(normalizeSongListName).filter((name) => name.length > 0);
};

export const getSongListOptions = (
  songLists: Record<string, SongListRecord>
): string[] => {
  return normalizeSongListNames(Object.keys(songLists));
};

export const getVisiblePlaylistForActiveList = (
  songLists: Record<string, SongListRecord>,
  activeSongListName: string
): MPlaylistItem[] => {
  if (hasOwn(songLists, activeSongListName)) {
    return songLists[activeSongListName].items;
  }

  if (hasOwn(songLists, DEFAULT_SONG_LIST_NAME)) {
    return songLists[DEFAULT_SONG_LIST_NAME].items;
  }

  return [];
};

export const getSongListCreationError = (
  rawName: string,
  existingNames: string[]
): string => {
  const name = normalizeSongListName(rawName);

  if (!name) {
    return "Song list name is required.";
  }

  if (normalizeSongListNames(existingNames).includes(name)) {
    return "A song list with that name already exists.";
  }

  return "";
};
