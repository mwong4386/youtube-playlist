# Gemini Song Boundary Detection Design

## Summary

Add a Gemini-powered `Analyze` action to the existing song edit modal so users can request suggested start and stop times for a saved YouTube song. The extension stores the Gemini API key privately in `chrome.storage.local`, sends the Gemini request from the background service worker, and fills the modal's start and end time inputs with the suggested values when the request succeeds.

The feature does not auto-save playlist changes. Gemini suggestions are treated as editable draft values inside the modal, and the song is only updated after the user clicks the existing `Save` button.

## Goals

- Let users save a Gemini API key in extension settings without exposing it to websites or content scripts.
- Add an `Analyze` action to the existing song edit modal.
- Send Gemini requests from the background service worker instead of the popup UI.
- Fill the modal's start and end time inputs with suggested timestamps after a successful analysis.
- Preserve the current edit workflow so users can review and adjust Gemini suggestions before saving.

## Non-Goals

- Automatically analyzing songs when playback starts.
- Automatically overwriting saved playlist item timestamps.
- Hosting a backend service for Gemini requests.
- Passing the Gemini API key to the YouTube page or content script.
- Detecting timestamps directly from raw audio in the extension.

## UX Design

### Settings

The popup settings modal gets a new Gemini section with:

- an API key input
- a save/update action
- a remove key action
- a short note that the key is stored locally on this browser only

The key is stored in `chrome.storage.local`, not `chrome.storage.sync`, so it stays private to the current extension install and is not synced across browsers.

The settings UI does not display the full saved key after it has been stored. It should either mask the value or show an "API key saved" state so the user can tell whether Gemini is configured without exposing the full secret in the popup.

### Song Edit Modal

The existing `InfoModal` gets a new `Analyze` button near the start and end time controls.

Behavior:

- Clicking `Analyze` requests timestamp suggestions for the current song.
- While the request is in progress, the button is disabled and shows a loading state.
- The modal keeps all current form values while loading.
- On success, the modal updates the start time and end time input boxes with the suggested values.
- The modal shows a short success note such as `Suggested timestamps loaded`.
- The user can still edit the filled values manually.
- The song is only persisted when the user clicks `Save`.

### Failure States

If analysis fails, the modal keeps the current form values unchanged and shows a compact error message.

Expected failure cases:

- Gemini API key is missing
- Gemini request fails
- Gemini response cannot be parsed
- Gemini returns invalid timestamps
- Gemini cannot determine a clear start and stop range

## Architecture

### Popup Responsibilities

The popup owns the settings UI and the song edit modal UI.

It is responsible for:

- saving and removing the Gemini API key through the extension APIs
- sending an analyze request for a selected playlist item
- showing loading, success, and error states in the modal
- applying valid Gemini suggestions into the form state without persisting them yet

The popup must never receive or store the raw API key in React component state longer than needed to submit the settings form.

### Background Responsibilities

The background service worker owns the Gemini network request.

It is responsible for:

- loading the Gemini API key from `chrome.storage.local`
- loading the selected playlist item from storage
- constructing the Gemini prompt from known playlist metadata
- issuing the request to Gemini
- parsing the structured Gemini response
- validating and normalizing the suggested timestamps
- returning either a suggestion payload or an error payload to the popup

The background script does not update the playlist item automatically after analysis. It only returns a validated suggestion.

## Data Flow

1. The user opens the existing song edit modal for a playlist item.
2. The user clicks `Analyze`.
3. The popup sends a new runtime message to the background script with the playlist item ID.
4. The background script loads:
   - the Gemini API key from `chrome.storage.local`
   - the current playlist item from `chrome.storage.sync`
5. The background script sends a Gemini request using the item's available metadata:
   - title
   - channel name
   - YouTube URL
   - video ID
   - max duration
   - current saved start and end timestamps
6. Gemini returns structured candidate timestamps.
7. The background script validates and normalizes the timestamps.
8. The background script replies to the popup with either:
   - `{ startTimestamp, endTimestamp }`
   - or an error code and message
9. The popup updates the modal form values if the response is successful.
10. The user reviews the suggestion and clicks `Save` to persist changes through the existing save flow.

## Gemini Request Design

The extension should request a structured response that contains numeric timestamp fields rather than free-form prose.

Expected response shape:

```ts
type GeminiSongBoundarySuggestion = {
  startTimestamp: number;
  endTimestamp?: number;
};
```

Prompt requirements:

- ask Gemini to identify the most likely musical start point and stop point for the saved song
- tell Gemini to return seconds as numbers
- tell Gemini not to include explanation text in the structured output
- include the known video duration so Gemini does not suggest timestamps outside the playable range
- allow `endTimestamp` to be omitted when Gemini believes the song should play until the end

The parsing layer should be isolated behind a helper so the background script does not mix request transport, parsing, and validation concerns in one block.

## Validation And Normalization

Suggested timestamps must be validated before the popup applies them.

Rules:

- `startTimestamp` must be a finite number
- `startTimestamp` must be greater than or equal to `0`
- `startTimestamp` must be less than `maxDuration`
- if present, `endTimestamp` must be a finite number
- if present, `endTimestamp` must be greater than `startTimestamp`
- if present, `endTimestamp` must be less than or equal to `maxDuration`

Normalization behavior:

- round or floor fractional Gemini values to whole seconds before applying them
- reject invalid values instead of silently saving broken timestamps
- keep `endTimestamp` as `undefined` when Gemini explicitly indicates "until end"

## Storage

New local-storage key:

- `geminiApiKey`

Storage rules:

- store the API key only in `chrome.storage.local`
- never copy the key into `chrome.storage.sync`
- never send the key to the content script
- never inject the key into the YouTube page

No playlist item schema change is required for this feature because the existing `timestamp` and `endTimestamp` fields already hold the saved values.

## Messaging Changes

Add a new popup-to-background message for requesting analysis of one saved playlist item.

The message payload should contain the playlist item ID rather than the entire key or any secret settings.

Optionally add a typed response helper or response shape for:

- success with suggested timestamps
- failure with a machine-readable error code and user-facing message

## Component Changes

### Settings Modal

Extend the existing settings modal with Gemini API key management.

Responsibilities:

- input for the key
- save/update action
- remove key action
- saved-state feedback

### Playlist Screen

`Playlist` becomes responsible for passing analyze handlers into the edit modal and for coordinating any popup-level state needed to support the request lifecycle.

### Song Edit Modal

`InfoModal` gets:

- an `Analyze` button
- loading state
- success state
- error state
- logic to map returned seconds into the existing hour, minute, and second fields

The modal should update only its own form state when analysis succeeds. It must not call the existing `save` callback automatically.

### Background Script

Add a Gemini integration path in the background script or a small dedicated helper module under `src/background/` for:

- request construction
- network call
- response parsing
- timestamp validation

Keeping Gemini logic in a dedicated helper is preferred so the main background file stays readable.

## Error Handling

- If no API key is configured, return a specific error so the modal can prompt the user to add one in settings.
- If the playlist item cannot be found, return a not-found error and leave the modal unchanged.
- If the network request fails, return a request-failed error and leave the modal unchanged.
- If Gemini returns malformed data, return an invalid-response error and leave the modal unchanged.
- If Gemini returns timestamps outside the valid range, return an invalid-timestamps error and leave the modal unchanged.
- If the user closes the modal while analysis is in progress, ignore the eventual response instead of mutating closed UI state.

## Testing

Add focused tests for:

- validating accepted and rejected Gemini timestamp payloads
- converting Gemini timestamp suggestions into modal form values
- background behavior when the API key is missing
- background behavior when the playlist item is missing
- popup/modal behavior that fills fields on success without auto-saving
- preserving existing modal input values when analysis fails

Manual verification targets:

- save a Gemini API key in settings and confirm it persists locally
- remove the Gemini API key and confirm analyze now shows a missing-key error
- open a song in the edit modal and click `Analyze`
- confirm the analyze button shows a loading state during the request
- confirm successful suggestions fill the start and end time input boxes
- edit the suggested values manually and click `Save`
- reopen the song and confirm only the saved values persist
- trigger an error response and confirm the existing form values remain unchanged

## Implementation Notes

- Follow the existing popup modal styling and control language rather than introducing a new analysis screen.
- Prefer a small Gemini helper module plus tests instead of placing fetch and parsing logic directly in the background message handler.
- Keep the API key device-local by default because the user explicitly wants it stored somewhere websites and other extensions cannot read.
