import { useEffect, useRef, useState } from "react";
import MsgType from "../../constants/msgType";
import type MActionSheetItem from "../../models/MActionSheetItem";
import PlaybackState, {
  createInitialPlaybackState,
  isPlaybackActive,
  isQueueModeActive,
} from "../../models/PlaybackState";
import { type SongListRecord } from "../../models/SongList";
import { getCurrentTimestamp } from "../../utils/date";
import { ThemePreference } from "../../utils/theme";
import useActionSheet from "../actionSheet/useActionSheet";
import styles from "./Playlist.module.css";
import {
  buildSongListSheetRows,
} from "./songListsViewModel";

interface props {
  onDelete: () => void;
  onOpenEqSettings: () => void;
  onOpenGeminiEqBuilder: () => void;
  onOpenGeminiSettings: () => void;
  onOpenImportModal: () => void;
  onOpenNewSongListModal: () => void;
  onSelectSongList: (name: string) => void;
  onRenameSongList: (currentName: string, nextName: string) => string;
  onClearSelection: () => void;
  onToggleSelectAll: () => void;
  onOpenSelectionActions: () => void;
  playlist: MPlaylistItem[];
  songLists: Record<string, SongListRecord>;
  activeSongListName: string;
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}
const PlaylistHeader = ({
  playlist,
  onDelete,
  onOpenEqSettings,
  onOpenGeminiEqBuilder,
  onOpenGeminiSettings,
  onOpenImportModal,
  onOpenNewSongListModal,
  onSelectSongList,
  onRenameSongList,
  onClearSelection,
  onToggleSelectAll,
  onOpenSelectionActions,
  selectedCount,
  songLists,
  activeSongListName,
  allSelected,
  someSelected,
  themePreference,
  setThemePreference,
}: props) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(
    createInitialPlaybackState(),
  );
  const [isPlayAll, setIsPlayAll] = useState<boolean>(false);
  const [editingSongListName, setEditingSongListName] = useState<string | null>(
    null,
  );
  const [songListRenameValue, setSongListRenameValue] = useState("");
  const [songListRenameError, setSongListRenameError] = useState("");
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
  const ctx = useActionSheet();

  const syncPlaybackState = (state?: PlaybackState | null) => {
    setPlaybackState(state || createInitialPlaybackState());
  };

  const isPIP = playbackState.isPip;
  const playing = isPlaybackActive(playbackState.status);
  const enableAdjustVideoVolume = playbackState.enableAdjustVideoVolume;

  const onPlayPauseButton = () => {
    if (isPlayAll) {
      console.log("sendPauseAll");
      chrome.runtime.sendMessage({ name: MsgType.PauseAll });
    } else {
      openPlayMenu();
    }
  };
  const sendPlayOrderly = () => {
    console.log("sendPlayOrderly");
    chrome.runtime.sendMessage({ name: MsgType.PlayAll });
  };
  const sendPlayRandom = () => {
    console.log("sendPlayRandom");
    chrome.runtime.sendMessage({ name: MsgType.PlayAllRandom });
  };
  const onPlayInPicture = () => {
    chrome.runtime.sendMessage({ name: MsgType.OpenPictureInWindow });
  };
  const onToggleVolumeAdjust = () => {
    chrome.runtime.sendMessage({ name: MsgType.ToggleVolumeAdjust });
  };
  const onExportJson = () => {
    var result = JSON.stringify(playlist);
    var file = new Blob([result], { type: "application/json" });
    var url = URL.createObjectURL(file);
    let revoked = false;
    const revokeUrl = () => {
      if (revoked) {
        return;
      }

      revoked = true;
      URL.revokeObjectURL(url);
    };

    chrome.downloads.download(
      {
        url: url,
        filename: `playlist_${getCurrentTimestamp()}.json`,
      },
      () => {
        revokeUrl();
      },
    );
    window.setTimeout(revokeUrl, 1000);
  };
  const resetSongListRenameState = () => {
    setEditingSongListName(null);
    setSongListRenameValue("");
    setSongListRenameError("");
  };

  const openSongListSheet = (
    nextEditingSongListName: string | null = editingSongListName,
    nextSongListRenameValue = songListRenameValue,
    nextSongListRenameError = songListRenameError,
  ) => {
    setEditingSongListName(nextEditingSongListName);
    setSongListRenameValue(nextSongListRenameValue);
    setSongListRenameError(nextSongListRenameError);

    const items: MActionSheetItem[] = buildSongListSheetRows({
      activeSongListName,
      editingSongListName: nextEditingSongListName,
      songLists,
    }).map((row) => {
      if (row.kind === "song-list-action") {
        return {
          id: row.id,
          kind: row.kind,
          description: row.description,
          leadingIcon: row.leadingIcon,
          callback: () => {
            resetSongListRenameState();
            onOpenNewSongListModal();
          },
        };
      }

      if (row.kind === "song-list-inline-edit") {
        return {
          id: row.id,
          kind: row.kind,
          description: row.description,
          songListName: row.songListName,
          editValue: nextSongListRenameValue,
          errorMessage: nextSongListRenameError,
          saveIcon: row.saveIcon,
          cancelIcon: row.cancelIcon,
          shouldCloseOnClick: false,
          onEditValueChange: (value: string) => {
            setSongListRenameValue(value);
            setSongListRenameError("");
            openSongListSheet(row.songListName, value, "");
          },
          onSaveEdit: () => {
            const error = onRenameSongList(
              row.songListName,
              nextSongListRenameValue,
            );

            if (error) {
              setSongListRenameError(error);
              openSongListSheet(
                row.songListName,
                nextSongListRenameValue,
                error,
              );
              return;
            }

            resetSongListRenameState();
            ctx.close();
          },
          onCancelEdit: () => {
            resetSongListRenameState();
            openSongListSheet();
          },
        };
      }

      return {
        id: row.id,
        kind: row.kind,
        description: row.description,
        songListName: row.songListName,
        isActive: row.isActive,
        trailingIcon: row.trailingIcon,
        callback: () => {
          resetSongListRenameState();
          onSelectSongList(row.songListName);
        },
        onEdit: () => {
          setEditingSongListName(row.songListName);
          setSongListRenameValue(row.songListName);
          setSongListRenameError("");
          openSongListSheet(row.songListName, row.songListName, "");
        },
      };
    });

    ctx.setActionSheet(items);
    ctx.open();
  };

  const buildMenuItems = (currentThemePreference: ThemePreference) => {
    return [
      {
        id: 1,
        kind: "theme-selector" as const,
        themePreference: currentThemePreference,
        onThemeChange: (nextPreference: ThemePreference) => {
          setThemePreference(nextPreference);
          ctx.setActionSheet(buildMenuItems(nextPreference));
        },
      },
      ...(playing
        ? [
            {
              id: 2,
              description: `${isPIP ? "Hide" : "Show"} Picture in Picture`,
              callback: onPlayInPicture,
            },
          ]
        : []),
      {
        id: 3,
        description: "EQ Profiles",
        callback: onOpenEqSettings,
      },
      {
        id: 4,
        description: "Gemini EQ",
        callback: onOpenGeminiEqBuilder,
      },
      {
        id: 5,
        description: "Gemini",
        callback: onOpenGeminiSettings,
      },
      {
        id: 6,
        description: `${
          enableAdjustVideoVolume ? "Disable" : "Enable"
        } Volume adjust`,
        callback: onToggleVolumeAdjust,
      },
      {
        id: 7,
        description: "Import Playlist",
        callback: onOpenImportModal,
      },
      { id: 8, description: "Export Playlist", callback: onExportJson },
      {
        id: 200,
        description: "Delete All",
        callback: onDelete,
        tone: "danger",
      },
    ];
  };

  const openPlayMenu = () => {
    ctx.setActionSheet([
      { id: 1, description: "Play Orderly", callback: sendPlayOrderly },
      { id: 2, description: "Play Randomly", callback: sendPlayRandom },
    ]);
    ctx.open();
  };

  const openMenu = () => {
    resetSongListRenameState();
    ctx.setActionSheet(buildMenuItems(themePreference));
    ctx.open();
  };

  useEffect(() => {
    chrome.storage.local.get(["playbackState", "isPlayAll"], (result) => {
      syncPlaybackState(result["playbackState"]);
      setIsPlayAll(
        result["isPlayAll"] === undefined
          ? isQueueModeActive(
              (result["playbackState"] || createInitialPlaybackState())
                .queueMode || "off",
            )
          : !!result["isPlayAll"],
      );
    });
  }, []);

  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: "sync" | "local" | "managed" | "session",
    ) => {
      if ("playbackState" in changes) {
        syncPlaybackState(changes["playbackState"].newValue);
      }
      if ("isPlayAll" in changes) {
        setIsPlayAll(!!changes["isPlayAll"].newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    if (!selectAllCheckboxRef.current) {
      return;
    }

    selectAllCheckboxRef.current.indeterminate = someSelected && !allSelected;
  }, [allSelected, someSelected]);

  return (
    <div className={styles["header-container"]}>
      {selectedCount > 0 ? (
        <div
          className={`${styles["header-control-rail"]} ${styles["selection-control-rail"]}`}
        >
          <div
            className={`${styles["header-left-container"]} ${styles["header-center-well"]}`}
          >
            <label className={styles["selection-header-checkbox"]}>
              <input
                ref={selectAllCheckboxRef}
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                aria-label={
                  allSelected ? "Deselect all songs" : "Select all songs"
                }
              />
            </label>
            <p className={styles["selection-count"]}>
              {selectedCount} selected
            </p>
          </div>
          <div
            className={`${styles["header-center-container"]} ${styles["header-side-pocket"]}`}
          >
            <button
              type="button"
              onClick={onClearSelection}
              className={`${styles["header-button"]} ${styles["selection-header-button"]} ${styles["selection-header-home-button"]}`}
              aria-label="Return to playlist"
            >
              <svg
                className={styles["selection-header-home-icon"]}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M12 3.5a1 1 0 0 1 .64.23l7 5.83a1 1 0 0 1-.64 1.77H18.5v7a1 1 0 0 1-1 1h-4.25a1 1 0 0 1-1-1V14h-1.5v4.25a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1v-7H5a1 1 0 0 1-.64-1.77l7-5.83A1 1 0 0 1 12 3.5Z"
                />
              </svg>
            </button>
          </div>
          <div
            className={`${styles["header-right-container"]} ${styles["header-center-well"]}`}
          >
            <button
              type="button"
              onClick={onOpenSelectionActions}
              className={`${styles["header-button"]} ${styles["selection-header-button"]} ${styles["selection-header-action-button"]}`}
            >
              Actions
            </button>
          </div>
        </div>
      ) : (
        <div className={styles["header-control-rail"]}>
          <div
            className={`${styles["header-left-container"]} ${styles["header-side-pocket"]}`}
          >
            <button
              disabled={playlist.length === 0}
              onClick={onPlayPauseButton}
              className={`${styles["header-button"]} ${styles["normal-header-button"]} ${styles["header-side-button"]}`}
            >
              <img
                className={styles["header-button-icon"]}
                src={isPlayAll ? "./assets/pause30.png" : "./assets/play30.png"}
                alt={isPlayAll ? "pause" : "play all"}
              />
            </button>
          </div>
          <div
            className={`${styles["header-center-container"]} ${styles["header-center-well"]}`}
          >
            <button
              type="button"
              onClick={() => {
                resetSongListRenameState();
                openSongListSheet();
              }}
              className={`${styles["header-button"]} ${styles["song-list-button"]}`}
              aria-label={`Open song list selector. Current list: ${activeSongListName}`}
            >
              <span className={styles["song-list-button-label"]}>
                {activeSongListName}
              </span>
              <svg
                className={styles["song-list-button-chevron"]}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M7.22 9.47a.75.75 0 0 1 1.06 0L12 13.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z"
                />
              </svg>
            </button>
          </div>
          <div
            className={`${styles["header-right-container"]} ${styles["header-side-pocket"]}`}
          >
            <button
              onClick={openMenu}
              className={`${styles["header-button"]} ${styles["normal-header-button"]} ${styles["header-side-button"]}`}
            >
              <span className={styles["song-list-button-copy"]}>Menu</span>
              <img
                className={styles["header-button-icon"]}
                src={"./assets/menu30.svg"}
                alt="menu"
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistHeader;
