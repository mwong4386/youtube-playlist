import { useEffect, useRef, useState } from "react";
import type AudioEqSettings from "../../models/AudioEq";
import type AudioEqProfile from "../../models/AudioEqProfile";
import { AUDIO_EQ_PROFILE_STORAGE_KEY } from "../../models/AudioEqProfile";
import { GEMINI_API_KEY_STORAGE_KEY } from "../../models/GeminiSettings";
import PlaybackState, {
  createInitialPlaybackState,
  isPlaybackActive,
} from "../../models/PlaybackState";
import {
  ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY,
  type AnalyzeImportBatchState,
} from "../../models/PlaylistImport";
import type MPlaylistItem from "../../models/MPlaylistItem";
import {
  ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
  DEFAULT_SONG_LIST_NAME,
  SONG_LISTS_STORAGE_KEY,
  type SongListsState,
} from "../../models/SongList";
import {
  createAudioEqProfile,
  deleteAudioEqProfile,
  readStoredAudioEqProfiles,
  updateAudioEqProfileList,
} from "../../utils/audioEqProfiles";
import { readStoredGeminiApiKey } from "../../utils/geminiSettings";
import {
  buildDefaultSongListsState,
  normalizeSongListsState,
  updateActiveSongListItems as updateStoredActiveSongListItems,
} from "../../utils/songLists";
import { getStorageMap } from "../../utils/syncStorage";

const DEFAULT_SONG_LISTS_STATE = buildDefaultSongListsState();

