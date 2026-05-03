# Edit Song Gemini EQ Design

## Goal

Add Gemini-assisted song EQ adjustment to the Edit Song modal's EQ tab so a user can ask Gemini for EQ changes for the song currently being edited.

## Existing Context

- `SelectionActionsModal` already supports Gemini song EQ for exactly one selected song.
- The existing flow uses `selectionActionsGeminiEqReview.ts` to build a `GeminiSongEqUserRequest`, manage loading/status/preview state, and resolve stale async responses.
- `usePlaylistActions.adjustSongEqWithGemini` already sends `MsgType.AdjustSongEqWithGemini` to the background service worker and normalizes the response.
- `SongEditor` owns the Edit Song modal tabs and currently applies EQ changes to the unsaved form via React Hook Form.

## Chosen Approach

Reuse the existing Gemini song EQ request/review helper in `SongEditor` rather than creating a second request pipeline.

The EQ tab will add a compact Gemini adjustment control near the profile selector:

- an optional textarea for the user's EQ preference
- a Generate button
- a status/reason message

When Gemini returns a valid suggestion, the suggested band values are written into the Edit Song form values and marked dirty/touched. The user can then tweak the sliders and press the modal's existing Save button. Gemini does not auto-save the playlist item.

## Data Flow

1. `Playlist` passes `audioEqProfiles` and `adjustSongEqWithGemini` into `InfoModal`.
2. `InfoModal` passes those props into `SongEditor`.
3. `SongEditor` builds a Gemini request with:
   - the current song context
   - existing EQ profiles
   - the optional user request text
   - the song's current EQ state
4. On success, `SongEditor` writes each suggested EQ band into the form with `setValue`.
5. The existing `InfoModal` save path persists the form's EQ values.

## Error Handling

- If no song is loaded, the Generate action does nothing.
- While a request is loading, the Generate button is disabled.
- Missing API key and request failures show the normalized response message.
- If the modal closes or switches songs while a request is in flight, stale responses are ignored.

## Testing

Add focused source-level tests around `SongEditor`/`InfoModal` wiring and reuse existing tests for `selectionActionsGeminiEqReview.ts`, `geminiSongEqResponse.ts`, and background Gemini song EQ parsing. Run the project test/build commands before completion.
