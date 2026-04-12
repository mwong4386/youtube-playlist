import { useEffect, useState } from "react";
import AudioEqSettings from "../../models/AudioEq";
import AudioEqProfile, {
  AUDIO_EQ_PROFILE_STORAGE_KEY,
} from "../../models/AudioEqProfile";
import {
  GEMINI_API_KEY_STORAGE_KEY,
  type GeminiAnalyzeFailure,
  type GeminiAnalyzeSuccess,
} from "../../models/GeminiSettings";
import MPlaylistItem from "../../models/MPlaylistItem";
import PlaybackState, {
  createInitialPlaybackState,
  isPlaybackActive,
} from "../../models/PlaybackState";
import { getStorage } from "../../utils/syncStorage";
import {
  createAudioEqProfile,
  deleteAudioEqProfile,
  readStoredAudioEqProfiles,
  updateAudioEqProfileList,
} from "../../utils/audioEqProfiles";
import { readStoredGeminiApiKey } from "../../utils/geminiSettings";
import PlaylistHeader from "./PlaylistHeader";
import PlaylistItem from "./PlaylistItem";
import styles from "./Playlist.module.css";
import Draggable from "../draggable/Draggable";
import InfoModal from "../modal/InfoModal";
import { normalizeAnalyzeSongBoundariesResponse } from "./geminiAnalyzeResponse";
import MsgType from "../../constants/msgType";
import { DEV_PLAYLIST } from "../../dev/devPlaylist";
import { ThemePreference } from "../../utils/theme";
import SettingsModal from "../settings/SettingsModal";
import GeminiSettingsModal from "../gemini/GeminiSettingsModal";
import Modal from "../modal/Modal";
import {
  ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  type AnalyzeImportBatchState,
  type PlaylistImportRequest,
  type PlaylistImportResponse,
} from "../../models/PlaylistImport";
import {
  cancelDeleteAllConfirmation,
  confirmDeleteAllConfirmation,
  deleteSelectedPlaylistItems,
} from "../../utils/playlistActions";
import PlaylistImportModal from "./PlaylistImportModal";
import {
  resolvePlaylistImportSubmission,
  type PlaylistImportSubmissionResult,
} from "./playlistImportResult";
import {
  getAnalyzeImportBannerViewModel,
  getAnalyzeImportBannerVisibilityKey,
  shouldClearAnalyzeImportBatchStateOnDismiss,
} from "./analyzeImportBanner";
import {
  areAllPlaylistItemsSelected,
  clearSelectedItemIds,
  getPlaylistHeaderMode,
  toggleAllSelectedItemIds,
  toggleSelectedItemId,
} from "./playlistSelection";

const shouldSeedPlaylist = import.meta.env.VITE_SEED_PLAYLIST === "true";
const DISMISSED_ANALYZE_IMPORT_BANNER_STORAGE_KEY =
  "dismissedAnalyzeImportBannerKey";

