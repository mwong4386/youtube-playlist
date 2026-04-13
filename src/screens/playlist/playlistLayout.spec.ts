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
const playlistImportModalSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistImportModal.tsx"),
  "utf8"
);
const playlistImportModalStyles = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistImportModal.module.css"),
  "utf8"
);
const newSongListModalSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/NewSongListModal.tsx"),
  "utf8"
);
const playlistItemSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistItem.tsx"),
  "utf8"
);
const actionSheetItemSource = readFileSync(
  join(process.cwd(), "src/screens/actionSheet/ActionSheetItem.tsx"),
  "utf8"
);
const actionSheetStyles = readFileSync(
  join(process.cwd(), "src/screens/actionSheet/ActionSheet.module.css"),
  "utf8"
);
const actionSheetModelSource = readFileSync(
  join(process.cwd(), "src/models/MActionSheetItem.ts"),
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

test("playlist header source routes song list management through a selector row and dedicated sheet", () => {
  expectEqual(playlistHeaderSource.includes("activeSongListName"), true);
  expectEqual(playlistHeaderSource.includes("onSelectSongList"), true);
  expectEqual(playlistHeaderSource.includes("onOpenNewSongListModal"), true);
  expectEqual(playlistHeaderSource.includes("buildSongListMenuItems"), true);
  expectEqual(playlistHeaderSource.includes("buildSongListSheetRows"), true);
  expectEqual(playlistHeaderSource.includes("editingSongListName"), true);
  expectEqual(playlistHeaderSource.includes("(Current List)"), false);
  expectEqual(playlistHeaderSource.includes("Object.keys(songLists).map"), false);
  expectEqual(playlistHeaderSource.includes("header-song-list-button"), false);
  expectEqual(playlistHeaderSource.includes("header-new-list-button"), false);
});

test("playlist header source no longer exposes player pin actions", () => {
  expectEqual(playlistHeaderSource.includes("player pin"), false);
  expectEqual(playlistHeaderSource.includes("TogglePin"), false);
});

test("action sheet source supports custom song list rows and inline rename icons", () => {
  expectEqual(actionSheetItemSource.includes("song-list-row"), true);
  expectEqual(actionSheetItemSource.includes("song-list-inline-edit"), true);
  expectEqual(actionSheetItemSource.includes("song-list-selector"), true);
  expectEqual(actionSheetItemSource.includes("trailingIcon"), true);
  expectEqual(actionSheetItemSource.includes("saveIcon"), true);
  expectEqual(actionSheetItemSource.includes("cancelIcon"), true);
  expectEqual(actionSheetModelSource.includes("song-list-selector"), true);
  expectEqual(actionSheetModelSource.includes("song-list-inline-edit"), true);
  expectEqual(actionSheetModelSource.includes("shouldCloseOnClick"), true);
});

test("song list selector row uses centered label layout instead of generic left-aligned menu layout", () => {
  expectEqual(actionSheetItemSource.includes("selector-row"), true);
  expectEqual(actionSheetItemSource.includes("selector-label"), true);
  expectEqual(actionSheetStyles.includes(".selector-row"), true);
  expectEqual(actionSheetStyles.includes("justify-content: center;"), true);
  expectEqual(actionSheetStyles.includes(".selector-chevron"), true);
});

test("plain action sheet rows keep centered labels for regular menu items", () => {
  expectEqual(actionSheetItemSource.includes("action-row"), true);
  expectEqual(actionSheetStyles.includes(".action-row"), true);
  expectEqual(actionSheetStyles.includes(".action-row .row-copy"), true);
  expectEqual(actionSheetStyles.includes("justify-content: center;"), true);
});

test("song list item rows use an explicit flex row container for title and edit button", () => {
  expectEqual(actionSheetItemSource.includes("song-list-row-container"), true);
  expectEqual(actionSheetStyles.includes(".song-list-row-container"), true);
  expectEqual(actionSheetStyles.includes("display: flex;"), true);
  expectEqual(actionSheetStyles.includes("justify-content: space-between;"), true);
  expectEqual(actionSheetStyles.includes("align-items: center;"), true);
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

test("playlist source initializes and syncs visible playlist from named song-list storage", () => {
  expectEqual(playlistSource.includes("SONG_LISTS_STORAGE_KEY"), true);
  expectEqual(
    playlistSource.includes("ACTIVE_SONG_LIST_NAME_STORAGE_KEY"),
    true
  );
  expectEqual(playlistSource.includes("getStorageMap("), true);
  expectEqual(playlistSource.includes("normalizeSongListsState("), true);
  expectEqual(
    playlistSource.includes("const [songListsState, setSongListsState]"),
    true
  );
  expectEqual(
    playlistSource.includes("const [activeSongListName, setActiveSongListName]"),
    true
  );
  expectEqual(
    playlistSource.includes("getVisiblePlaylistForActiveList("),
    true
  );
  expectEqual(
    playlistSource.includes("chrome.storage.onChanged.addListener(listener)"),
    true
  );
  expectEqual(
    playlistSource.includes("SONG_LISTS_STORAGE_KEY in changes"),
    true
  );
  expectEqual(
    playlistSource.includes("ACTIVE_SONG_LIST_NAME_STORAGE_KEY in changes"),
    true
  );
});

test("playlist source writes active-list updates through named song-list helpers", () => {
  expectEqual(
    playlistSource.includes("updateActiveSongListItems(songListsState"),
    true
  );
  expectEqual(
    playlistSource.includes("[SONG_LISTS_STORAGE_KEY]: nextSongListsState.songLists"),
    true
  );
  expectEqual(
    playlistSource.includes(
      "[ACTIVE_SONG_LIST_NAME_STORAGE_KEY]: nextSongListsState.activeSongListName"
    ),
    true
  );
  expectEqual(
    playlistSource.includes("youtube_list: playlist"),
    false
  );
  expectEqual(
    playlistSource.includes("youtube_list: temp"),
    false
  );
  expectEqual(
    playlistSource.includes("youtube_list: deleteSelectedPlaylistItems(playlist, selectedItemIds)"),
    false
  );
});

test("playlist import and delete-all source route through the active song list", () => {
  expectEqual(
    playlistHeaderSource.includes("description: \"Import Playlist\""),
    true
  );
  expectEqual(
    playlistHeaderSource.includes("description: \"Import from YouTube Playlist\""),
    false
  );
  expectEqual(
    playlistHeaderSource.includes("description: \"Import Playlist JSON\""),
    false
  );
  expectEqual(
    playlistHeaderSource.includes("onOpenImportModal: () => void;"),
    true
  );
  expectEqual(
    playlistImportModalSource.includes("onImportJson: (playlist: MPlaylistItem[]) => void;"),
    true
  );
  expectEqual(
    playlistImportModalSource.includes("const fileInputRef = useRef<HTMLInputElement | null>(null);"),
    true
  );
  expectEqual(
    playlistImportModalSource.includes("parseImportedPlaylist(content)"),
    true
  );
  expectEqual(
    playlistImportModalSource.includes("onImportJson(importedPlaylist);"),
    true
  );
  expectEqual(
    playlistImportModalSource.includes("Import from YouTube playlist"),
    true
  );
  expectEqual(
    playlistImportModalSource.includes("Import playlist JSON"),
    true
  );
  expectEqual(
    playlistImportModalSource.includes("Choose JSON file"),
    true
  );
  expectEqual(
    playlistImportModalStyles.includes(".importSection"),
    true
  );
  expectEqual(
    playlistSource.includes("const onImportJson = (importedPlaylist: typeof playlist) => {"),
    true
  );
  expectEqual(
    playlistSource.includes("persistActiveSongListItems(importedPlaylist);"),
    true
  );
  expectEqual(
    playlistSource.includes("onImportJson={onImportJson}"),
    true
  );
  expectEqual(
    playlistSource.includes("persistActiveSongListItems([]);"),
    true
  );
});

test("playlist header export source revokes object URLs after download", () => {
  expectEqual(
    playlistHeaderSource.includes("URL.revokeObjectURL(url);"),
    true
  );
  expectEqual(
    playlistHeaderSource.includes("window.setTimeout(revokeUrl, 1000);"),
    true
  );
});

test("playlist source manages new song list modal state and create flow", () => {
  expectEqual(
    playlistSource.includes("const [newSongListModalActive, setNewSongListModalActive]"),
    true
  );
  expectEqual(
    playlistSource.includes("const [newSongListError, setNewSongListError]"),
    true
  );
  expectEqual(playlistSource.includes("getSongListCreationError("), true);
  expectEqual(playlistSource.includes("createSongList(songListsState"), true);
  expectEqual(playlistSource.includes("persistSongListsState(nextSongListsState"), true);
  expectEqual(playlistSource.includes("setNewSongListError(\"\")"), true);
  expectEqual(playlistSource.includes("setNewSongListModalActive(true)"), true);
  expectEqual(playlistSource.includes("setNewSongListModalActive(false)"), true);
  expectEqual(playlistSource.includes("const onRenameSongList ="), true);
  expectEqual(playlistSource.includes("renameSongList("), true);
  expectEqual(playlistSource.includes("<NewSongListModal"), true);
  expectEqual(
    playlistSource.includes("activeSongListName={activeSongListName}"),
    true
  );
  expectEqual(
    playlistSource.includes("onSelectSongList={(name) =>"),
    true
  );
});

test("playlist source guards reorder targets and preserves selection on analyze send failures", () => {
  expectEqual(
    playlistSource.includes("if (newIndex < 0) return;"),
    true
  );
  expectEqual(
    playlistSource.includes("(_response?: unknown) =>"),
    true
  );
  expectEqual(
    playlistSource.includes("if (chrome.runtime.lastError) {"),
    true
  );
  expectEqual(
    playlistSource.includes("clearSelection();"),
    true
  );
  expectEqual(
    playlistSource.includes("closeSelectionActionsModal();"),
    true
  );
  expectEqual(
    playlistSource.includes("name: MsgType.AnalyzeImportedPlaylist"),
    true
  );
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
  expectEqual(playlistStyles.includes(".header-song-list-button"), false);
  expectEqual(playlistStyles.includes(".header-new-list-button"), false);
  expectEqual(playlistStyles.includes(".header-center-actions"), false);
});

test("playlist selection header keeps the centered home button in action mode", () => {
  expectEqual(
    playlistHeaderSource.includes(
      'className={styles["header-center-container"]}'
    ),
    true
  );
  expectEqual(
    playlistHeaderSource.includes("selection-header-home-button"),
    true
  );
  expectEqual(
    playlistHeaderSource.includes("selection-header-action-button"),
    true
  );
});

test("playlist normal header uses a two-button wrapper without an empty center column", () => {
  expectEqual(
    playlistHeaderSource.includes('className={styles["header-left-container"]}'),
    true
  );
  expectEqual(playlistStyles.includes(".normal-header-button"), true);
  expectEqual(
    /\.normal-header-button\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;/s.test(
      playlistStyles
    ),
    true
  );
  expectEqual(
    playlistHeaderSource.includes(
      'className={`${styles["header-button"]} ${styles["normal-header-button"]}`}'
    ),
    true
  );
  expectEqual(
    playlistHeaderSource.includes(
      'className={`${styles["header-left-container"]} ${styles["normal-header-side"]}`}'
    ),
    true
  );
  expectEqual(
    playlistHeaderSource.includes(
      'className={`${styles["header-right-container"]} ${styles["normal-header-side"]}`}'
    ),
    true
  );
});

test("new song list modal source uses shared modal pattern and inline error messaging", () => {
  expectEqual(newSongListModalSource.includes('import Modal from "../modal/Modal"'), true);
  expectEqual(newSongListModalSource.includes("songListName"), true);
  expectEqual(newSongListModalSource.includes("errorMessage"), true);
  expectEqual(newSongListModalSource.includes('role="alert"'), true);
  expectEqual(newSongListModalSource.includes("Create list"), true);
  expectEqual(newSongListModalSource.includes("setSongListName(\"\")"), true);
});
