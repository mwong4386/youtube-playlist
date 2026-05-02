import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const getCssBlock = (source: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(`(^|\\n)${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"),
  );

  return match?.[2] ?? null;
};

const playlistStyles = readFileSync(
  join(process.cwd(), "src/screens/playlist/Playlist.module.css"),
  "utf8",
);
const playlistSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/Playlist.tsx"),
  "utf8",
);
const playlistContentSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistContent.tsx"),
  "utf8",
);
const playlistHeaderSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistHeader.tsx"),
  "utf8",
);
const playlistActionsSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/usePlaylistActions.ts"),
  "utf8",
);
const backgroundSource = readFileSync(
  join(process.cwd(), "src/background/index.ts"),
  "utf8",
);
const msgTypeSource = readFileSync(
  join(process.cwd(), "src/constants/msgType.ts"),
  "utf8",
);
const playlistStorageSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/usePlaylistStorageSync.ts"),
  "utf8",
);
const playlistScreenStateSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/usePlaylistScreenState.ts"),
  "utf8",
);
const playlistImportModalSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistImportModal.tsx"),
  "utf8",
);
const selectionActionsModalSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/SelectionActionsModal.tsx"),
  "utf8",
);
const selectionActionsGeminiEqReviewSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/selectionActionsGeminiEqReview.ts"),
  "utf8",
);
const playlistImportModalStyles = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistImportModal.module.css"),
  "utf8",
);
const newSongListModalSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/NewSongListModal.tsx"),
  "utf8",
);
const playlistItemSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/PlaylistItem.tsx"),
  "utf8",
);
const actionSheetItemSource = readFileSync(
  join(process.cwd(), "src/screens/actionSheet/ActionSheetItem.tsx"),
  "utf8",
);
const actionSheetStyles = readFileSync(
  join(process.cwd(), "src/screens/actionSheet/ActionSheet.module.css"),
  "utf8",
);
const draggableStyles = readFileSync(
  join(process.cwd(), "src/screens/draggable/Draggable.module.css"),
  "utf8",
);
const actionSheetModelSource = readFileSync(
  join(process.cwd(), "src/models/MActionSheetItem.ts"),
  "utf8",
);

test("playlist container only shows vertical scrollbar when content overflows", () => {
  const match = playlistStyles.match(
    /\.playlist-container\s*\{[^}]*overflow-y:\s*([^;]+);/,
  );

  expectEqual(match?.[1].trim(), "auto");
});

test("playlist layout uses a flex content column so the banner does not steal list height", () => {
  expectEqual(playlistStyles.includes(".content-container"), true);
  expectEqual(playlistStyles.includes("display: flex;"), true);
  expectEqual(playlistStyles.includes("flex-direction: column;"), true);
  expectEqual(playlistStyles.includes("flex: 1;"), true);
  expectEqual(
    playlistSource.includes('className={styles["content-container"]}'),
    true,
  );
  expectEqual(playlistSource.includes("<PlaylistHeader"), true);
});

test("playlist header rail uses a flatter paper-dark control surface", () => {
  const headerRail = getCssBlock(playlistStyles, ".header-control-rail");

  expectEqual(headerRail !== null, true);
  expectEqual(headerRail?.includes("border-bottom: 1px solid"), true);
});

test("playlist rows use flatter paper-dark container styling", () => {
  const rowContainer = getCssBlock(playlistStyles, ".playlist-item-container");

  expectEqual(rowContainer !== null, true);
  expectEqual(rowContainer?.includes("border-bottom: 1px solid"), true);
});

test("playlist selected row state is defined for the paper-dark contract", () => {
  const selectedRow = getCssBlock(playlistStyles, ".playlist-item-selected");

  expectEqual(selectedRow !== null, true);
});

test("playlist play button idle state is defined for the paper-dark contract", () => {
  const idleButton = getCssBlock(playlistStyles, ".play-button-idle");

  expectEqual(idleButton !== null, true);
});

test("playlist play button active state is defined for the paper-dark contract", () => {
  const activeButton = getCssBlock(playlistStyles, ".play-button-active");

  expectEqual(activeButton !== null, true);
});

test("playlist paper-dark chrome removes stale glass-era tokens from the header, rows, and play button", () => {
  const headerRail = getCssBlock(playlistStyles, ".header-control-rail");
  const rowContainer = getCssBlock(playlistStyles, ".playlist-item-container");
  const playButton = getCssBlock(playlistStyles, ".play-button");

  expectEqual(headerRail !== null, true);
  expectEqual(rowContainer !== null, true);
  expectEqual(playButton !== null, true);
  expectEqual(headerRail?.includes("border-radius: 28px;"), false);
  expectEqual(rowContainer?.includes("border-radius: 20px;"), false);
  expectEqual(playButton?.includes("border-radius: 999px;"), false);
  expectEqual(headerRail?.includes("backdrop-filter:"), false);
  expectEqual(rowContainer?.includes("backdrop-filter:"), false);
  expectEqual(playButton?.includes("backdrop-filter:"), false);
});

test("drag placeholder uses themed glass styling instead of a hardcoded light surface", () => {
  expectEqual(draggableStyles.includes(".placeholder"), true);
  expectEqual(
    draggableStyles.includes("background-color: #edf2f7;"),
    false,
  );
  expectEqual(
    draggableStyles.includes("background: color-mix("),
    true,
  );
  expectEqual(
    draggableStyles.includes("border: 1px dashed var(--border-color);"),
    true,
  );
});

test("playlist source uses the list container as the end-of-list drop target", () => {
  expectEqual(playlistActionsSource.includes("const onMoveToEnd = () =>"), true);
  expectEqual(
    playlistActionsSource.includes("event.target !== event.currentTarget"),
    true,
  );
  expectEqual(
    playlistContentSource.includes('className={styles["playlist-container"]}'),
    true,
  );
  expectEqual(playlistActionsSource.includes("onMoveToEnd();"), true);
  expectEqual(playlistStyles.includes(".drag-end-drop-zone"), false);
  expectEqual(playlistStyles.includes(".drag-end-drop-zone-active"), false);
});

test("playlist source renders the analysis banner inside the scrollable playlist flow", () => {
  const playlistContainerIndex = playlistContentSource.indexOf(
    'className={styles["playlist-container"]}',
  );
  const analyzeBannerIndex = playlistContentSource.indexOf(
    "<AnalyzeImportBannerPanel",
  );

  expectEqual(playlistContainerIndex >= 0, true);
  expectEqual(analyzeBannerIndex > playlistContainerIndex, true);
});

test("playlist selection mode uses shared helpers and disables dragging", () => {
  expectEqual(playlistSource.includes('from "./playlistSelection"'), true);
  expectEqual(playlistScreenStateSource.includes("selectedItemIds"), true);
  expectEqual(
    playlistSource.includes("getPlaylistHeaderMode(selectedItemIds)"),
    true,
  );
  expectEqual(playlistSource.includes('headerMode === "selection"'), true);
  expectEqual(playlistContentSource.includes("isSelectionMode ? ("), true);
});

test("playlist header source includes selection mode action plumbing", () => {
  expectEqual(playlistHeaderSource.includes("selectedCount"), true);
  expectEqual(playlistHeaderSource.includes("onClearSelection"), true);
  expectEqual(playlistHeaderSource.includes("onToggleSelectAll"), true);
  expectEqual(playlistHeaderSource.includes("onOpenSelectionActions"), true);
  expectEqual(playlistHeaderSource.includes('type="checkbox"'), true);
  expectEqual(
    playlistHeaderSource.includes("selection-header-home-button"),
    true,
  );
  expectEqual(
    playlistHeaderSource.includes("selection-header-home-icon"),
    true,
  );
  expectEqual(playlistHeaderSource.includes("Actions"), true);
  expectEqual(playlistHeaderSource.includes('tone: "danger"'), true);
});

test("playlist header source routes song list management through a selector row and dedicated sheet", () => {
  expectEqual(playlistHeaderSource.includes("activeSongListName"), true);
  expectEqual(playlistHeaderSource.includes("onSelectSongList"), true);
  expectEqual(playlistHeaderSource.includes("onOpenNewSongListModal"), true);
  expectEqual(playlistHeaderSource.includes("buildSongListSheetRows"), true);
  expectEqual(playlistHeaderSource.includes("editingSongListName"), true);
  expectEqual(playlistHeaderSource.includes("(Current List)"), false);
  expectEqual(
    playlistHeaderSource.includes("Object.keys(songLists).map"),
    false,
  );
  expectEqual(playlistHeaderSource.includes("header-song-list-button"), false);
  expectEqual(playlistHeaderSource.includes("header-new-list-button"), false);
});

test("playlist header opens the action sheet when the song list selector is used", () => {
  const helperStart = playlistHeaderSource.indexOf("const openSongListSheet");
  const helperEnd = playlistHeaderSource.indexOf("const buildMenuItems");
  const helperSource = playlistHeaderSource.slice(helperStart, helperEnd);

  expectEqual(helperSource.includes("ctx.setActionSheet(items);"), true);
  expectEqual(helperSource.includes("ctx.open();"), true);
});

test("playlist header source no longer exposes player pin actions", () => {
  expectEqual(playlistHeaderSource.includes("player pin"), false);
  expectEqual(playlistHeaderSource.includes("TogglePin"), false);
});

test("playlist menu exposes the Gemini EQ builder separately from Gemini settings", () => {
  expectEqual(playlistHeaderSource.includes("Gemini EQ"), true);
  expectEqual(playlistHeaderSource.includes("onOpenGeminiEqBuilder"), true);
});

test("playlist renders the reusable Gemini EQ builder screen", () => {
  expectEqual(playlistSource.includes("GeminiEqProfileBuilder"), true);
  expectEqual(playlistSource.includes("generateEqProfileWithGemini"), true);
  expectEqual(playlistSource.includes("onCreateProfile={onCreateProfile}"), true);
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

test("song list action rows use a dedicated left-aligned affordance instead of the centered generic action layout", () => {
  expectEqual(actionSheetItemSource.includes("song-list-action"), true);
  expectEqual(actionSheetItemSource.includes("song-list-action-row"), true);
  expectEqual(actionSheetStyles.includes(".song-list-action-row"), true);
  expectEqual(
    actionSheetStyles.includes(".song-list-action-row .row-copy"),
    true,
  );
  expectEqual(actionSheetStyles.includes("justify-content: flex-start;"), true);
  expectEqual(actionSheetStyles.includes("background: transparent;"), true);
});

test("song list item rows use an explicit flex row container for title and edit button", () => {
  expectEqual(actionSheetItemSource.includes("song-list-row-container"), true);
  expectEqual(actionSheetStyles.includes(".song-list-row-container"), true);
  expectEqual(actionSheetStyles.includes("display: flex;"), true);
  expectEqual(
    actionSheetStyles.includes("justify-content: space-between;"),
    true,
  );
  expectEqual(actionSheetStyles.includes("align-items: center;"), true);
  expectEqual(actionSheetStyles.includes("padding: 0 14px 0 14px;"), true);
});

test("playlist source includes selected-song action modal wiring", () => {
  expectEqual(playlistSource.includes("isSelectionActionsOpen"), true);
  expectEqual(selectionActionsModalSource.includes("Analyze Timing"), true);
  expectEqual(selectionActionsModalSource.includes('setView("timing")'), true);
  expectEqual(selectionActionsModalSource.includes('view === "timing"'), true);
  expectEqual(selectionActionsModalSource.includes("All Selected"), true);
  expectEqual(selectionActionsModalSource.includes("Delete Songs"), true);
  expectEqual(playlistSource.includes("Selected songs"), false);
  expectEqual(playlistActionsSource.includes("itemIds: selectedItemIds"), true);
  expectEqual(
    playlistActionsSource.includes(
      "deleteSelectedPlaylistItems(currentPlaylist, selectedItemIds)",
    ),
    true,
  );
});

test("playlist import success path does not auto-start analysis", () => {
  expectEqual(playlistSource.includes("shouldStartAnalyzeAfterImport"), false);
});

test("playlist source initializes and syncs visible playlist from named song-list storage", () => {
  expectEqual(playlistStorageSource.includes("SONG_LISTS_STORAGE_KEY"), true);
  expectEqual(
    playlistStorageSource.includes("ACTIVE_SONG_LIST_NAME_STORAGE_KEY"),
    true,
  );
  expectEqual(playlistStorageSource.includes("getStorageMap("), true);
  expectEqual(playlistStorageSource.includes("normalizeSongListsState("), true);
  expectEqual(playlistStorageSource.includes("const [songListsState"), true);
  expectEqual(
    playlistStorageSource.includes("const [activeSongListName"),
    true,
  );
  expectEqual(
    playlistSource.includes("getVisiblePlaylistForActiveList("),
    true,
  );
  expectEqual(
    playlistStorageSource.includes("chrome.storage.onChanged.addListener(listener)"),
    true,
  );
  expectEqual(
    playlistStorageSource.includes("SONG_LISTS_STORAGE_KEY in changes"),
    true,
  );
  expectEqual(
    playlistStorageSource.includes("ACTIVE_SONG_LIST_NAME_STORAGE_KEY in changes"),
    true,
  );
});

test("playlist source writes active-list updates through named song-list helpers", () => {
  expectEqual(
    playlistStorageSource.includes("updateStoredActiveSongListItems("),
    true,
  );
  expectEqual(
    playlistStorageSource.includes(
      "[SONG_LISTS_STORAGE_KEY]: nextSongListsState.songLists",
    ),
    true,
  );
  expectEqual(
    playlistStorageSource.includes("[ACTIVE_SONG_LIST_NAME_STORAGE_KEY]:"),
    true,
  );
  expectEqual(playlistSource.includes("youtube_list: playlist"), false);
  expectEqual(playlistSource.includes("youtube_list: temp"), false);
  expectEqual(
    playlistSource.includes(
      "youtube_list: deleteSelectedPlaylistItems(playlist, selectedItemIds)",
    ),
    false,
  );
});

test("playlist import and delete-all source route through the active song list", () => {
  expectEqual(
    playlistHeaderSource.includes('description: "Import Playlist"'),
    true,
  );
  expectEqual(
    playlistHeaderSource.includes(
      'description: "Import from YouTube Playlist"',
    ),
    false,
  );
  expectEqual(
    playlistHeaderSource.includes('description: "Import Playlist JSON"'),
    false,
  );
  expectEqual(
    playlistHeaderSource.includes("onOpenImportModal: () => void;"),
    true,
  );
  expectEqual(
    playlistImportModalSource.includes(
      "onImportJson: (playlist: MPlaylistItem[]) => void;",
    ),
    true,
  );
  expectEqual(
    playlistImportModalSource.includes(
      "const fileInputRef = useRef<HTMLInputElement | null>(null);",
    ),
    true,
  );
  expectEqual(
    playlistImportModalSource.includes("parseImportedPlaylist(content)"),
    true,
  );
  expectEqual(
    playlistImportModalSource.includes("onImportJson(importedPlaylist);"),
    true,
  );
  expectEqual(
    playlistImportModalSource.includes("Import from YouTube playlist"),
    true,
  );
  expectEqual(playlistImportModalSource.includes("Import playlist JSON"), true);
  expectEqual(playlistImportModalSource.includes("Choose JSON file"), true);
  expectEqual(playlistImportModalStyles.includes(".importSection"), true);
  expectEqual(
    playlistActionsSource.includes(
      "const onImportJson = (importedPlaylist: MPlaylistItem[]) => {",
    ),
    true,
  );
  expectEqual(playlistActionsSource.includes("updateActiveSongListItems(() => importedPlaylist);"), true);
  expectEqual(playlistSource.includes("onImportJson={onImportJson}"), true);
  expectEqual(playlistActionsSource.includes("updateActiveSongListItems(() => []);"), true);
});

test("playlist header export source revokes object URLs after download", () => {
  expectEqual(playlistHeaderSource.includes("URL.revokeObjectURL(url);"), true);
  expectEqual(
    playlistHeaderSource.includes("window.setTimeout(revokeUrl, 1000);"),
    true,
  );
});

test("playlist source manages new song list modal state and create flow", () => {
  expectEqual(
    playlistScreenStateSource.includes("const [isNewSongListOpen, setIsNewSongListOpen]"),
    true,
  );
  expectEqual(
    playlistScreenStateSource.includes('const [newSongListError, setNewSongListError]'),
    true,
  );
  expectEqual(playlistActionsSource.includes("getSongListCreationError("), true);
  expectEqual(playlistActionsSource.includes("createSongList(currentSongListsState"), true);
  expectEqual(
    playlistActionsSource.includes("updateSongListsState("),
    true,
  );
  expectEqual(playlistActionsSource.includes('setNewSongListError("")'), true);
  expectEqual(playlistActionsSource.includes("setIsNewSongListOpen(true)"), true);
  expectEqual(
    playlistActionsSource.includes("setIsNewSongListOpen(false)"),
    true,
  );
  expectEqual(playlistActionsSource.includes("const onRenameSongList ="), true);
  expectEqual(playlistActionsSource.includes("renameSongList("), true);
  expectEqual(playlistSource.includes("<NewSongListModal"), true);
  expectEqual(
    playlistSource.includes("activeSongListName={activeSongListName}"),
    true,
  );
  expectEqual(playlistSource.includes("onSelectSongList={onSelectSongList}"), true);
});

test("playlist source guards reorder targets and preserves selection on analyze send failures", () => {
  expectEqual(playlistActionsSource.includes("if (targetIndex < 0) {"), true);
  expectEqual(playlistActionsSource.includes("(_response?: unknown) =>"), true);
  expectEqual(playlistActionsSource.includes("if (chrome.runtime.lastError) {"), true);
  expectEqual(playlistActionsSource.includes("clearSelection();"), true);
  expectEqual(playlistActionsSource.includes("closeSelectionActionsModal();"), true);
  expectEqual(
    playlistActionsSource.includes("name: MsgType.AnalyzeImportedPlaylist"),
    true,
  );
});

test("playlist source wires the Gemini EQ profile generation message", () => {
  expectEqual(
    playlistActionsSource.includes("MsgType.GenerateEqProfileWithGemini"),
    true,
  );
  expectEqual(
    backgroundSource.includes("case MsgType.GenerateEqProfileWithGemini"),
    true,
  );
});

test("playlist source wires the Gemini song EQ adjustment message", () => {
  expectEqual(
    backgroundSource.includes("case MsgType.AdjustSongEqWithGemini"),
    true,
  );
  expectEqual(
    backgroundSource.includes(
      "message?.name === MsgType.AdjustSongEqWithGemini",
    ),
    true,
  );
  expectEqual(
    msgTypeSource.includes("AdjustSongEqWithGemini"),
    true,
  );
});

test("selection actions modal exposes review-first Gemini song EQ adjustment", () => {
  expectEqual(selectionActionsModalSource.includes("Gemini EQ"), true);
  expectEqual(
    selectionActionsModalSource.includes("Describe an optional EQ preference"),
    true,
  );
  expectEqual(selectionActionsModalSource.includes("selectedSong?.title"), true);
  expectEqual(selectionActionsModalSource.includes("Apply EQ"), true);
  expectEqual(
    selectionActionsModalSource.includes("geminiEqReview.suggestion &&"),
    true,
  );
  expectEqual(
    selectionActionsModalSource.includes("disabled={!geminiEqReview.suggestion}"),
    false,
  );
  expectEqual(selectionActionsModalSource.includes("Dismiss"), false);
  expectEqual(selectionActionsGeminiEqReviewSource.includes("select one song"), true);
  expectEqual(selectionActionsModalSource.includes("suggestion"), true);
});

test("playlist actions request and apply Gemini song EQ through existing playlist updates", () => {
  expectEqual(playlistActionsSource.includes("adjustSongEqWithGemini"), true);
  expectEqual(playlistActionsSource.includes("normalizeGeminiSongEqResponse"), true);
  expectEqual(playlistActionsSource.includes("MsgType.AdjustSongEqWithGemini"), true);
  expectEqual(playlistActionsSource.includes("onApplyGeminiSongEqSuggestion"), true);
  expectEqual(playlistActionsSource.includes("updateActiveSongListItems"), true);
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
  expectEqual(
    playlistHeaderSource.includes("selection-header-home-button"),
    true,
  );
  expectEqual(
    playlistHeaderSource.includes("selection-header-action-button"),
    true,
  );
  expectEqual(playlistStyles.includes("margin-left: 10px;"), true);
  expectEqual(playlistStyles.includes("width: 28px;"), true);
  expectEqual(playlistStyles.includes("padding: 0 0 16px;"), true);
  expectEqual(
    playlistStyles.includes("border-top: 1px solid var(--border-color);"),
    true,
  );
  expectEqual(
    playlistStyles.includes("background-color: var(--surface-secondary);"),
    true,
  );
  expectEqual(playlistStyles.includes(".header-song-list-button"), false);
  expectEqual(playlistStyles.includes(".header-new-list-button"), false);
  expectEqual(playlistStyles.includes(".header-center-actions"), false);
});

test("playlist selection header keeps the centered home button in action mode", () => {
  expectEqual(
    playlistHeaderSource.includes(
      'className={`${styles["header-center-container"]} ${styles["header-side-pocket"]}`}',
    ),
    true,
  );
  expectEqual(
    playlistHeaderSource.includes("selection-header-home-button"),
    true,
  );
  expectEqual(
    playlistHeaderSource.includes("selection-header-action-button"),
    true,
  );
});

test("playlist normal header uses the center area for the active song list selector", () => {
  expectEqual(
    playlistHeaderSource.includes(
      'className={`${styles["header-left-container"]} ${styles["header-side-pocket"]}`}',
    ),
    true,
  );
  expectEqual(
    playlistHeaderSource.includes(
      'className={`${styles["header-center-container"]} ${styles["header-center-well"]}`}',
    ),
    true,
  );
  expectEqual(playlistStyles.includes(".normal-header-button"), true);
  expectEqual(playlistStyles.includes(".header-button"), true);
  expectEqual(playlistStyles.includes(".header-control-rail"), true);
  expectEqual(playlistStyles.includes(".header-center-well"), true);
  expectEqual(playlistStyles.includes(".header-side-button"), true);
  expectEqual(
    /\.header-button\s*\{[^}]*background:\s*transparent;/s.test(playlistStyles),
    true,
  );
  expectEqual(
    /\.header-button\s*\{[^}]*box-shadow:\s*none;/s.test(playlistStyles),
    true,
  );
  expectEqual(
    /\.song-list-button\s*\{[^}]*width:\s*100%;/s.test(playlistStyles),
    true,
  );
  expectEqual(playlistStyles.includes(".song-list-button"), true);
  expectEqual(playlistStyles.includes(".song-list-button-label"), true);
  expectEqual(playlistStyles.includes(".song-list-button-chevron"), true);
  expectEqual(playlistStyles.includes(".song-list-button-icon"), true);
  expectEqual(
    /\.song-list-button\s*\{[^}]*background:\s*transparent;/s.test(
      playlistStyles,
    ),
    true,
  );
  expectEqual(
    /\.normal-header-button\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s.test(
      playlistStyles,
    ),
    true,
  );
  expectEqual(
    /\.header-control-rail\s*\{[^}]*padding:\s*0 12px;/s.test(playlistStyles),
    true,
  );
  expectEqual(
    /\.header-side-pocket\s*\{[^}]*width:\s*42px;[^}]*min-width:\s*42px;[^}]*height:\s*42px;/s.test(
      playlistStyles,
    ),
    true,
  );
  expectEqual(
    /\.header-side-pocket\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px/s.test(
      playlistStyles,
    ),
    false,
  );
  expectEqual(
    /\.header-center-well\s*\{[^}]*min-height:\s*42px;/s.test(playlistStyles),
    true,
  );
  expectEqual(
    /\.header-center-well\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px/s.test(
      playlistStyles,
    ),
    false,
  );
  expectEqual(
    playlistHeaderSource.includes(
      'className={`${styles["header-button"]} ${styles["normal-header-button"]} ${styles["header-side-button"]}`}',
    ),
    true,
  );
  expectEqual(playlistHeaderSource.includes("activeSongListName"), true);
  expectEqual(playlistHeaderSource.includes("openSongListSheet()"), true);
  expectEqual(
    playlistHeaderSource.includes(
      '<span className={styles["song-list-button-label"]}>',
    ),
    true,
  );
  expectEqual(
    playlistHeaderSource.includes(
      'className={`${styles["header-button"]} ${styles["song-list-button"]}`}',
    ),
    true,
  );
});

test("new song list modal source uses shared modal pattern and inline error messaging", () => {
  expectEqual(
    newSongListModalSource.includes('import Modal from "../modal/Modal"'),
    true,
  );
  expectEqual(newSongListModalSource.includes("songListName"), true);
  expectEqual(newSongListModalSource.includes("errorMessage"), true);
  expectEqual(newSongListModalSource.includes('role="alert"'), true);
  expectEqual(newSongListModalSource.includes("Create list"), true);
  expectEqual(newSongListModalSource.includes('setSongListName("")'), true);
});

test("playlist item play button routes through modal-opening playback wiring", () => {
  expectEqual(playlistItemSource.includes("onPlayItem"), true);
  expectEqual(playlistItemSource.includes("onPlayItem(item.id);"), true);
  expectEqual(playlistScreenStateSource.includes("const [pendingPlaybackItemId"), true);
  expectEqual(
    playlistActionsSource.includes("const openPlaybackModal = (itemId: string) =>"),
    true,
  );
  expectEqual(
    playlistSource.includes("getEffectivePlaybackItemId("),
    true,
  );
  expectEqual(playlistContentSource.includes("onPlayItem={onOpenPlaybackModal}"), true);
});
