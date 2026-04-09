import { useEffect, useState } from "react";
import AudioEqSettings from "../../models/AudioEq";
import AudioEqProfile, {
  AUDIO_EQ_PROFILE_STORAGE_KEY,
} from "../../models/AudioEqProfile";
import { GEMINI_API_KEY_STORAGE_KEY } from "../../models/GeminiSettings";
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
import MsgType from "../../constants/msgType";
import { DEV_PLAYLIST } from "../../dev/devPlaylist";
import { ThemePreference } from "../../utils/theme";
import SettingsModal from "../settings/SettingsModal";
import Modal from "../modal/Modal";
import {
  cancelDeleteAllConfirmation,
  confirmDeleteAllConfirmation,
} from "../../utils/playlistActions";

const shouldSeedPlaylist = import.meta.env.VITE_SEED_PLAYLIST === "true";

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
  const [settingsActive, setSettingsActive] = useState(false);
  const [deleteAllModalActive, setDeleteAllModalActive] = useState(false);
  const [audioEqProfiles, setAudioEqProfiles] = useState<AudioEqProfile[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState("");

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
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const onDeleteAll = () => {
    setDeleteAllModalActive(true);
  };

  const closeDeleteAllModal = () => {
    cancelDeleteAllConfirmation(() => {
      setDeleteAllModalActive(false);
    });
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
  return (
    <>
      <PlaylistHeader
        playlist={playlist}
        onDelete={onDeleteAll}
        onOpenSettings={() => {
          setSettingsActive(true);
        }}
        themePreference={themePreference}
        setThemePreference={setThemePreference}
      />
      {playlist.length === 0 ? (
        <div className={styles["empty-container"]}>
          <p className={styles["empty-message"]}>The playlist is empty</p>
        </div>
      ) : (
        <div className={styles["playlist-container"]}>
          {playlist.map((item) => {
            return (
              <Draggable
                key={item.id}
                id={item.id}
                isDragging={draggingElementId === item.id}
                setDraggingElement={setDraggingElement}
                onMoveTo={onMoveTo}
              >
                <PlaylistItem
                  key={item.id}
                  item={item}
                  isPlaying={playing}
                  IPlaying={playingId === item.id}
                  selectItemId={setSelectItemId}
                />
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
            item={playlist.find((x) => x.id === selectItemId)}
          />
        </div>
      )}
      <SettingsModal
        active={settingsActive}
        close={() => {
          setSettingsActive(false);
        }}
        audioEqProfiles={audioEqProfiles}
        onCreateProfile={onCreateProfile}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={onDeleteProfile}
        geminiApiKey={geminiApiKey}
        onSaveGeminiApiKey={onSaveGeminiApiKey}
        onRemoveGeminiApiKey={onRemoveGeminiApiKey}
      />
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
