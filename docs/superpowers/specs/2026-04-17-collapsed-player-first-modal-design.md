# Collapsed Player-First Modal Design

## Summary

Unify the song edit modal and now-playing transport into a single modal flow that opens in a compact player-first state for the currently playing song. The modal starts collapsed, showing only the header, song metadata, and transport row. Tapping the non-button area of the player surface expands the modal to reveal the existing `Info / EQ` editor above the same transport row.

For songs that are not currently playing, the modal skips the collapsed transport-first state and opens directly into the expanded `Info` editor.

## Goals

- Keep the song modal visually simpler on first open for the active song.
- Reuse a single modal instead of maintaining a separate floating banner plus edit modal experience.
- Preserve the current `Info` and `EQ` editing flows once the modal is expanded.
- Keep transport controls accessible while editing the currently playing song.
- Make `Info` the consistent default expanded tab.

## Non-Goals

- Remembering the last-opened editor tab between modal sessions.
- Showing transport controls for songs that are not the current playback item.
- Adding new transport actions or changing playback message semantics.
- Creating a separate mini-player or a second song-editor surface.

## UX Design

### Current Playing Song

When the user opens the modal for the currently playing song:

- The modal opens in a collapsed state.
- The collapsed view shows:
  - close and save actions in the header
  - song title and channel name
  - the transport row
- The `Info / EQ` editor section is hidden initially.

Interaction behavior:

- Tapping the player surface, excluding transport buttons, expands the modal.
- Expanded state reveals:
  - the `Info / EQ` tabs
  - the active editor section in the middle
  - the same transport row anchored at the bottom
- Expanded state always opens on `Info`.
- If the user switches to `EQ`, only the middle editor section changes.

### Non-Playing Song

When the user opens the modal for a song that is not currently playing:

- The modal opens directly in expanded mode.
- The active tab defaults to `Info`.
- The transport row is hidden.

This keeps editing available for any saved song without exposing inactive playback controls.

### Transport Expansion Rules

The transport section must separate expansion from playback actions:

- Clicking the previous, play-pause, or next buttons performs only that action.
- Those button clicks must not expand the modal.
- Expansion is handled by a dedicated click target on the transport surface outside the transport buttons.

## State Model

Add an internal modal presentation state:

```ts
type InfoModalPresentation = "collapsed" | "expanded";
```

Modal open rules:

- If `item.id === playbackState.currentItemId`, initialize presentation as `"collapsed"`.
- Otherwise initialize presentation as `"expanded"`.
- Initialize the active editor tab as `"details"` on each modal open.

Reset rules:

- Closing the modal resets presentation state so the next open starts from the correct default.
- Closing the modal also resets the active tab back to `Info`.

Live playback updates while the modal is open:

- If the open modal item becomes the current playback item, the transport row may appear without forcing expansion.
- If the open modal item stops being the current playback item, hide the transport row and continue showing the editor-only modal.
- Playback changes must not silently switch the active tab or dismiss unsaved form edits.

## Component Changes

### Playlist Screen

`Playlist` becomes the source of truth for whether the modal item is also the current playback item.

It passes the playback context that `InfoModal` uses to determine:

- whether transport controls should render
- whether the modal should default to collapsed or expanded on open
- whether transport button handlers are available

The separate floating `NowPlayingBanner` is removed as part of this change once the modal owns the transport experience.

### InfoModal

`InfoModal` becomes a combined editor and transport surface.

Responsibilities:

- render the collapsed player-first layout for the currently playing item
- expand into the full editor layout on transport-surface click
- keep `Info / EQ` content in the middle section only
- reuse the bottom transport row in both collapsed and expanded states
- preserve the existing form submission and validation behavior

### Shared Transport Presentation

The current `NowPlayingBanner` transport layout and styling are adapted into a reusable section that lives inside `InfoModal`.

The modal version preserves:

- current transport button visuals
- song title and channel display
- current playback message wiring

The modal version adds:

- a non-button expansion hit area
- collapsed and expanded layout variants

## Error Handling

- If there is no current playback item, the modal never renders the transport row.
- If the current playback item cannot be found in the playlist, the modal behaves as editor-only.
- If playback changes during editing, do not reset form values or lose dirty state.
- If the transport row is hidden because playback no longer matches the modal item, keep the modal open and leave the editor usable.
- If transport button handlers fail or playback messages are delayed, the modal remains stable and does not collapse or expand unexpectedly.

## Testing

Add focused coverage for:

- current playing item opens collapsed
- non-playing item opens expanded on `Info`
- expanded state defaults to `Info` on each open
- clicking the transport surface expands the modal
- clicking previous, play-pause, and next does not expand the modal
- switching between `Info` and `EQ` only swaps the middle section
- transport row hides when there is no playback match
- playback-state changes while the modal is open do not clear form state

Manual verification targets:

- open the currently playing song from the playlist and confirm collapsed first render
- expand from the player surface and switch between `Info` and `EQ`
- use transport controls while collapsed and while expanded
- open a non-playing song and confirm editor-only expanded open
- change playback while the modal is open and confirm transport visibility updates correctly
- save edits from both the current-playing and non-playing flows

## Implementation Notes

- Prefer reusing `NowPlayingBanner` internals or extracting a shared transport section instead of reimplementing controls from scratch.
- Keep the modal as the only editor surface for this flow.
- Preserve existing save, analyze, validation, and EQ profile behavior.
- Follow the current glass-sheet styling and avoid introducing a second nested card system unless required by layout constraints.
