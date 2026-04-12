# Named Song Lists Design

## Summary

Add support for multiple named song lists in the popup. The current single saved playlist becomes the initial `default` list. Users can create a new empty list by typing a name, switch between saved lists, and have the popup reopen on the last active list automatically.

## Goals

- Preserve the current playlist experience while allowing multiple saved lists.
- Keep the first version simple: create a list, switch lists, and persist the active list.
- Reuse as much of the existing playlist UI and storage flow as possible.
- Migrate existing users without losing their saved songs.

## Non-Goals

- Renaming song lists in the first version.
- Deleting song lists in the first version.
- Cross-list drag and drop or moving songs between lists in the first version.
- Adding per-list playback behavior beyond storing the list's song items.

## User Experience

### Default Behavior

- Existing users keep their current playlist content.
- On first load after the feature ships, that content becomes the `default` song list.
- New users start with an empty `default` song list.

### Creating A Song List

- The popup provides a `New List` action near the playlist header.
- Selecting `New List` opens a small prompt or modal with a text input for the list name.
- If the user enters a unique name such as `aimer`, the app creates that list with no songs and makes it active immediately.
- If the name is empty or already exists, the app shows inline validation and does not overwrite anything.

### Switching Song Lists

- The popup shows the active song list name in a selector near the playlist header.
- Opening the selector shows all saved song list names.
- Choosing another name loads that list's songs into the main playlist view immediately.
- When the popup is reopened later, it restores the last active song list automatically.

### Playlist Actions

- Existing actions such as add, edit, import, reorder, delete, bulk actions, and playback continue to operate on the active song list only.
- Creating a new list starts from an empty song collection.
- The `default` list remains available at all times.

## Data Model

Store named song lists in `chrome.storage.sync` with a separate active-list key.

```ts
interface SongListRecord {
  items: MPlaylistItem[];
}

interface SongListsStorage {
  songLists: Record<string, SongListRecord>;
  activeSongListName: string;
}
```

Example persisted shape:

```json
{
  "songLists": {
    "default": { "items": [] },
    "aimer": { "items": [] }
  },
  "activeSongListName": "aimer"
}
```

This shape is preferred over a raw `Record<string, MPlaylistItem[]>` because it leaves room for future per-list metadata without another storage migration.

## Migration

### Existing Storage

The app currently stores a single playlist in `chrome.storage.sync.youtube_list`.

### Migration Rules

- On popup startup, if `songLists` does not exist yet:
  - read `youtube_list`
  - create `songLists.default.items` from that value, or an empty array if nothing exists
  - set `activeSongListName` to `default`
- After the migration succeeds, the popup should read and write through the new keys only.
- The old `youtube_list` key may remain for one release if desired for safety, but it should no longer be the source of truth.

### Safety

- Migration must be idempotent. If `songLists` already exists, do not rebuild it from `youtube_list`.
- Migration must not destroy existing songs when users reopen the popup multiple times.

## Technical Design

### Storage Helpers

Add a small utility layer to:

- read the full named-song-list storage shape
- create a new list
- update the active list's items
- switch the active list name
- perform first-run migration from `youtube_list`

Keeping this logic out of `Playlist.tsx` reduces the risk of scattered storage updates and makes the migration testable.

### Playlist Screen

`src/screens/playlist/Playlist.tsx` remains the state owner for the popup's visible playlist, but it should now:

- initialize from `songLists` and `activeSongListName`
- track the active list name
- update only the active list when songs change
- listen for storage changes to both `songLists` and `activeSongListName`

The playlist screen should continue exposing `playlist` as the currently loaded list for the rest of the UI, so most existing item-level interactions can stay unchanged.

### Header And Song List Controls

The playlist header area should gain two new controls:

- a selector showing the active song list name
- a `New List` action

The selector can be implemented with the same action sheet or modal patterns already used elsewhere in the popup so the interaction stays consistent with the existing design language.

### Creating A New List

When the user submits a valid list name:

- create a new `songLists[name] = { items: [] }`
- set `activeSongListName = name`
- update popup state so the empty list renders immediately

Validation rules:

- trim surrounding whitespace
- reject empty names
- reject duplicates using exact stored names for the first version

### Switching Lists

Switching lists should:

- update `activeSongListName`
- load the corresponding `items` array into the popup state
- preserve the target list exactly as last saved

All downstream playlist actions should transparently apply to the active list because they work off the visible playlist state.

### Existing Playlist Features

The following behaviors should continue to work against the active list without changing their user-facing meaning:

- manual add from YouTube
- edit song info
- delete one or many songs
- import into the current list
- reorder songs
- playback controls
- Gemini timing analysis
- EQ settings stored on each song item

This feature should not change the `MPlaylistItem` shape.

## Error Handling

- If list creation fails to save, keep the current active list unchanged and surface a visible error state in the creation UI.
- If the active list name points to a missing list for any reason, fall back to `default`.
- If `default` is somehow missing from storage, recreate it with an empty `items` array.
- If storage data is malformed, prefer a safe fallback to `default` rather than crashing the popup.

## Testing

Add or update tests for:

- migrating `youtube_list` into `songLists.default`
- skipping migration when `songLists` already exists
- creating a new empty list with a typed name
- rejecting duplicate or empty names
- switching the active list and loading the correct songs
- updating only the active list when playlist actions write changes
- restoring the last active list on popup load

## Open Choices Resolved

- Use one top-level `songLists` object plus a separate `activeSongListName` key.
- Keep `default` as the initial list for all users.
- New lists start empty.
- New lists are created from a user-typed name.
- The popup reopens on the last active list automatically.
- Defer rename and delete support to a later feature.

## Implementation Notes

- Prefer introducing named constants for the new storage keys.
- Centralize the migration and read/write logic so background popup behavior stays predictable.
- Keep the first UI iteration lightweight and consistent with existing modal or action-sheet patterns rather than adding a complex new management screen.