interface Props {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const Playlist = ({ themePreference, setThemePreference }: Props) => {
  const [playlist, setPlaylist] = useState<MPlaylistItem[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(
    createInitialPlaybackState()
  );
  const [playing, setPlaying] = useState<boolean>(false);
  const [playingId, setPlayingId] = useState<string | undefined>(undefined);
  const [draggingElementId, setDraggingElement] = useState<string | undefined>(
    undefined
  );
  const [selectItemId, setSelectItemId] = useState<string | undefined>(
    undefined
  ); //for opening the info modal
  const [eqSettingsActive, setEqSettingsActive] = useState(false);
  const [geminiSettingsActive, setGeminiSettingsActive] = useState(false);
  const [playlistImportModalActive, setPlaylistImportModalActive] =
    useState(false);
  const [deleteAllModalActive, setDeleteAllModalActive] = useState(false);
  const [selectionActionsModalActive, setSelectionActionsModalActive] =
    useState(false);
  const [audioEqProfiles, setAudioEqProfiles] = useState<AudioEqProfile[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [analyzeImportBatchState, setAnalyzeImportBatchState] =
    useState<AnalyzeImportBatchState | null>(null);
  const [dismissedAnalyzeImportBannerKey, setDismissedAnalyzeImportBannerKey] =
    useState<string | null>(null);

  const syncPlaybackState = (state?: PlaybackState | null) => {
    const nextState = state || createInitialPlaybackState();
    setPlaybackState(nextState);
    setPlaying(isPlaybackActive(nextState.status));
    setPlayingId(nextState.currentItemId || undefined);
  };

  useEffect(() => {
    const getPlaylist = async () => {
      const storedList = (await getStorage("youtube_list")) as
        | MPlaylistItem[]
        | undefined;
      if (storedList && storedList.length > 0) {
        setPlaylist(storedList);
        return;
      }

      if (shouldSeedPlaylist) {
        chrome.storage.sync.set({
          youtube_list: DEV_PLAYLIST,
        });
        setPlaylist(DEV_PLAYLIST);
        return;
      }

      const list: MPlaylistItem[] = [];
      setPlaylist(list);
    };
    getPlaylist();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadAudioEqProfiles = () => {
      chrome.storage.sync.get([AUDIO_EQ_PROFILE_STORAGE_KEY], (result) => {
        if (!mounted) {
          return;
        }

        setAudioEqProfiles(readStoredAudioEqProfiles(result));
      });
    };

    loadAudioEqProfiles();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    chrome.storage.local.get([GEMINI_API_KEY_STORAGE_KEY], (result) => {
      setGeminiApiKey(readStoredGeminiApiKey(result));
    });
  }, []);

  useEffect(() => {
    setDismissedAnalyzeImportBannerKey(
      window.localStorage.getItem(DISMISSED_ANALYZE_IMPORT_BANNER_STORAGE_KEY)
    );
  }, []);

  useEffect(() => {
    chrome.storage.local.get(
      [ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY],
      (result) => {
        setAnalyzeImportBatchState(
          (result[ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY] as
            | AnalyzeImportBatchState
            | undefined) || null
        );
      }
    );
  }, []);

  useEffect(() => {
    chrome.storage.local.get(
      ["playbackState", "isPlaying", "playingItem"],
      (result) => {
      syncPlaybackState(result["playbackState"]);
        setPlaying(
          result["isPlaying"] === undefined
            ? isPlaybackActive(
                (result["playbackState"] || createInitialPlaybackState()).status
              )
            : !!result["isPlaying"]
        );
        setPlayingId(
          result["playingItem"]?.id ||
            result["playbackState"]?.currentItemId ||
            undefined
        );
      }
    );
  }, []);

  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: "sync" | "local" | "managed" | "session"
    ) => {
      if ("playbackState" in changes) {
        syncPlaybackState(changes["playbackState"].newValue);
      }
      if ("playingItem" in changes) {
        setPlayingId(changes["playingItem"].newValue?.id);
      }
      if ("isPlaying" in changes) {
        setPlaying(!!changes["isPlaying"].newValue);
      }
      if ("youtube_list" in changes) {
        setPlaylist(changes["youtube_list"].newValue || []);
      }
      if (
        namespace === "sync" &&
        AUDIO_EQ_PROFILE_STORAGE_KEY in changes
      ) {
        setAudioEqProfiles(
          typeof changes[AUDIO_EQ_PROFILE_STORAGE_KEY].newValue === "undefined"
            ? readStoredAudioEqProfiles({})
            : readStoredAudioEqProfiles({
                [AUDIO_EQ_PROFILE_STORAGE_KEY]:
                  changes[AUDIO_EQ_PROFILE_STORAGE_KEY].newValue,
              })
        );
      }
      if (
        namespace === "local" &&
        GEMINI_API_KEY_STORAGE_KEY in changes
      ) {
        setGeminiApiKey(
          readStoredGeminiApiKey({
            [GEMINI_API_KEY_STORAGE_KEY]:
              changes[GEMINI_API_KEY_STORAGE_KEY].newValue,
          })
        );
      }
      if (
        namespace === "local" &&
        ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY in changes
      ) {
        setAnalyzeImportBatchState(
          (changes[ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY].newValue as
            | AnalyzeImportBatchState
            | undefined) || null
        );
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    setSelectedItemIds((currentSelectedItemIds) => {
      const playlistItemIds = new Set(playlist.map((item) => item.id));
      const nextSelectedItemIds = currentSelectedItemIds.filter((itemId) =>
        playlistItemIds.has(itemId)
      );

      return nextSelectedItemIds.length === currentSelectedItemIds.length
        ? currentSelectedItemIds
        : nextSelectedItemIds;
    });
  }, [playlist]);

  useEffect(() => {
    if (selectedItemIds.length === 0 && selectionActionsModalActive) {
      setSelectionActionsModalActive(false);
    }
  }, [selectedItemIds, selectionActionsModalActive]);

  const onDeleteAll = () => {
    setDeleteAllModalActive(true);
  };

  const closePlaylistImportModal = () => {
    setPlaylistImportModalActive(false);
  };

  const closeDeleteAllModal = () => {
    cancelDeleteAllConfirmation(() => {
      setDeleteAllModalActive(false);
    });
  };

  const closeSelectionActionsModal = () => {
    setSelectionActionsModalActive(false);
  };

  const clearSelection = () => {
    setSelectedItemIds((currentSelectedItemIds) =>
      clearSelectedItemIds(currentSelectedItemIds)
    );
  };

  const confirmDeleteAll = () => {
    confirmDeleteAllConfirmation(
      () => {
        chrome.storage.sync.remove("youtube_list");
      },
      () => {
        setDeleteAllModalActive(false);
      }
    );
  };

  const saveProfiles = (profiles: AudioEqProfile[]) => {
    setAudioEqProfiles(profiles);
    chrome.storage.sync.set({
      [AUDIO_EQ_PROFILE_STORAGE_KEY]: profiles,
    });
  };

  const onCreateProfile = (name: string, audioEq: AudioEqSettings) => {
    saveProfiles(
      updateAudioEqProfileList(
        audioEqProfiles,
        createAudioEqProfile(name, audioEq)
      )
    );
  };

  const onUpdateProfile = (profile: AudioEqProfile) => {
    saveProfiles(updateAudioEqProfileList(audioEqProfiles, profile));
  };

  const onDeleteProfile = (id: string) => {
    saveProfiles(deleteAudioEqProfile(audioEqProfiles, id));
  };

  const onSaveGeminiApiKey = async (value: string) => {
    await chrome.storage.local.set({
      [GEMINI_API_KEY_STORAGE_KEY]: value,
    });
  };

  const onRemoveGeminiApiKey = async () => {
    await chrome.storage.local.remove(GEMINI_API_KEY_STORAGE_KEY);
  };

  const analyzeSongBoundaries = (itemId: string) => {
    console.log("[Gemini analyze]", "sending runtime message", {
      itemId,
      messageName: MsgType.AnalyzeSongBoundaries,
      runtimeId: chrome.runtime.id,
    });

    return new Promise<GeminiAnalyzeSuccess | GeminiAnalyzeFailure>(
      (resolve) => {
        chrome.runtime.sendMessage(
          { name: MsgType.AnalyzeSongBoundaries, itemId },
          (response) => {
            resolve(
              normalizeAnalyzeSongBoundariesResponse(
                response,
                chrome.runtime.lastError,
                console
              )
            );
          }
        );
      }
    );
  };

  const importYoutubePlaylist = (
    request: PlaylistImportRequest
  ): Promise<PlaylistImportSubmissionResult> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          name: MsgType.ImportYoutubePlaylist,
          playlistUrl: request.playlistUrl,
          mode: request.mode,
        },
        (response: PlaylistImportResponse | undefined) => {
          const result = resolvePlaylistImportSubmission(
            response,
            chrome.runtime.lastError ?? null
          );

          if (result.ok) {
            closePlaylistImportModal();
          }

          resolve(result);
        }
      );
    });
  };

  const onSave = (
    id: string,
    timestamp: number,
    endTimestamp: number | undefined,
    volume: number,
    audioEq: AudioEqSettings
  ) => {
    const item = playlist.find((x) => x.id === id);
    if (!item) return;
    item.timestamp = timestamp;
    item.endTimestamp = endTimestamp;
    item.volume = volume;
    item.audioEq = audioEq;
    chrome.storage.sync.set({
      youtube_list: playlist,
    });
  };
  const onMoveTo = (toId: string) => {
    if (draggingElementId && draggingElementId !== toId) {
      // const oldIndex = playlist.findIndex((x) => x.id === draggingElement);
      const item = playlist.find((x) => x.id === draggingElementId);
      if (!item) return;
      const newIndex = playlist.findIndex((x) => x.id === toId);
      const temp = playlist.filter((x) => x.id !== draggingElementId);
      temp.splice(newIndex, 0, item);
      chrome.storage.sync.set({
        youtube_list: temp,
      });
    }
  };
  const onvolumechange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (
      playing &&
      selectItemId === playingId
    ) {
      chrome.runtime.sendMessage({
        name: MsgType.VolumeChange,
        volume: event.currentTarget.value,
      });
    }
  };
  const onAudioEqChange = (audioEq: Partial<AudioEqSettings>) => {
    if (playing && selectItemId === playingId) {
      chrome.runtime.sendMessage({
        name: MsgType.AudioEqChange,
        audioEq,
      });
    }
  };

  const onOpenSelectionActions = () => {
    if (selectedItemIds.length === 0) {
      return;
    }

    setSelectionActionsModalActive(true);
  };

  const onDeleteSelected = () => {
    if (selectedItemIds.length === 0) {
      return;
    }

    chrome.storage.sync.set(
      {
        youtube_list: deleteSelectedPlaylistItems(playlist, selectedItemIds),
      },
      () => {
        if (chrome.runtime.lastError) {
          return;
        }

        clearSelection();
        closeSelectionActionsModal();
      }
    );
  };

  const onAnalyzeSelected = () => {
    if (selectedItemIds.length === 0) {
      return;
    }

    chrome.runtime.sendMessage({
      name: MsgType.AnalyzeImportedPlaylist,
      itemIds: selectedItemIds,
    });
    clearSelection();
    closeSelectionActionsModal();
  };

  const analyzeImportBanner = getAnalyzeImportBannerViewModel(
    analyzeImportBatchState
  );
  const analyzeImportBannerVisibilityKey =
    getAnalyzeImportBannerVisibilityKey(analyzeImportBatchState);
  const showAnalyzeImportBatchState =
    !!analyzeImportBanner &&
    analyzeImportBannerVisibilityKey !== dismissedAnalyzeImportBannerKey;
  const headerMode = getPlaylistHeaderMode(selectedItemIds);
  const allSelected = areAllPlaylistItemsSelected(playlist, selectedItemIds);
  const someSelected = selectedItemIds.length > 0;

  return (
    <>
      <PlaylistHeader
        playlist={playlist}
        onDelete={onDeleteAll}
        onOpenEqSettings={() => {
          setEqSettingsActive(true);
        }}
        onOpenGeminiSettings={() => {
          setGeminiSettingsActive(true);
        }}
        onOpenImportModal={() => {
          setPlaylistImportModalActive(true);
        }}
        onClearSelection={clearSelection}
        onToggleSelectAll={() => {
          setSelectedItemIds((currentSelectedItemIds) =>
            toggleAllSelectedItemIds(playlist, currentSelectedItemIds)
          );
        }}
        onOpenSelectionActions={onOpenSelectionActions}
        allSelected={allSelected}
        someSelected={someSelected}
        selectedCount={selectedItemIds.length}
        themePreference={themePreference}
        setThemePreference={setThemePreference}
      />
      <div className={styles["content-container"]}>
        {playlist.length === 0 ? (
          <div className={styles["empty-container"]}>
            <p className={styles["empty-message"]}>The playlist is empty</p>
          </div>
        ) : (
          <div className={styles["playlist-container"]}>
            {showAnalyzeImportBatchState ? (
              <div className={styles["analyze-import-banner-container"]}>
                <div className={styles["analyze-import-banner"]}>
                  <div className={styles["analyze-import-banner-header"]}>
                    <p className={styles["analyze-import-banner-title"]}>
                      {analyzeImportBanner?.title}
                    </p>
                    {analyzeImportBanner?.dismissible ? (
                      <button
                        type="button"
                        aria-label="Dismiss import analysis status"
                        className={styles["analyze-import-banner-close-button"]}
                        onClick={() => {
                          if (analyzeImportBannerVisibilityKey) {
                            window.localStorage.setItem(
                              DISMISSED_ANALYZE_IMPORT_BANNER_STORAGE_KEY,
                              analyzeImportBannerVisibilityKey
                            );
                            setDismissedAnalyzeImportBannerKey(
                              analyzeImportBannerVisibilityKey
                            );
                          }

                          if (
                            shouldClearAnalyzeImportBatchStateOnDismiss(
                              analyzeImportBatchState
                            )
                          ) {
                            chrome.storage.local.remove(
                              ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY
                            );
                          }
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                  <p className={styles["analyze-import-banner-detail"]}>
                    {analyzeImportBanner?.detail}
                  </p>
                </div>
              </div>
            ) : null}
            {playlist.map((item) => {
              const playlistItem = (
                <PlaylistItem
                  key={item.id}
                  item={item}
                  isPlaying={playing}
                  IPlaying={playingId === item.id}
                  onToggleSelected={(itemId) => {
                    setSelectedItemIds((currentSelectedItemIds) =>
                      toggleSelectedItemId(currentSelectedItemIds, itemId)
                    );
                  }}
                  selected={selectedItemIds.includes(item.id)}
                  selectItemId={setSelectItemId}
                />
              );

              return headerMode === "selection" ? (
                playlistItem
              ) : (
                <Draggable
                  key={item.id}
                  id={item.id}
                  isDragging={draggingElementId === item.id}
                  setDraggingElement={setDraggingElement}
                  onMoveTo={onMoveTo}
                >
                  {playlistItem}
                </Draggable>
              );
            })}
            <InfoModal
              active={!!selectItemId}
              close={() => {
                setSelectItemId(undefined);
              }}
              onvolumechange={onvolumechange}
              onAudioEqChange={onAudioEqChange}
              profiles={audioEqProfiles}
              save={onSave}
              onAnalyzeSongBoundaries={analyzeSongBoundaries}
              item={playlist.find((x) => x.id === selectItemId)}
            />
          </div>
        )}
      </div>
      <SettingsModal
        active={eqSettingsActive}
        close={() => {
          setEqSettingsActive(false);
        }}
        audioEqProfiles={audioEqProfiles}
        onCreateProfile={onCreateProfile}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={onDeleteProfile}
      />
      <GeminiSettingsModal
        active={geminiSettingsActive}
        close={() => {
          setGeminiSettingsActive(false);
        }}
        geminiApiKey={geminiApiKey}
        onSaveGeminiApiKey={onSaveGeminiApiKey}
        onRemoveGeminiApiKey={onRemoveGeminiApiKey}
      />
      <PlaylistImportModal
        active={playlistImportModalActive}
        close={closePlaylistImportModal}
        onSubmit={importYoutubePlaylist}
      />
      <Modal
        active={selectionActionsModalActive}
        close={closeSelectionActionsModal}
      >
        <div className={styles["selection-actions-modal"]}>
          <div className={styles["selection-actions-modal-header"]}>
            <p className={styles["selection-actions-modal-text"]}>
              Actions for {selectedItemIds.length} selected
              {selectedItemIds.length === 1 ? " song" : " songs"}
            </p>
            <button
              type="button"
              className={styles["selection-actions-close-button"]}
              onClick={closeSelectionActionsModal}
              aria-label="Close selected song actions"
            >
              x
            </button>
          </div>
          <div className={styles["selection-actions-modal-actions"]}>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={onAnalyzeSelected}
            >
              Analyze Timing
            </button>
            <button
              type="button"
              className={styles["selection-actions-delete-button"]}
              onClick={onDeleteSelected}
            >
              Delete Songs
            </button>
            <button
              type="button"
              className={styles["selection-actions-cancel-button"]}
              onClick={closeSelectionActionsModal}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      <Modal active={deleteAllModalActive} close={closeDeleteAllModal}>
        <div className={styles["delete-all-modal"]}>
          <div className={styles["delete-all-modal-header"]}>
            <div>
              <h2 className={styles["delete-all-modal-title"]}>Delete all songs</h2>
              <p className={styles["delete-all-modal-text"]}>
                This will remove every song from your playlist.
              </p>
            </div>
            <button
              type="button"
              className={styles["delete-all-close-button"]}
              onClick={closeDeleteAllModal}
              aria-label="Close delete all confirmation"
            >
              x
            </button>
          </div>
          <div className={styles["delete-all-modal-actions"]}>
            <button
              type="button"
              className={styles["delete-all-cancel-button"]}
              onClick={closeDeleteAllModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles["delete-all-confirm-button"]}
              onClick={confirmDeleteAll}
            >
              Delete all
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Playlist;
