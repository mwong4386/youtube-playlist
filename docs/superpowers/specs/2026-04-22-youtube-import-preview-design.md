# YouTube Import Preview Design

## Goal

When importing from a YouTube playlist URL, show a preview before changing the saved song list. Every importable song is selected by default, and the user can uncheck songs before committing the import.

## Scope

This change applies to the YouTube URL import path only. JSON import keeps its current replace-from-file behavior, but the preview state should be generic enough to accept another source later.

## Approach

The popup import modal becomes a two-step flow for YouTube URLs:

1. Resolve the YouTube playlist in the background and return imported items without writing storage.
2. Render a preview list in the modal with all candidate songs checked by default.
3. Commit only selected songs using the existing active song-list update path.

Append mode filters out songs already present in the active song list before previewing, preserving the current duplicate-skip behavior. Replace mode previews all resolved songs and commits only the checked subset as the replacement list.

## Data Flow

The background exposes a preview message that validates and resolves the playlist URL, then returns `items`. It does not read or write saved playlist storage. The popup receives those items, creates preview state, and commits the selected subset through `updateActiveSongListItems`.

This split keeps the preview flexible: future import sources can feed the same preview state with candidate `MPlaylistItem[]` without changing the commit UI.

## Error Handling

Invalid, unavailable, empty, or parse-failed YouTube playlists surface the existing import error messages in the modal. Append previews that contain only duplicates show the existing “already saved” message and do not move to preview.

## Testing

Add unit tests for deriving preview candidates and committing selected preview items. Run the full TypeScript test suite and the extension build after implementation.
