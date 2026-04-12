import { useEffect, useRef, useState } from "react";
import MsgType from "../../constants/msgType";
import PlaybackState, {
  createInitialPlaybackState,
  isPlaybackActive,
  isQueueModeActive,
} from "../../models/PlaybackState";
import { getCurrentTimestamp } from "../../utils/date";
import MPlaylistItem from "../../models/MPlaylistItem";
import { parseImportedPlaylist } from "../../utils/playlistImport";
import { type SongListRecord } from "../../models/SongList";
import {
  ThemePreference,
} from "../../utils/theme";
import useActionSheet from "../actionSheet/useActionSheet";
import { getSongListOptions } from "./songListsViewModel";
import styles from "./Playlist.module.css";

interface props {
  onDelete: () => void;
  onImportJson: (playlist: MPlaylistItem[]) => void;
  onOpenEqSettings: () => void;
  onOpenGeminiSettings: () => void;
  onOpenImportModal: () => void;
  onOpenNewSongListModal: () => void;
  onSelectSongList: (name: string) => void;
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
  onImportJson,
  onOpenEqSettings,
  onOpenGeminiSettings,
  onOpenImportModal,
  onOpenNewSongListModal,
  onSelectSongList,
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
    createInitialPlaybackState()
  );
  const [isPlayAll, setIsPlayAll] = useState<boolean>(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
  const ctx = useActionSheet();
  const songListNames = getSongListOptions(songLists);

  const syncPlaybackState = (state?: PlaybackState | null) => {
    setPlaybackState(state || createInitialPlaybackState());
  };

  const isPIP = playbackState.isPip;
  const playing = isPlaybackActive(playbackState.status);
  const enablePin = playbackState.enablePin;
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
  const onTogglePin = () => {
    chrome.runtime.sendMessage({ name: MsgType.TogglePin });
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
      }
    );
    window.setTimeout(revokeUrl, 1000);
  };
  const openImportJsonPicker = () => {
    const file = document.getElementById("uploadfile");
    file?.click();
  };

  const buildMenuItems = (currentThemePreference: ThemePreference) => {
    return [
      ...(playing
        ? [
            {
              id: 1,
              description: `${isPIP ? "Hide" : "Show"} Picture in Picture`,
              callback: onPlayInPicture,
            },
          ]
        : []),
      {
        id: 2,
        kind: "theme-selector" as const,
        themePreference: currentThemePreference,
        onThemeChange: (nextPreference: ThemePreference) => {
          setThemePreference(nextPreference);
          ctx.setActionSheet(buildMenuItems(nextPreference));
        },
      },
      {
        id: 3,
        description: "EQ Profiles",
        callback: onOpenEqSettings,
      },
      {
        id: 4,
        description: "Gemini",
        callback: onOpenGeminiSettings,
      },
      {
        id: 5,
        description: `${enablePin ? "Hide" : "Show"} player pin`,
        callback: onTogglePin,
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
        description: "Import from YouTube Playlist",
        callback: onOpenImportModal,
      },
      { id: 8, description: "Import Playlist JSON", callback: openImportJsonPicker },
      { id: 9, description: "Export Playlist", callback: onExportJson },
      { id: 10, description: "Delete All", callback: onDelete, tone: "danger" },
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
    ctx.setActionSheet(buildMenuItems(themePreference));
    ctx.open();
  };

  const openSongListMenu = () => {
    ctx.setActionSheet(
      songListNames.map((name, index) => ({
        id: index + 1,
        description: name,
        callback: () => {
          onSelectSongList(name);
        },
      }))
    );
    ctx.open();
  };

  useEffect(() => {
    chrome.storage.local.get(["playbackState", "isPlayAll"], (result) => {
      syncPlaybackState(result["playbackState"]);
      setIsPlayAll(
        result["isPlayAll"] === undefined
          ? isQueueModeActive(
              (result["playbackState"] || createInitialPlaybackState())
                .queueMode || "off"
            )
          : !!result["isPlayAll"]
      );
    });
  }, []);

  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: "sync" | "local" | "managed" | "session"
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

  const onFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (files && files?.length > 0) {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const content = reader.result as string;
          if (content) {
            const { playlist: importedPlaylist, error } =
              parseImportedPlaylist(content);

            if (importedPlaylist) {
              onImportJson(importedPlaylist);
            } else if (error) {
              window.alert(error);
            }
            (document.getElementById("uploadfile") as HTMLInputElement).value =
              "";
          }
        });
        reader.readAsText(file, "UTF-8");
      }
    }
  };
  return (
    <div className={styles["header-container"]}>
      <input
        style={{ display: "none" }}
        type="file"
        name="uploadfile"
        id="uploadfile"
        accept="application/json"
        onChange={onFileUpload}
      ></input>
      {selectedCount > 0 ? (
        <>
          <div className={styles["header-left-container"]}>
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
            <p className={styles["selection-count"]}>{selectedCount} selected</p>
          </div>
          <div className={styles["header-center-container"]}>
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
          <div className={styles["header-right-container"]}>
            <button
              type="button"
              onClick={onOpenSelectionActions}
              className={`${styles["header-button"]} ${styles["selection-header-button"]} ${styles["selection-header-action-button"]}`}
            >
              Actions
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles["header-left-container"]}>
            <button
              disabled={playlist.length === 0}
              onClick={onPlayPauseButton}
              className={styles["header-button"]}
            >
              <img
                className={styles["header-button-icon"]}
                src={isPlayAll ? "./assets/pause30.png" : "./assets/play30.png"}
                alt={isPlayAll ? "pause" : "play all"}
              />
            </button>
          </div>
          <div className={styles["header-center-container"]}>
            <div className={styles["header-center-actions"]}>
              <button
                type="button"
                onClick={openSongListMenu}
                className={`${styles["header-button"]} ${styles["header-song-list-button"]}`}
              >
                {activeSongListName}
              </button>
              <button
                type="button"
                onClick={onOpenNewSongListModal}
                className={`${styles["header-button"]} ${styles["header-new-list-button"]}`}
              >
                New List
              </button>
            </div>
          </div>
          <div className={styles["header-right-container"]}>
            <button onClick={openMenu} className={styles["header-button"]}>
              <img
                className={styles["header-button-icon"]}
                src={"./assets/menu30.svg"}
                alt="menu"
              />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PlaylistHeader;
