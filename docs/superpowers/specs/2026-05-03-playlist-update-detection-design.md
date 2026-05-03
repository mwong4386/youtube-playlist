# Playlist Update Detection Design

## Goal

Detect when a tracked YouTube playlist has newly added videos and let the user decide whether to add or dismiss those videos from the current local song list.

The first version tracks one YouTube playlist link per song list, while storing sources as an array so later versions can support multiple playlist links.

## User Experience

Each song list can have playlist sources. In the first version, the UI allows at most one tracked YouTube playlist link for a song list.

When the playlist screen opens, the app checks whether the active song list has at least one tracked source. If the source has never been checked, or if its last check is older than one day, the app refreshes that source in the background.

If the refresh finds new videos, the playlist shows a non-playable virtual row at the top of the list. The row summarizes the new videos and provides two actions:

- Add: append the pending videos to the active song list.
- Remove: dismiss the pending videos without adding them.

Both actions update the source snapshot so the same videos are not offered again on the next daily check.

## Detection Model

The first version uses snapshot detection instead of timestamp detection.

For each tracked playlist source, the app stores the video IDs that have already been seen. A refresh imports the current playlist through the existing YouTube playlist resolver, then compares fetched video IDs against the source snapshot.

New candidates are videos whose IDs are not present in `lastSeenVideoIds`.

This avoids comparing only against the current local song list. If a user previously dismissed a video, it should not reappear just because it is missing from their saved list.

## Data Model

Extend each `SongListRecord` with source tracking metadata:

```ts
interface PlaylistSourceRecord {
  url: string;
  lastCheckedAt?: string;
  lastSeenVideoIds: string[];
  pendingNewItems?: MPlaylistItem[];
  pendingSnapshotVideoIds?: string[];
}

interface SongListRecord {
  items: MPlaylistItem[];
  playlistSources?: PlaylistSourceRecord[];
}
```

The model uses `playlistSources` as an array from the beginning. The first UI version enforces one source per song list.

`lastCheckedAt` is stored as an ISO timestamp. A source is eligible for automatic refresh when it is missing `lastCheckedAt` or when the timestamp is at least 24 hours old.

## Data Flow

1. The playlist screen loads the active song list through the existing storage path.
2. If the active list has a source due for refresh, the UI sends a background message to check that source.
3. The background worker resolves the YouTube playlist with the existing importer.
4. The worker compares fetched video IDs with the source `lastSeenVideoIds`.
5. If new items exist, the active song list source is updated with `pendingNewItems`, `pendingSnapshotVideoIds`, and `lastCheckedAt`.
6. The playlist screen reflects storage changes and renders the virtual update row when pending items exist.
7. Add appends pending items to the active list, copies `pendingSnapshotVideoIds` into `lastSeenVideoIds`, and clears pending state.
8. Remove copies `pendingSnapshotVideoIds` into `lastSeenVideoIds` and clears pending state without changing `items`.

If a refresh finds no new items, it updates `lastCheckedAt` and `lastSeenVideoIds` to the fetched snapshot, then clears any stale pending state.

## Error Handling

If the refresh fails, the app should not block normal playlist usage. It should store no pending items and keep the previous snapshot.

The UI can surface a compact status only when the user is actively interacting with source tracking. Passive daily checks should avoid noisy errors.

Invalid or unsupported playlist URLs should be rejected when the source is added, using the existing YouTube playlist URL validation behavior.

## Performance

The first version may fetch the full playlist using the existing importer. This is robust for reordered playlists and playlists that do not expose reliable added-at timestamps through the public page parser.

Large playlists can be slower, especially around 1000 items. Because checks run only once per day and only when the song list opens, this is acceptable for the first version.

A later optimization can add a shallow check mode or official YouTube Data API support. The API path can use `playlistItem.snippet.publishedAt` for time-based detection when credentials and quota handling are available.

## Testing

Unit tests should cover:

- source normalization in song list storage,
- one-day refresh eligibility,
- video ID snapshot comparison,
- Add behavior appending pending items and advancing the snapshot,
- Remove behavior dismissing pending items and advancing the snapshot,
- UI rendering of the virtual non-playable update row.

Background tests should verify that playlist refresh reuses the existing resolver and does not update pending state on failed imports.