const usePlaylistStorageSync = () => {
  const [songListsState, setSongListsState] = useState<SongListsState>(
    DEFAULT_SONG_LISTS_STATE,
  );
  const [activeSongListName, setActiveSongListName] = useState(
    DEFAULT_SONG_LISTS_STATE.activeSongListName,
  );
  const [playbackState, setPlaybackState] = useState<PlaybackState>(
    createInitialPlaybackState(),
  );
  const [playing, setPlaying] = useState(false);
  const [playingId, setPlayingId] = useState<string | undefined>(undefined);
  const [audioEqProfiles, setAudioEqProfiles] = useState<AudioEqProfile[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [analyzeImportBatchState, setAnalyzeImportBatchState] =
    useState<AnalyzeImportBatchState | null>(null);
  const songListsStateRef = useRef(songListsState);
  const audioEqProfilesRef = useRef(audioEqProfiles);

  const syncPlaybackState = (state?: PlaybackState | null) => {
    const nextState = state || createInitialPlaybackState();
    setPlaybackState(nextState);
    setPlaying(isPlaybackActive(nextState.status));
    setPlayingId(nextState.currentItemId || undefined);
  };

  const applySongListsState = (nextSongListsState: SongListsState) => {
    songListsStateRef.current = nextSongListsState;
    setSongListsState(nextSongListsState);
    setActiveSongListName(nextSongListsState.activeSongListName);
  };

  const writeSongListsState = (
    nextSongListsState: SongListsState,
    callback?: () => void,
  ) => {
    applySongListsState(nextSongListsState);
    chrome.storage.sync.set(
      {
        [SONG_LISTS_STORAGE_KEY]: nextSongListsState.songLists,
        [ACTIVE_SONG_LIST_NAME_STORAGE_KEY]:
          nextSongListsState.activeSongListName,
      },
      callback,
    );
  };

  const loadSongListsState = async (isMounted?: () => boolean) => {
    const storedSongLists = await getStorageMap([
      SONG_LISTS_STORAGE_KEY,
      ACTIVE_SONG_LIST_NAME_STORAGE_KEY,
    ]);
    const nextSongListsState = normalizeSongListsState(storedSongLists);

    if (isMounted && !isMounted()) {
      return;
    }

    applySongListsState(nextSongListsState);

    if (
      !(SONG_LISTS_STORAGE_KEY in storedSongLists) ||
      !(ACTIVE_SONG_LIST_NAME_STORAGE_KEY in storedSongLists)
    ) {
      chrome.storage.sync.set({
        [SONG_LISTS_STORAGE_KEY]: nextSongListsState.songLists,
        [ACTIVE_SONG_LIST_NAME_STORAGE_KEY]:
          nextSongListsState.activeSongListName,
      });
    }
  };

  const updateSongListsState = (
    updater: (currentSongListsState: SongListsState) => SongListsState,
    callback?: () => void,
  ) => {
    const nextSongListsState = updater(songListsStateRef.current);
    writeSongListsState(nextSongListsState, callback);
  };

  const updateActiveSongListItems = (
    updater: (currentItems: MPlaylistItem[]) => MPlaylistItem[],
    callback?: () => void,
  ) => {
    updateSongListsState((currentSongListsState) => {
      const currentItems =
        currentSongListsState.songLists[currentSongListsState.activeSongListName]
          ?.items ??
        currentSongListsState.songLists[DEFAULT_SONG_LIST_NAME]?.items ??
        [];

      return updateStoredActiveSongListItems(
        currentSongListsState,
        updater(currentItems),
      );
    }, callback);
  };

  const updateStoredAudioEqProfiles = (
    updater: (currentProfiles: AudioEqProfile[]) => AudioEqProfile[],
  ) => {
    const nextProfiles = updater(audioEqProfilesRef.current);
    audioEqProfilesRef.current = nextProfiles;
    setAudioEqProfiles(nextProfiles);
    chrome.storage.sync.set({
      [AUDIO_EQ_PROFILE_STORAGE_KEY]: nextProfiles,
    });
  };

  const createAudioEqProfileEntry = (name: string, audioEq: AudioEqSettings) => {
    updateStoredAudioEqProfiles((currentProfiles) =>
      updateAudioEqProfileList(
        currentProfiles,
        createAudioEqProfile(name, audioEq),
      ),
    );
  };

  const updateAudioEqProfileEntry = (profile: AudioEqProfile) => {
    updateStoredAudioEqProfiles((currentProfiles) =>
      updateAudioEqProfileList(currentProfiles, profile),
    );
  };

  const deleteAudioEqProfileEntry = (id: string) => {
    updateStoredAudioEqProfiles((currentProfiles) =>
      deleteAudioEqProfile(currentProfiles, id),
    );
  };

  const saveGeminiApiKey = async (value: string) => {
    await chrome.storage.local.set({
      [GEMINI_API_KEY_STORAGE_KEY]: value,
    });
  };

  const removeGeminiApiKey = async () => {
    await chrome.storage.local.remove(GEMINI_API_KEY_STORAGE_KEY);
  };

  const clearAnalyzeImportBatchState = async () => {
    await chrome.storage.local.remove(ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY);
  };

  useEffect(() => {
    let mounted = true;

    void loadSongListsState(() => mounted);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    chrome.storage.sync.get([AUDIO_EQ_PROFILE_STORAGE_KEY], (result) => {
      if (!mounted) {
        return;
      }

      const nextProfiles = readStoredAudioEqProfiles(result);
      audioEqProfilesRef.current = nextProfiles;
      setAudioEqProfiles(nextProfiles);
    });

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
      [ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY],
      (result) => {
        setAnalyzeImportBatchState(
          (result[ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY] as
            | AnalyzeImportBatchState
            | undefined) || null,
        );
      },
    );
  }, []);

  useEffect(() => {
    chrome.storage.local.get(
      ["playbackState", "isPlaying", "playingItem"],
      (result) => {
        syncPlaybackState(result["playbackState"] as PlaybackState | null);
        setPlaying(
          result["isPlaying"] === undefined
            ? isPlaybackActive(
                (
                  (result["playbackState"] as PlaybackState | null) ||
                  createInitialPlaybackState()
                ).status,
              )
            : !!result["isPlaying"],
        );
        setPlayingId(
          (result["playingItem"] as { id?: string } | undefined)?.id ||
            (result["playbackState"] as PlaybackState | undefined)
              ?.currentItemId ||
            undefined,
        );
      },
    );
  }, []);

  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: "sync" | "local" | "managed" | "session",
    ) => {
      if ("playbackState" in changes) {
        syncPlaybackState(changes["playbackState"].newValue as PlaybackState);
      }
      if ("playingItem" in changes) {
        setPlayingId(
          (changes["playingItem"].newValue as { id?: string } | undefined)?.id,
        );
      }
      if ("isPlaying" in changes) {
        setPlaying(!!changes["isPlaying"].newValue);
      }
      if (
        namespace === "sync" &&
        (SONG_LISTS_STORAGE_KEY in changes ||
          ACTIVE_SONG_LIST_NAME_STORAGE_KEY in changes)
      ) {
        void loadSongListsState();
      }
      if (namespace === "sync" && AUDIO_EQ_PROFILE_STORAGE_KEY in changes) {
        const nextProfiles =
          typeof changes[AUDIO_EQ_PROFILE_STORAGE_KEY].newValue === "undefined"
            ? readStoredAudioEqProfiles({})
            : readStoredAudioEqProfiles({
                [AUDIO_EQ_PROFILE_STORAGE_KEY]:
                  changes[AUDIO_EQ_PROFILE_STORAGE_KEY].newValue,
              });
        audioEqProfilesRef.current = nextProfiles;
        setAudioEqProfiles(nextProfiles);
      }
      if (namespace === "local" && GEMINI_API_KEY_STORAGE_KEY in changes) {
        setGeminiApiKey(
          readStoredGeminiApiKey({
            [GEMINI_API_KEY_STORAGE_KEY]:
              changes[GEMINI_API_KEY_STORAGE_KEY].newValue,
          }),
        );
      }
      if (
        namespace === "local" &&
        ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY in changes
      ) {
        setAnalyzeImportBatchState(
          (changes[ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY].newValue as
            | AnalyzeImportBatchState
            | undefined) || null,
        );
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  return {
    songListsState,
    activeSongListName,
    playbackState,
    playing,
    playingId,
    audioEqProfiles,
    geminiApiKey,
    analyzeImportBatchState,
    updateSongListsState,
    updateActiveSongListItems,
    createAudioEqProfileEntry,
    updateAudioEqProfileEntry,
    deleteAudioEqProfileEntry,
    saveGeminiApiKey,
    removeGeminiApiKey,
    clearAnalyzeImportBatchState,
  };
};

export default usePlaylistStorageSync;
