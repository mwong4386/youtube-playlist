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

const selectionActionsSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/SelectionActionsModal.tsx"),
  "utf8",
);
const playlistStyles = readFileSync(
  join(process.cwd(), "src/screens/playlist/Playlist.module.css"),
  "utf8",
);

test("selection actions modal uses shared modal chrome", () => {
  expectEqual(
    selectionActionsSource.includes(
      'import ModalChromeHeader from "../modal/ModalChromeHeader";',
    ),
    true,
  );
  expectEqual(
    selectionActionsSource.includes(
      'import modalStyles from "../modal/Modal.module.css";',
    ),
    true,
  );
  expectEqual(
    selectionActionsSource.includes('modalStyles["chrome-panel"]'),
    true,
  );
});

test("selection actions menu uses a compact selected count title", () => {
  expectEqual(
    selectionActionsSource.includes(
      '${selectedCount} ${selectedCount === 1 ? "Song" : "Songs"} Selected',
    ),
    true,
  );
  expectEqual(selectionActionsSource.includes("Actions for"), false);
  expectEqual(selectionActionsSource.includes('subtitle={'), false);
  expectEqual(selectionActionsSource.includes("selection-actions-menu-title"), true);
  expectEqual(playlistStyles.includes(".selection-actions-menu-title"), true);
  expectEqual(playlistStyles.includes("color: var(--text-secondary);"), true);
});

test("selection action detail views keep back and close affordances", () => {
  expectEqual(
    selectionActionsSource.includes("closeIcon={isMenuView ? undefined : <BackIcon />}"),
    true,
  );
  expectEqual(
    selectionActionsSource.includes('aria-label="Close selected song actions"'),
    true,
  );
  expectEqual(selectionActionsSource.includes("<CloseIcon />"), true);
});

test("selection actions hide Gemini-backed menu rows without a Gemini key", () => {
  expectEqual(
    selectionActionsSource.includes("geminiApiKey: string;"),
    true,
  );
  expectEqual(
    selectionActionsSource.includes(
      "const hasGeminiApiKey = geminiApiKey.trim().length > 0;",
    ),
    true,
  );
  expectEqual(
    selectionActionsSource.includes("{hasGeminiApiKey ? ("),
    true,
  );
  expectEqual(
    selectionActionsSource.includes(
      'if (!hasGeminiApiKey && (view === "timing" || view === "geminiEq")) {',
    ),
    true,
  );
});

test("selection actions modal no longer owns duplicated header chrome", () => {
  expectEqual(playlistStyles.includes(".selection-actions-modal-header"), false);
  expectEqual(playlistStyles.includes(".selection-actions-modal-title"), false);
  expectEqual(playlistStyles.includes(".selection-actions-back-button"), false);
  expectEqual(playlistStyles.includes(".selection-actions-close-button"), false);
});

test("selection action rows match the settings menu surface", () => {
  const actionsBlock = getCssBlock(
    playlistStyles,
    ".selection-actions-modal-actions",
  );
  const buttonBlock = getCssBlock(
    playlistStyles,
    ".selection-actions-analyze-button,\n.selection-actions-delete-button",
  );

  expectEqual(actionsBlock?.includes("display: grid;"), true);
  expectEqual(actionsBlock?.includes("gap: 8px;"), true);
  expectEqual(actionsBlock?.includes("border:"), false);
  expectEqual(buttonBlock?.includes("background: transparent;"), true);
  expectEqual(buttonBlock?.includes("min-height: 58px;"), true);
  expectEqual(buttonBlock?.includes("border-top:"), false);
  expectEqual(playlistStyles.includes(".selection-actions-cancel-button"), false);
  expectEqual(selectionActionsSource.includes(">Cancel<"), false);
});
