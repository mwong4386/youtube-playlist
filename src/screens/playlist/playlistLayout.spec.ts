import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const playlistStyles = readFileSync(
  join(process.cwd(), "src/screens/playlist/Playlist.module.css"),
  "utf8"
);
const playlistSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/Playlist.tsx"),
  "utf8"
);
const playlistHeaderSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistHeader.tsx"),
  "utf8"
);
const playlistItemSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistItem.tsx"),
  "utf8"
);

test("playlist container only shows vertical scrollbar when content overflows", () => {
  const match = playlistStyles.match(
    /\.playlist-container\s*\{[^}]*overflow-y:\s*([^;]+);/
  );

  expectEqual(match?.[1].trim(), "auto");
});

test("playlist layout uses a flex content column so the banner does not steal list height", () => {
  expectEqual(playlistStyles.includes(".content-container"), true);
  expectEqual(playlistStyles.includes("display: flex;"), true);
  expectEqual(playlistStyles.includes("flex-direction: column;"), true);
  expectEqual(playlistStyles.includes("flex: 1;"), true);
  expectEqual(playlistSource.includes('className={styles["content-container"]}'), true);
});

test("playlist source renders the analysis banner inside the scrollable playlist flow", () => {
  const playlistContainerIndex = playlistSource.indexOf(
    'className={styles["playlist-container"]}'
  );
  const analyzeBannerIndex = playlistSource.indexOf(
    'className={styles["analyze-import-banner-container"]}'
  );

  expectEqual(playlistContainerIndex >= 0, true);
  expectEqual(analyzeBannerIndex > playlistContainerIndex, true);
});

test("playlist selection mode uses shared helpers and disables dragging", () => {
  expectEqual(
    playlistSource.includes('from "./playlistSelection"'),
    true
  );
  expectEqual(
    playlistSource.includes("const [selectedItemIds, setSelectedItemIds]"),
    true
  );
  expectEqual(
    playlistSource.includes("getPlaylistHeaderMode(selectedItemIds)"),
    true
  );
  expectEqual(
    playlistSource.includes("headerMode === \"selection\""),
    true
  );
});

test("playlist header source includes selection mode action plumbing", () => {
  expectEqual(playlistHeaderSource.includes("selectedCount"), true);
  expectEqual(playlistHeaderSource.includes("onClearSelection"), true);
  expectEqual(playlistHeaderSource.includes("onToggleSelectAll"), true);
  expectEqual(playlistHeaderSource.includes("onOpenSelectionActions"), true);
  expectEqual(playlistHeaderSource.includes('type="checkbox"'), true);
  expectEqual(playlistHeaderSource.includes("selection-header-home-button"), true);
  expectEqual(playlistHeaderSource.includes("selection-header-home-icon"), true);
  expectEqual(playlistHeaderSource.includes("Actions"), true);
  expectEqual(playlistHeaderSource.includes("tone: \"danger\""), true);
});

test("playlist source includes selected-song action modal wiring", () => {
  expectEqual(playlistSource.includes("selectionActionsModalActive"), true);
  expectEqual(playlistSource.includes("Analyze Timing"), true);
  expectEqual(playlistSource.includes("Delete Songs"), true);
  expectEqual(playlistSource.includes("Selected songs"), false);
  expectEqual(
    playlistSource.includes("itemIds: selectedItemIds"),
    true
  );
  expectEqual(
    playlistSource.includes("deleteSelectedPlaylistItems(playlist, selectedItemIds)"),
    true
  );
});

test("playlist import success path does not auto-start analysis", () => {
  expectEqual(playlistSource.includes("shouldStartAnalyzeAfterImport"), false);
});

test("playlist item source renders a checkbox for selection mode", () => {
  expectEqual(playlistItemSource.includes('type="checkbox"'), true);
  expectEqual(playlistItemSource.includes("checked={selected}"), true);
  expectEqual(playlistItemSource.includes("onToggleSelected"), true);
});

test("playlist styles include selection header and checkbox classes", () => {
  expectEqual(playlistStyles.includes(".selection-header-button"), true);
  expectEqual(playlistStyles.includes(".selection-header-action-button"), true);
  expectEqual(playlistStyles.includes(".selection-header-home-button"), true);
  expectEqual(playlistStyles.includes(".selection-header-home-icon"), true);
  expectEqual(playlistStyles.includes(".selection-header-checkbox"), true);
  expectEqual(playlistStyles.includes(".selection-count"), true);
  expectEqual(playlistStyles.includes(".playlist-item-checkbox"), true);
  expectEqual(playlistStyles.includes(".selection-actions-modal"), true);
  expectEqual(playlistStyles.includes(".header-center-container"), true);
  expectEqual(playlistHeaderSource.includes("selection-header-home-button"), true);
  expectEqual(playlistHeaderSource.includes("selection-header-action-button"), true);
  expectEqual(playlistStyles.includes("margin-left: 10px;"), true);
  expectEqual(playlistStyles.includes("width: 28px;"), true);
  expectEqual(playlistStyles.includes("padding: 0 0 16px;"), true);
  expectEqual(playlistStyles.includes("border-top: 1px solid var(--border-color);"), true);
  expectEqual(playlistStyles.includes("background-color: var(--surface-secondary);"), true);
});
