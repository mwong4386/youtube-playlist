# Agent Guide

## Project Summary

This is a Chrome extension for saving a custom YouTube playlist and replaying each saved video with:

- a custom start timestamp
- an optional end timestamp
- a per-item volume level
- sequential or random playback
- popup-based playlist management

The codebase is built with React + TypeScript and packaged as a Manifest V3 extension.

## App Structure

- `public/manifest.json`
  Defines the extension entry points, permissions, background service worker, and YouTube content script.
- `src/App.tsx`
  Popup root. Renders the playlist management UI.
- `src/screens/playlist/*`
  Main popup UI for viewing, reordering, importing/exporting, deleting, and editing playlist items.
- `src/screens/modal/InfoModal.tsx`
  Edit form for a playlist item's start time, end time, and volume.
- `src/background/index.ts`
  Central playback coordinator. Tracks currently playing tab/item and responds to popup/content-script messages.
- `src/contentScript/index.ts`
  Runs on YouTube pages. Injects the bookmark dialog and player controls, reads page metadata, and controls the active video element.
- `src/utils/syncStorage.ts`
  Thin wrapper around `chrome.storage.sync`.

## Popup Design Language

- The popup uses a dark, layered sheet style with a fixed top header and a scrollable content region underneath.
- The main playlist header is always fixed at the top of the popup. Content below it should usually live inside a flex column with `margin-top: 42px` and a scrollable body so banners or helper panels do not hide playlist rows.
- Menu-style surfaces use flat full-width rows separated by subtle borders instead of isolated card buttons.
- Status callouts, such as import-analysis progress, can use softer tinted panels inside the scroll flow rather than fixed overlays above it.
- Destructive actions use a softer red text treatment instead of bright alert blocks unless the flow is a real destructive confirmation.
- Positive or forward actions can use the success green accent, but should still preserve the existing restrained sheet styling.

## Data Model

Playlist items are stored in `chrome.storage.sync` under the key `youtube_list`.

Interface:

```ts
interface MPlaylistItem {
  id: string;
  title: string;
  channelName: string;
  url: string;
  videoId: string;
  timestamp: number;
  endTimestamp: number | undefined;
  maxDuration: number;
  volume: number;
}
```

Notes:

- `timestamp` is the start time in seconds.
- `endTimestamp === undefined` means "play until the end".
- `volume` is stored as `0-100`.
- Runtime playback state is stored separately in `chrome.storage.local`.

## Main Runtime Flow

### 1. Saving a video from YouTube

- The content script injects a `+` button into the YouTube player controls.
- Clicking it opens an extension-owned dialog from `public/dialog.html`.
- The dialog captures:
  - title
  - channel name
  - start time
  - optional end time
  - volume
- Saving appends a new item to `chrome.storage.sync.youtube_list`.

Relevant code:

- `src/contentScript/index.ts`

### 2. Managing the playlist in the popup

- The popup reads `youtube_list` from sync storage.
- Users can:
  - play one item
  - play all in order
  - play all randomly
  - pause playback
  - reorder items by drag and drop
  - edit timestamps/volume
  - import/export JSON
  - delete one item or all items

Relevant code:

- `src/screens/playlist/Playlist.tsx`
- `src/screens/playlist/PlaylistHeader.tsx`
- `src/screens/playlist/PlaylistItem.tsx`
- `src/screens/modal/InfoModal.tsx`

Current popup interaction patterns:

- The default header exposes play/menu actions.
- When one or more songs are selected, the header switches into selection mode with:
  - a left-side clear-selection `×`
  - a selected-count label
  - a right-side green `Actions` trigger
- The selection actions open in a bottom sheet and currently include analyze timing, delete songs, and cancel.
- The main settings/menu also opens as a bottom sheet and includes the theme segmented control, playlist import/export actions, Gemini/EQ settings, and a danger-toned `Delete All` row.
- Import-analysis progress is surfaced as a dismissible banner inside the playlist scroll area so it does not permanently reduce visible list height.

### 3. Playback orchestration

- The background service worker owns the current playback state.
- It tracks:
  - the active YouTube tab
  - whether playback is active
  - whether "play all" is enabled
  - random mode
  - current playlist item
  - picture-in-picture state
  - volume-adjust behavior
- When a video ends or reaches the saved `endTimestamp`, the content script notifies the background script.
- The background script then loads the next item if "play all" is enabled.

Relevant code:

- `src/background/index.ts`

## Messaging Model

Two enums are used for communication:

- `src/constants/msgType.ts`
  Messages sent between popup/content script and background.
- `src/constants/csMsgType.ts`
  Messages sent from background to content script.

When adding a new feature that crosses popup/background/content-script boundaries:

1. Add a new enum value.
2. Update the sender.
3. Update the receiver.
4. Decide whether the state belongs in `chrome.storage.sync` or `chrome.storage.local`.

## Storage Rules

- Use `chrome.storage.sync` for saved playlist data that should persist as user content.
- Use `chrome.storage.local` for ephemeral playback/session state.

Current keys:

- Sync:
  - `youtube_list`
- Local:
  - `playbackState`
  - `tabId`
  - `playingItem`
  - `isPlaying`
  - `isPlayAll`
  - `isPIP`
  - `isRandom`
  - `enableAdjustVideoVolume`
  - `gemini_api_key`
  - `analyzeImportBatchState`

Additional popup-only UI state:

- The popup uses `window.localStorage` for the dismissed import-analysis banner snapshot key so a stuck banner can stay hidden without mutating the underlying batch state.

## Build Notes

- Main build command: `npm run build`
- The project uses Vite with separate configs for the popup, background script, and content script.
- Built extension artifacts are emitted into `build/`.
- Existing test coverage appears minimal.
- After finishing any code or documentation change, run `npm run build` before reporting completion.

## Browser Validation

- This repo includes a restricted browser-testing wrapper MCP at `tools/playwright-wrapper-mcp/`.
- When browser validation is useful, prefer the `playwright-wrapper` MCP over any raw Playwright server.
- The wrapper is intended to launch Brave with a disposable profile, load this extension from `build/`, and stay limited to YouTube pages plus `chrome-extension://*`.
- If the wrapper is unavailable in the current session, explain that clearly instead of silently falling back to broader browser access.

## Important Constraints

- This extension is tightly coupled to YouTube's DOM structure and class names.
- Content-script behavior may break if YouTube changes its markup.
- The background service worker restores state from `chrome.storage.local` on startup.
- Some logic assumes a single active controlled YouTube tab.
- Item creation currently always appends a new record; it does not deduplicate by `videoId`.
- Popup layout is height-sensitive. If you add banners, helper rows, or new panels near the top of the popup, prefer putting them inside the scrollable content area instead of above it.
- Reuse the action-sheet and modal patterns before inventing new popup surfaces; the UI now depends on those shared sheet styles for consistency.
- Keep reusable SVG icons as small components in `src/screens/icons/`, one icon per file. Export all icons from `src/screens/icons/index.ts`. Feature components should import those icon components instead of embedding SVG markup inline. Icons should default to `currentColor` and rely on parent CSS for sizing. Content-script DOM-string icons live in `src/contentScript/icons.ts`, not in React screen components.

## Good Places To Add Features

- Add playlist metadata or settings:
  - popup UI in `src/screens/playlist/*`
  - persistence in `chrome.storage.sync`
- Add playback behaviors:
  - background logic in `src/background/index.ts`
  - content-script execution in `src/contentScript/index.ts`
- Add new saved fields per item:
  - `src/models/MPlaylistItem.ts`
  - save flow in `src/contentScript/index.ts`
  - edit flow in `src/screens/modal/InfoModal.tsx`
  - any import/export assumptions in `src/screens/playlist/PlaylistHeader.tsx`

## Improvement Checklist

The active checklist now lives in `CHECKLIST.md` so feature planning stays separate from the agent guide.

## Working Assumptions For Future Agents

- The real project root is this folder, not the parent directory.
- Favor small, targeted changes because the app relies on message passing and shared storage state.
- Verify feature changes across popup, background, and content script together when the feature touches playback.
- For popup UI work, inspect `Playlist.module.css`, `PlaylistHeader.tsx`, `ActionSheet.module.css`, and `Modal.module.css` before inventing new patterns; most current visual rules live there.
- When changing action labels or selection flows, check both the fixed header and the bottom-sheet actions because they intentionally mirror each other.

## User Preferences

- When offering the execution choice between `1. Subagent-Driven` and `2. Inline Execution`, default to `1. Subagent-Driven` unless the user explicitly says otherwise.

## Workspace Boundary

- Only read, write, or search inside this project folder unless the user explicitly asks for work outside it.
- If work outside the project folder is truly necessary, ask the user in plain text first and explain why it is needed before taking any action.
- Do not run broad home-directory or system-wide searches to discover config files or app settings without explicit user permission.
