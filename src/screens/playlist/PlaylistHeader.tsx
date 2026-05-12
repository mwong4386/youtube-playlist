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
import { ChevronDownIcon, HomeIcon } from "../icons";
import styles from "./Playlist.module.css";
import { buildSongListSheetRows } from "./songListsViewModel";

interface props {
  onDelete: () => void;
  onDeletePlaylistSource: (url: string) => void;
  onOpenEqSettings: () => void;
  onOpenGeminiSettings: () => void;
  onOpenImportModal: () => void;
  onOpenNewSongListModal: () => void;
  onCheckPlaylistUpdates: (songListName?: string) => Promise<string>;
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
  geminiApiKey: string;
}
const PlaylistHeader = ({
  playlist,
  onDelete,
  onDeletePlaylistSource,
  onOpenEqSettings,
  onOpenGeminiSettings,
  onOpenImportModal,
  onOpenNewSongListModal,
  onCheckPlaylistUpdates,
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
  geminiApiKey,
}: props) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(
    createInitialPlaybackState(),
  );
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
    if (playing && isQueueModeActive(playbackState.queueMode)) {
      console.log("sendPauseAll");
      chrome.runtime.sendMessage({ name: MsgType.PauseAll });
    } else if (isQueueModeActive(playbackState.queueMode)) {
      console.log("resumePlayAll");
      chrome.runtime.sendMessage({
        name:
          playbackState.queueMode === "random"
            ? MsgType.PlayAllRandom
            : MsgType.PlayAll,
      });
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
  const onCheckPlaylistUpdatesFromMenu = (songListName?: string) => {
    void onCheckPlaylistUpdates(songListName)
      .then((message) => {
        console.log(message);
      })
      .catch((error) => {
        console.error("Could not check playlist updates.", error);
      });
  };
  const onExportJson = (items = playlist) => {
    var result = JSON.stringify(items);
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
    shouldOpen = true,
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
        overflowIcon: "gear",
        overflowLabel: `Manage ${row.songListName}`,
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
        onOverflow: () => {
          resetSongListRenameState();
          onSelectSongList(row.songListName);
          openPlaylistManagementMenu("song-list-sheet", row.songListName);
        },
      };
    });

    ctx.setActionSheet(items);
    if (shouldOpen) {
      ctx.open();
    }
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
        id: 5,
        description: geminiApiKey.trim() ? "Gemini Settings" : "Setup Gemini",
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
        id: "playlist-management",
        description: "Edit Playlist",
        callback: openPlaylistManagementMenu,
        shouldCloseOnClick: false,
      },
    ];
  };

  const buildPlaylistManagementItems = ({
    backTarget,
    targetSongListName = activeSongListName,
  }: {
    backTarget: "main-menu" | "song-list-sheet";
    targetSongListName?: string;
  }): MActionSheetItem[] => {
    const targetSongList = songLists[targetSongListName];
    const hasTargetTrackedPlaylistSource =
      (targetSongList?.playlistSources?.length ?? 0) > 0;

    return [
      {
        id: "playlist-management-header",
        kind: "sheet-header",
        description: "Manage Playlist",
        leadingIcon: "back",
        callback: () => {
          if (backTarget === "song-list-sheet") {
            openSongListSheet(null, "", "", false);
            return;
          }

          ctx.setActionSheet(buildMenuItems(themePreference));
        },
        shouldCloseOnClick: false,
      },
      {
        id: "manage-sources",
        description: "Playlist Sources",
        callback: () => openPlaylistSourcesMenu(targetSongListName),
        shouldCloseOnClick: false,
      },
      ...(hasTargetTrackedPlaylistSource
        ? [
            {
              id: 9,
              description: "Check Playlist Updates",
              callback: () => {
                onSelectSongList(targetSongListName);
                onCheckPlaylistUpdatesFromMenu(targetSongListName);
              },
            },
          ]
        : []),
      {
        id: 7,
        description: "Import Playlist",
        callback: () => {
          onSelectSongList(targetSongListName);
          onOpenImportModal();
        },
      },
      {
        id: 8,
        description: "Export Playlist",
        callback: () => onExportJson(targetSongList?.items ?? []),
      },
      {
        id: 200,
        description: "Delete Playlist",
        callback: () => {
          onSelectSongList(targetSongListName);
          onDelete();
        },
        tone: "danger",
      },
    ];
  };

  const openPlaylistManagementMenu = (
    backTarget: "main-menu" | "song-list-sheet" = "main-menu",
    targetSongListName = activeSongListName,
  ) => {
    ctx.setActionSheet(
      buildPlaylistManagementItems({ backTarget, targetSongListName }),
    );
  };

  const openPlaylistSourcesMenu = (targetSongListName = activeSongListName) => {
    const targetSongList = songLists[targetSongListName];
    if (!targetSongList) {
      return;
    }

    const items: MActionSheetItem[] = [
      {
        id: "playlist-sources-header",
        kind: "sheet-header",
        description: "Playlist Sources",
        leadingIcon: "back",
        callback: () =>
          openPlaylistManagementMenu("main-menu", targetSongListName),
        shouldCloseOnClick: false,
      },
      {
        id: "add-source",
        kind: "song-list-action",
        description: "Add Playlist Source",
        leadingIcon: "plus",
        callback: () => {
          onOpenImportModal();
        },
      },
      ...(targetSongList.playlistSources || []).map((source, index) => {
        const listId = new URLSearchParams(source.url.split("?")[1] || "").get("list") || source.url;
        return {
          id: `source-${index}`,
          kind: "song-list-action",
          description: listId,
          shouldCloseOnClick: false,
          leadingIconActions: [
            {
              icon: "view",
              label: "View Source",
              callback: () => {
                window.open(source.url, "_blank");
              },
            },
            {
              icon: "trash",
              label: "Delete Source",
              callback: () => {
                onDeletePlaylistSource(source.url);
                openPlaylistSourcesMenu(targetSongListName);
              },
            },
          ],
        };
      }),
    ];

    ctx.setActionSheet(items);
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
    chrome.storage.local.get(["playbackState"], (result) => {
      syncPlaybackState(result["playbackState"]);
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
              <HomeIcon className={styles["selection-header-home-icon"]} />
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
                src={
                  playing && isQueueModeActive(playbackState.queueMode)
                    ? "./assets/pause30.png"
                    : "./assets/play30.png"
                }
                alt={
                  playing && isQueueModeActive(playbackState.queueMode)
                    ? "pause"
                    : "play all"
                }
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
              <ChevronDownIcon className={styles["song-list-button-chevron"]} />
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
