# YouTube Playlist URL Import Design

## Summary

Add a first-class feature that lets users paste a YouTube playlist URL and import that playlist into the extension. Imported videos become normal saved playlist items with safe default playback settings. Timestamp detection remains a separate bulk action so import stays fast and reliable.

## Goals

- Let a user import their own YouTube playlist by pasting a URL.
- Let the user choose whether the imported items append to or replace the current saved list.
- Keep the initial import fast by creating items with default timestamps and EQ settings.
- Add a bulk timestamp analysis flow that can process many imported items asynchronously in the background.

## Non-Goals

- Do not attempt to analyze timestamps during the initial import request.
- Do not require the user to provide a YouTube Data API key.
- Do not redesign the existing manual JSON import flow in this phase.
- Do not add playlist foldering, tags, or metadata beyond what is needed for import and analysis progress.

## User Experience

### Import From YouTube Playlist

Add a new popup action named `Import from YouTube Playlist`.

When selected, the extension opens a modal with:

- a text input for a YouTube playlist URL
- an import mode choice: `Append` or `Replace`
- brief helper text explaining that imported items start with default timestamps

On submit:

1. Validate that the URL looks like a YouTube playlist URL.
2. Start an import request through the background script.
3. Resolve the playlist into videos and convert them into `MPlaylistItem` records.
4. Save the result into `chrome.storage.sync.youtube_list`.
5. Show a result summary such as imported count, skipped duplicates, or a clear error message.

### Append vs Replace

- `Append` merges imported items after the existing saved list.
- `Replace` overwrites the saved list only after the import succeeds.
- The modal should make it clear that `Replace` affects the current saved playlist.

### Duplicate Handling

When appending, skip imported entries whose `videoId` already exists in the saved list. This avoids accidental duplicate imports from the same playlist URL and keeps the first version simple.

If every imported item is already present, report that nothing new was added instead of silently succeeding.

## Imported Item Mapping

Each imported video becomes an `MPlaylistItem` using normalized defaults:

- `id`: generated unique id
- `title`: imported title text
- `channelName`: imported channel or owner text
- `url`: canonical YouTube watch URL for the video
- `videoId`: extracted YouTube video id
- `timestamp`: `0`
- `endTimestamp`: `undefined`
- `maxDuration`: `0` until later metadata is known
- `volume`: `100`
- `audioEq`: `DEFAULT_AUDIO_EQ_SETTINGS`

The item is valid immediately for the current app model, even if precise song boundaries are not known yet.

## Import Architecture

### UI Layer

The popup owns:

- launching the import modal
- collecting URL and import mode
- rendering loading, success, and error states
- refreshing the playlist after storage changes

The popup does not own YouTube parsing logic.

### Background Import Coordinator

Add a new background message for playlist import. The background script is responsible for:

- receiving the playlist URL and mode
- calling a playlist resolver
- applying append or replace semantics
- writing the final list to sync storage
- returning a structured result to the popup

Keeping import in the background reduces popup coupling and gives a single place to handle future retries, parsing fallbacks, and queueing.

### Playlist Resolver

Create a dedicated resolver utility that accepts a playlist URL and returns normalized playlist item data.

The resolver should expose one interface while hiding the actual retrieval strategy:

1. Primary strategy: fetch and parse the playlist page data directly from the provided URL.
2. Fallback strategy: if direct fetch/parsing is blocked or incomplete, use a controlled YouTube tab plus content-script extraction.

This allows the app to ship a practical first version without locking the UI into a brittle implementation detail.

If fallback is needed, the background script should open the playlist in an inactive temporary tab, wait for extraction to complete, and then close that tab automatically.

### Parsing Expectations

The resolver should extract enough information to build `MPlaylistItem`s:

- playlist video order
- video title
- video id
- channel name when available

The parser should be defensive:

- reject invalid or non-playlist URLs
- fail clearly if no playlist entries can be extracted
- ignore incomplete entries that have no usable `videoId`
- surface user-facing errors that explain whether the URL was invalid, the playlist was unavailable, or parsing failed

## Bulk Timestamp Analysis

### User Flow

After import, users can trigger:

- `Analyze Missing Timestamps`
- optionally later: `Reanalyze All`

The recommended first release behavior is to analyze only items that still have default boundaries:

- `timestamp === 0`
- `endTimestamp === undefined`

This avoids overwriting manual edits and reduces Gemini cost and wait time.

### Background Queue

Bulk analysis should run as a background-managed queue rather than inside the popup.

Responsibilities:

- process one playlist item at a time
- call the existing Gemini analysis flow per item
- update each item in sync storage as results complete
- continue through failures instead of aborting the whole batch
- store queue progress in local storage so the popup can recover state after being closed or reopened

### Progress Model

Track enough local state for the popup to present:

- whether a batch is active
- total items selected
- completed count
- current item id or title when available
- failed item count

The popup can subscribe to storage changes and render lightweight progress instead of managing long-running work itself.

## Error Handling

### Import Errors

Import should return explicit errors for:

- invalid YouTube playlist URL
- inaccessible or private playlist
- empty playlist
- parsing failure
- storage write failure

`Replace` should not clear the current saved playlist if import fails.

### Analysis Errors

Per-item analysis errors should be stored as batch progress details and surfaced in summary form. A failed item should remain imported with its default timestamps so the user can retry or edit manually later.

## Testing Strategy

Add unit coverage for:

- playlist URL validation
- mapping imported entries into `MPlaylistItem`
- append behavior
- replace behavior
- duplicate skipping
- background batch state transitions for bulk analysis

Where the parser depends on YouTube page structure, isolate the extraction logic so representative fixtures can be tested without browser-only execution.

At minimum, run the project build after implementation. If browser validation is practical in-session, validate the popup import flow and background queue progress end to end.

## Implementation Notes

- The first implementation should attempt direct page parsing before falling back to controlled-tab extraction.
- Controlled-tab fallback should use an inactive temporary YouTube tab that closes automatically after extraction succeeds or fails.
- Imported items should use volume `100` in this phase so imported data has a clear and predictable default.

## Recommended Rollout

Phase 1:

- URL import modal
- append/replace behavior
- duplicate skipping
- background import coordinator
- imported items with default timestamps

Phase 2:

- bulk `Analyze Missing Timestamps`
- background queue progress
- retry affordances for failed analysis items

This phasing still delivers the user-facing feature quickly while keeping slow AI work separate from the first import interaction.
