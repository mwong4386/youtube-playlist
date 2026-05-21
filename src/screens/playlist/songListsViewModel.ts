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

type SongListMenuRow = {
  id: "song-list-selector";
  kind: "song-list-selector";
  description: string;
  trailingIcon: "chevron-down";
};

type SongListSheetActionRow = {
  id: "new-song-list";
  kind: "song-list-action";
  description: "New Song List";
  leadingIcon: "plus";
};

type SongListSheetListRow = {
  id: string;
  kind: "song-list-row";
  songListName: string;
  description: string;
  isActive: boolean;
  trailingIcon: "edit";
};

type SongListSheetInlineEditRow = {
  id: string;
  kind: "song-list-inline-edit";
  songListName: string;
  description: string;
  isActive: boolean;
  saveIcon: "check";
  cancelIcon: "x";
};

export type SongListRenameState = {
  editingSongListName: string | null;
  songListRenameValue: string;
  songListRenameError: string;
};

export const createClosedSongListRenameState = (): SongListRenameState => ({
  editingSongListName: null,
  songListRenameValue: "",
  songListRenameError: "",
});

export const createSavedSongListRenameState = createClosedSongListRenameState;

export const getSongListsAfterVisibleRename = (
  songLists: Record<string, SongListRecord>,
  currentName: string,
  nextName: string,
): Record<string, SongListRecord> => {
  const normalizedNextName = normalizeSongListName(nextName);

  if (currentName === normalizedNextName) {
    return songLists;
  }

  const currentRecord = songLists[currentName];
  if (!currentRecord) {
    return songLists;
  }

  const nextSongLists: Record<string, SongListRecord> = {};

  for (const [name, record] of Object.entries(songLists)) {
    if (name === currentName) {
      nextSongLists[normalizedNextName] = currentRecord;
      continue;
    }

    nextSongLists[name] = record;
  }

  return nextSongLists;
};

export const buildSongListMenuItems = ({
  activeSongListName,
}: {
  activeSongListName: string;
  songLists: Record<string, SongListRecord>;
}): SongListMenuRow[] => {
  return [
    {
      id: "song-list-selector",
      kind: "song-list-selector",
      description: normalizeSongListName(activeSongListName),
      trailingIcon: "chevron-down",
    },
  ];
};

export const buildSongListSheetRows = ({
  activeSongListName,
  editingSongListName,
  songLists,
}: {
  activeSongListName: string;
  editingSongListName: string | null;
  songLists: Record<string, SongListRecord>;
}): Array<
  SongListSheetActionRow | SongListSheetListRow | SongListSheetInlineEditRow
> => {
  const activeName = normalizeSongListName(activeSongListName);
  const editingName =
    editingSongListName === null
      ? null
      : normalizeSongListName(editingSongListName);

  return [
    {
      id: "new-song-list",
      kind: "song-list-action",
      description: "New Song List",
      leadingIcon: "plus",
    },
    ...getSongListOptions(songLists).map((songListName) => {
      if (editingName === songListName) {
        const row: SongListSheetInlineEditRow = {
          id: `edit-song-list-${songListName}`,
          kind: "song-list-inline-edit",
          songListName,
          description: songListName,
          isActive: songListName === activeName,
          saveIcon: "check",
          cancelIcon: "x",
        };

        return row;
      }

      const row: SongListSheetListRow = {
        id: `song-list-${songListName}`,
        kind: "song-list-row",
        songListName,
        description: songListName,
        isActive: songListName === activeName,
        trailingIcon: "edit",
      };

      return row;
    }),
  ];
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
