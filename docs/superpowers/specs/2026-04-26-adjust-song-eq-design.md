# Adjust Song EQ Capability Design

## Purpose

Add a review-first Gemini capability that suggests EQ changes for one explicit song selected by the user. This extends the existing capability pattern used by `create-eq-profile` while keeping Gemini unable to mutate playlist data directly.

The design should be ready for a future conversation input over the app. Current UI integration should stay thin and should avoid coupling the capability to a specific screen layout.

## User Flow

1. The user selects exactly one song with the playlist checkbox selection.
2. The app offers a Gemini EQ adjustment action for that selected song.
3. The user provides a free-text request, such as "make this less harsh" or "match my vocal profile taste".
4. The app sends Gemini only approved context for that one selected song.
5. Gemini returns one `adjustSongEq` proposal for the same song id.
6. The app validates and normalizes the proposal.
7. The user reviews the suggested EQ and reason.
8. The user explicitly confirms.
9. Existing playlist update/save logic writes the EQ.

If no song is selected, there is no target. If more than one song is selected, this first version blocks the action and asks the user to select one song.

## Capability Contract

Add a new Gemini capability:

- Capability name: `adjust-song-eq`
- Function name: `adjustSongEq`
- Allowed context:
  - `eqBandContract`
  - `currentSong`
  - `existingEqProfiles`

The app chooses the target song before calling Gemini. Gemini must not choose, search, or infer another song target.

The user request shape includes:

- `userRequest`: trimmed free-text user intent.
- `songContext`: the selected song id, title, channel name, video id, url, and current normalized `audioEq`.
- `existingProfiles`: user EQ profiles with only profile name and normalized `audioEq`.

The successful function return shape includes:

- `songId`: must match the selected song id.
- `audioEq`: complete EQ bands from `-10` to `10`.
- `reason`: short explanation for review.

## Approved Context Boundary

Gemini may receive:

- EQ band minimum, maximum, and required band keys.
- The selected song's identity and current EQ.
- User EQ profile names and EQ bands as taste reference.
- The user's request text.

Gemini must not receive:

- The Gemini API key.
- Arbitrary playlist state.
- Other song list contents.
- Chrome runtime details.
- Storage payloads.

The existing profiles are included only as taste references. They do not authorize Gemini to create, update, delete, or select profiles.

## Background Flow

Add a background helper parallel to `src/background/geminiEqProfiles.ts`.

Responsibilities:

- Build the constrained Gemini request body for `adjust-song-eq`.
- Declare the `adjustSongEq` function.
- Parse Gemini function-call responses.
- Parse JSON-text fallback responses when needed.
- Reject malformed responses.
- Reject wrong function names.
- Reject missing, incomplete, or non-finite EQ bands.
- Reject responses where `songId` does not match the selected song id.
- Normalize EQ values with the existing EQ utilities before returning success.

The background runtime handler mirrors the existing `GenerateEqProfileWithGemini` handling: check API key, validate request basics, send the constrained Gemini request, parse the response, and return a typed success or failure object.

## Popup Runtime Boundary

Add a popup-side normalizer parallel to `src/screens/gemini/geminiEqProfileResponse.ts`.

Responsibilities:

- Treat raw Chrome/Gemini payloads as `unknown`.
- Convert runtime errors into typed failures.
- Validate success payload shape.
- Require matching `songId`.
- Require complete finite EQ bands.
- Normalize EQ values before UI use.

UI code consumes only the normalized response type.

## UI Integration

Do not design the future conversation overlay yet.

For this slice, add only the minimum UI needed to invoke and review the capability from selected-song context. The selection action is available only when exactly one playlist item is selected, or it presents a clear "select one song" message when the selection count is not one.

The review surface displays:

- The selected song title.
- Gemini's short reason.
- The proposed EQ values or diffs.
- A confirm action that applies the suggestion through existing playlist update/save logic.
- A dismiss/cancel action.

The suggestion must not write to storage until the user confirms.

## Testing

Add focused tests for:

- `GeminiActions` exposes `adjust-song-eq` and `adjustSongEq`.
- The background request builder includes only approved context.
- User EQ profiles are normalized and included as taste references.
- The parser accepts Gemini function-call responses.
- The parser accepts JSON-text fallback responses.
- The parser rejects wrong function names.
- The parser rejects song id mismatches.
- The parser rejects malformed or incomplete EQ.
- The popup normalizer rejects unsafe raw payloads.
- The selected-song UI/action path blocks zero or multiple selected songs.
- Confirming a suggestion uses existing playlist update/save logic instead of Gemini mutating storage directly.

## Non-Goals

- Batch EQ adjustment for multiple selected songs.
- Final conversation overlay design.
- Gemini choosing a target song.
- Gemini mutating storage directly.
- Sending full playlist or arbitrary app state to Gemini.
- Creating or editing EQ profiles as part of this capability.

