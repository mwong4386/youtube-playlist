# Gemini Guide: YouTube Playlist Extension

This is a Chrome extension for managing custom YouTube playlists with precise control over start/end times, volume, and playback modes.

## Core Mandates

- **Storage Strategy:**
  - `chrome.storage.sync`: Persistent user data (e.g., `youtube_list` for playlist items).
  - `chrome.storage.local`: Ephemeral session/playback state (e.g., `playbackState`, `tabId`, `isPlaying`).
  - `window.localStorage`: Popup-only UI state (e.g., dismissed banner snapshots).
- **Messaging Model:** All cross-component communication MUST use the enums in `src/constants/msgType.ts` and `src/constants/csMsgType.ts`.
- **YouTube Coupling:** The extension is tightly coupled to YouTube's DOM. All selectors must be centralized in `src/contentScript/youtubeDom.ts`.
- **UI/UX Consistency:**
  - Use the "layered sheet" style for the popup.
  - Headers are fixed; content below uses `margin-top: 42px` in a scrollable container.
  - Use `ActionSheet` and `Modal` components for menus and forms.
  - Destructive actions use soft red text; positive actions use success green.

## Architecture & Key Components

- **Background Script (`src/background/index.ts`):** Central orchestrator for playback logic and state management.
- **Content Script (`src/contentScript/index.ts`):** Manages YouTube DOM interaction, bookmarking UI, and player control.
- **Popup UI (`src/App.tsx`, `src/screens/playlist/*`):** React-based management interface for the playlist.
- **Data Model (`src/models/MPlaylistItem.ts`):** Defines the `MPlaylistItem` structure used in storage.

## Development Workflow

- **Build:** `npm run build` (Vite-based). Artifacts go to `build/`.
- **Validation:** 
  - Run `npm run build` after any code or documentation changes.
  - Use the `playwright-wrapper` MCP for browser testing when available.
- **Testing:** Add tests for playlist transforms and playback sequencing in `src/**/*.spec.ts`.
- **Subagents:** Default to `subagent_driven_development` for multi-step tasks.

## Critical Files

- `AGENTS.md`: Detailed developer guide and architectural overview.
- `CHECKLIST.md`: Current project status and pending features.
- `doc/playback-state-machine.md`: Documentation for the background state machine.
- `src/constants/msgType.ts` & `csMsgType.ts`: Communication protocols.

## Important Constraints

- Item creation appends records; it does not currently deduplicate by `videoId` unless explicitly requested.
- State is restored from `chrome.storage.local` on background script startup.
- Assume a single controlled YouTube tab at a time.
- Popup height is limited; keep new UI elements within the scrollable area.
