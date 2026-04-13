# YouTube EQ Save To Song List Design

## Summary

Add a save action to the YouTube-side EQ panel so the user can push the current player EQ settings into the active song list without opening the popup editor first.

When triggered, the action updates every matching saved song in the active song list for the current video. If the active song list does not already contain that video, the action creates a new song entry using the current video metadata and the current EQ settings.

The EQ panel stays open after saving and shows an inline success message that explains what happened.

## Goals

- Let users save the current YouTube EQ settings from the player-side EQ panel.
- Scope the write to the active named song list only.
- Update all matching songs for the current video in that active list.
- Add a new song with the current EQ if no matching song exists in that active list.
- Keep the interaction lightweight with inline success or error feedback.

## Non-Goals

- Syncing EQ automatically between the popup and YouTube player.
- Updating matching songs across every saved song list.
- Closing the EQ panel after save.
- Turning the EQ panel into a full playlist-management surface.

## User Experience

### Entry Point

The YouTube-side EQ panel gets a new action button below the EQ controls.

Recommended label:

- `Save EQ To Song List`

### Save Behavior

When the user clicks the button:

1. Read the current video identity from the YouTube page.
2. Read the current EQ band values from the EQ panel state.
3. Resolve the saved `activeSongListName`.
4. Load the saved song lists.
5. Search only the active song list for songs whose `videoId` matches the current video.
6. If matches exist, replace the `audioEq` values on every matching song in that active list.
7. If no matches exist, create a new song in the active list using current video metadata plus the current EQ values.

### Feedback

The panel remains open after the write completes.

Success feedback is shown inline under the button:

- If existing songs were updated:
  - `Saved current EQ to 3 songs in "Ado Mix".`
- If a new song was created:
  - `Added this song to "Ado Mix" with current EQ.`

Error feedback is also inline:

- Example:
  - `Couldn't save EQ right now. Please try again.`

Button states:

- idle: enabled
- saving: disabled with `Saving...`
- success: button returns to idle and success message is shown
- error: button returns to idle and error message is shown

## Matching Rules

- Match songs by `videoId`, not raw URL.
- Only inspect songs inside the active song list.
- If the active song list contains multiple saved entries for the same video with different timestamps, update all of them.

## Add-New-Song Behavior

If the active song list has no matching `videoId`, create a new song entry in that active list.

The new song should use the same defaults as the current YouTube-side add flow where possible:

- current video title
- current channel name
- current page URL
- current `videoId`
- current playback time as the starting timestamp
- `endTimestamp` as `undefined`
- current video duration if available
- current volume value from the save flow's existing source of truth
- current EQ values from the EQ panel

If exact metadata defaults already exist in shared add-song logic, reuse them instead of duplicating field rules in the EQ save action.

## Technical Design

### Content Script UI

Extend the EQ panel UI to render:

- the new save button
- inline status text for saving, success, and error

The content script owns the immediate button interaction state so the panel can respond instantly.

### Storage And Write Path

Prefer routing the actual write through shared song-list storage helpers or a central message handler rather than embedding all storage mutation rules directly in the EQ panel UI.

The save request should include:

- current video metadata needed to create a new song if no match exists
- normalized EQ values

The write layer should:

- load `songLists`
- load `activeSongListName`
- guarantee a valid active list fallback if storage is malformed
- update all matching items in that list or append a new item
- persist the updated `songLists`

### Data Integrity

- Clone EQ values before writing them into songs.
- Preserve all non-EQ fields on existing matching songs.
- Do not modify songs in non-active lists.
- Do not introduce profile references; save concrete per-song EQ values only.

## Error Handling

- If no valid active song list can be resolved, fall back to the existing safe list resolution rules.
- If current video metadata cannot be read well enough to create a new song, fail with inline error text instead of creating a partial record.
- If storage reads or writes fail, show inline error text and leave existing songs unchanged.
- If the current EQ state is malformed, normalize and clamp it before saving using existing EQ rules.

## Testing

Add focused tests for:

- updating all matching songs in the active song list only
- leaving other song lists unchanged
- creating a new song when the active list has no matching `videoId`
- matching by `videoId` instead of URL
- preserving timestamps and other metadata on updated songs
- clamping and cloning EQ values before save
- success message selection for update vs add flows

Manual verification targets:

- save EQ when one matching song exists
- save EQ when multiple matching songs exist in the active list
- confirm a different song list with the same video is unchanged
- save EQ when no matching song exists and confirm a new song is created
- confirm the EQ panel stays open after save
- confirm success and error feedback copy renders correctly

## Implementation Notes

- Reuse existing song-list storage helpers or introduce a shared helper instead of duplicating list-write logic in multiple surfaces.
- Keep the button styling aligned with the existing YouTube-side panel visual language.
- Prefer concise status text so the panel stays compact.
