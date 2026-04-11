import {
  DEFAULT_AUDIO_EQ_SETTINGS,
} from "../models/AudioEq";
import MsgType from "../constants/msgType";
import type {
  PlaylistImportErrorCode,
  PlaylistImportRequest,
  PlaylistImportResponse,
} from "../models/PlaylistImport";
import MPlaylistItem from "../models/MPlaylistItem";
import { mergeImportedPlaylist } from "../utils/playlistMerge";
import { getStorage } from "../utils/syncStorage";

declare const chrome: {
  runtime: {
    onMessage: {
      addListener: (
        callback: (
          message: unknown,
          sender?: { tab?: { id?: number } }
        ) => void
      ) => void;
      removeListener: (
        callback: (
          message: unknown,
          sender?: { tab?: { id?: number } }
        ) => void
      ) => void;
    };
  };
  storage: {
    sync: {
      set: (items: { youtube_list: MPlaylistItem[] }) => Promise<void>;
    };
  };
  tabs: {
    create: (properties: {
      url: string;
      active: boolean;
    }) => Promise<{ id?: number }>;
    remove: (tabId: number) => Promise<void>;
  };
};

interface ImportedYoutubePlaylistEntry {
  videoId: string;
  title: string;
  channelName: string;
  durationSeconds?: number;
}

interface PlaylistImportError {
  name: string;
  message: string;
  stack?: string;
  code: PlaylistImportErrorCode;
  cause?: unknown;
}

type PlaylistFetchResponse = {
  ok: boolean;
  text: () => Promise<string>;
};

type PlaylistFetcher = (
  url: string,
  init?: RequestInit
) => Promise<PlaylistFetchResponse>;

type ReadPlaylist = () => Promise<MPlaylistItem[]>;
type WritePlaylist = (playlist: MPlaylistItem[]) => Promise<void>;
type ResolvePlaylist = (playlistUrl: string) => Promise<MPlaylistItem[]>;
type FetchPlaylist = (playlistUrl: string) => Promise<MPlaylistItem[]>;
type ExtractPlaylistFromTab = (playlistUrl: string) => Promise<MPlaylistItem[]>;

interface ImportYoutubePlaylistDependencies {
  readPlaylist?: ReadPlaylist;
  writePlaylist?: WritePlaylist;
  resolvePlaylist?: ResolvePlaylist;
}

interface ResolveYoutubePlaylistDependencies {
  fetchPlaylist?: FetchPlaylist;
  extractPlaylistFromTab?: ExtractPlaylistFromTab;
}

interface PlaylistVideoRendererField {
  simpleText?: unknown;
  runs?: Array<{ text?: unknown }>;
}

const YOUTUBE_PLAYLIST_PATH = "/playlist";
const YOUTUBE_WATCH_PATH = "/watch";
const PLAYLIST_FALLBACK_TIMEOUT_MS = 15_000;
const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);
const FALLBACK_IMPORT_ERROR_CODES = new Set<PlaylistImportErrorCode>([
  "parse-failed",
  "playlist-unavailable",
]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isSupportedYoutubeHostname = (hostname: string) => {
  return YOUTUBE_HOSTNAMES.has(hostname);
};

const readYoutubePlaylistId = (value: string) => {
  try {
    const url = new URL(value.trim());
    const listId = url.searchParams.get("list");

    if (!listId || !isSupportedYoutubeHostname(url.hostname)) {
      return undefined;
    }

    const pathname = url.pathname.replace(/\/+$/, "");
    const hasSupportedPath =
      pathname === YOUTUBE_PLAYLIST_PATH || pathname === YOUTUBE_WATCH_PATH;

    return hasSupportedPath ? listId : undefined;
  } catch {
    return undefined;
  }
};

const normalizeYoutubePlaylistUrl = (value: string) => {
  const playlistId = readYoutubePlaylistId(value);

  if (!playlistId) {
    throw new Error("Invalid YouTube playlist URL.");
  }

  return `https://www.youtube.com/playlist?list=${encodeURIComponent(
    playlistId
  )}`;
};

const isYoutubePlaylistUrl = (value: string) => {
  return typeof readYoutubePlaylistId(value) !== "undefined";
};

const createPlaylistImportError = (
  code: PlaylistImportError["code"],
  message: string,
  cause?: unknown
) => {
  const error = new Error(message) as PlaylistImportError;
  error.code = code;
  if (typeof cause !== "undefined") {
    error.cause = cause;
  }
  return error;
};

const isPlaylistImportError = (
  error: unknown
): error is PlaylistImportError => {
  return (
    isRecord(error) &&
    typeof error.message === "string" &&
    typeof error.code === "string"
  );
};

const readBalancedJsonObject = (text: string, startIndex: number) => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return undefined;
};

const readTextFromRendererField = (field: unknown) => {
  if (!isRecord(field)) {
    return undefined;
  }

  if (typeof field.simpleText === "string" && field.simpleText.trim()) {
    return field.simpleText.trim();
  }

  if (Array.isArray(field.runs)) {
    const text = field.runs
      .map((run) => (typeof run?.text === "string" ? run.text : ""))
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  return undefined;
};

const parseDurationLabelToSeconds = (value: string) => {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return undefined;
  }

  const parts = normalizedValue
    .split(":")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2 || parts.length > 3) {
    return undefined;
  }

  const values = parts.map((part) => Number.parseInt(part, 10));
  if (values.some((part) => !Number.isFinite(part) || part < 0)) {
    return undefined;
  }

  return values.reduce((total, part) => total * 60 + part, 0);
};

const readDurationSeconds = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return undefined;
    }

    if (/^\d+$/.test(trimmedValue)) {
      const seconds = Number.parseInt(trimmedValue, 10);
      return seconds > 0 ? seconds : undefined;
    }

    return parseDurationLabelToSeconds(trimmedValue);
  }

  return undefined;
};

const readImportedEntryFromRenderer = (
  renderer: unknown
): ImportedYoutubePlaylistEntry | undefined => {
  if (!isRecord(renderer)) {
    return undefined;
  }

  const videoId = typeof renderer.videoId === "string" ? renderer.videoId.trim() : "";
  const title = readTextFromRendererField(renderer.title);
  const channelName = readTextFromRendererField(renderer.shortBylineText);
  const durationSeconds =
    readDurationSeconds(renderer.lengthSeconds) ??
    readDurationSeconds(readTextFromRendererField(renderer.lengthText));

  if (!videoId || !title || !channelName) {
    return undefined;
  }

  return {
    videoId,
    title,
    channelName,
    durationSeconds,
  };
};

const collectPlaylistVideoRenderers = (
  value: unknown,
  renderers: unknown[] = []
) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPlaylistVideoRenderers(item, renderers);
    }
    return renderers;
  }

  if (!isRecord(value)) {
    return renderers;
  }

  if ("playlistVideoRenderer" in value) {
    renderers.push(value.playlistVideoRenderer);
  }

  for (const nestedValue of Object.values(value)) {
    collectPlaylistVideoRenderers(nestedValue, renderers);
  }

  return renderers;
};

const extractPlaylistEntriesFromHtml = (html: string) => {
  const initialDataIndex = html.indexOf("ytInitialData");
  if (initialDataIndex === -1) {
    throw createPlaylistImportError(
      "parse-failed",
      "YouTube playlist data could not be parsed."
    );
  }

  const jsonStartIndex = html.indexOf("{", initialDataIndex);
  if (jsonStartIndex === -1) {
    throw createPlaylistImportError(
      "parse-failed",
      "YouTube playlist data could not be parsed."
    );
  }

  const jsonText = readBalancedJsonObject(html, jsonStartIndex);
  if (!jsonText) {
    throw createPlaylistImportError(
      "parse-failed",
      "YouTube playlist data could not be parsed."
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw createPlaylistImportError(
      "parse-failed",
      "YouTube playlist data could not be parsed."
    );
  }

  return collectPlaylistVideoRenderers(parsed)
    .map(readImportedEntryFromRenderer)
    .filter((entry): entry is ImportedYoutubePlaylistEntry => Boolean(entry));
};

const buildImportedPlaylistItems = (
  entries: ImportedYoutubePlaylistEntry[]
) => {
  return entries.map<MPlaylistItem>((entry, index) => ({
    id: `${entry.videoId}-${index}`,
    title: entry.title,
    channelName: entry.channelName,
    url: `https://www.youtube.com/watch?v=${entry.videoId}`,
    videoId: entry.videoId,
    timestamp: 0,
    endTimestamp: undefined,
    maxDuration: entry.durationSeconds ?? 0,
    volume: 100,
    audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
  }));
};

const resolveYoutubePlaylistByFetch = async (
  playlistUrl: string,
  fetcher: PlaylistFetcher = fetch as PlaylistFetcher
) => {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeYoutubePlaylistUrl(playlistUrl);
  } catch (error) {
    throw createPlaylistImportError(
      "invalid-url",
      "Invalid YouTube playlist URL.",
      error
    );
  }

  let response: PlaylistFetchResponse;
  try {
    response = await fetcher(normalizedUrl);
  } catch (error) {
    throw createPlaylistImportError(
      "playlist-unavailable",
      "YouTube playlist is unavailable.",
      error
    );
  }

  if (!response.ok) {
    throw createPlaylistImportError(
      "playlist-unavailable",
      "YouTube playlist is unavailable."
    );
  }

  let html: string;
  try {
    html = await response.text();
  } catch (error) {
    throw createPlaylistImportError(
      "playlist-unavailable",
      "YouTube playlist is unavailable.",
      error
    );
  }

  let entries: ImportedYoutubePlaylistEntry[];
  try {
    entries = extractPlaylistEntriesFromHtml(html);
  } catch (error) {
    if (isPlaylistImportError(error)) {
      throw error;
    }

    throw createPlaylistImportError(
      "parse-failed",
      "YouTube playlist data could not be parsed.",
      error
    );
  }

  if (entries.length === 0) {
    throw createPlaylistImportError("playlist-empty", "YouTube playlist is empty.");
  }

  return buildImportedPlaylistItems(entries);
};

const shouldFallbackToTabExtraction = (error: unknown) => {
  return (
    isPlaylistImportError(error) &&
    FALLBACK_IMPORT_ERROR_CODES.has(error.code)
  );
};

const resolveYoutubePlaylistByTab = async (playlistUrl: string) => {
  let tabId: number | undefined;

  try {
    const tab = await chrome.tabs.create({
      url: playlistUrl,
      active: false,
    });
    tabId = tab.id;
  } catch (error) {
    throw createPlaylistImportError(
      "playlist-unavailable",
      "YouTube playlist is unavailable.",
      error
    );
  }

  if (typeof tabId !== "number") {
    throw createPlaylistImportError(
      "playlist-unavailable",
      "YouTube playlist is unavailable."
    );
  }

  try {
    return await new Promise<MPlaylistItem[]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(
          createPlaylistImportError(
            "playlist-unavailable",
            "YouTube playlist is unavailable."
          )
        );
      }, PLAYLIST_FALLBACK_TIMEOUT_MS);

      const onMessage = (
        message: unknown,
        sender?: { tab?: { id?: number } }
      ) => {
        if (
          sender?.tab?.id !== tabId ||
          !isRecord(message) ||
          message.name !== MsgType.ImportYoutubePlaylistFallbackResult
        ) {
          return;
        }

        cleanup();

        if (Array.isArray(message.items)) {
          resolve(message.items as MPlaylistItem[]);
          return;
        }

        if (typeof message.code === "string") {
          reject(
            createPlaylistImportError(
              message.code as PlaylistImportErrorCode,
              typeof message.message === "string"
                ? message.message
                : "YouTube playlist data could not be parsed."
            )
          );
          return;
        }

        reject(
          createPlaylistImportError(
            "parse-failed",
            "YouTube playlist data could not be parsed."
          )
        );
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(onMessage);
      };

      chrome.runtime.onMessage.addListener(onMessage);
    });
  } finally {
    try {
      await chrome.tabs.remove(tabId);
    } catch {
      // Ignore tab removal errors for temporary fallback tabs.
    }
  }
};

const resolveYoutubePlaylist = async (
  playlistUrl: string,
  dependencies: ResolveYoutubePlaylistDependencies = {}
) => {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeYoutubePlaylistUrl(playlistUrl);
  } catch (error) {
    throw createPlaylistImportError(
      "invalid-url",
      "Invalid YouTube playlist URL.",
      error
    );
  }

  const fetchPlaylist =
    dependencies.fetchPlaylist ?? resolveYoutubePlaylistByFetch;
  const extractPlaylistFromTab =
    dependencies.extractPlaylistFromTab ?? resolveYoutubePlaylistByTab;

  try {
    return await fetchPlaylist(normalizedUrl);
  } catch (error) {
    if (!shouldFallbackToTabExtraction(error)) {
      throw error;
    }

    return extractPlaylistFromTab(normalizedUrl);
  }
};

const readStoredPlaylist: ReadPlaylist = async () => {
  const playlist = await getStorage("youtube_list");
  return Array.isArray(playlist) ? (playlist as MPlaylistItem[]) : [];
};

const writeStoredPlaylist: WritePlaylist = async (playlist) => {
  await chrome.storage.sync.set({
    youtube_list: playlist,
  });
};

const importYoutubePlaylist = async (
  request: PlaylistImportRequest,
  dependencies: ImportYoutubePlaylistDependencies = {}
): Promise<PlaylistImportResponse> => {
  if (!isYoutubePlaylistUrl(request.playlistUrl)) {
    return {
      ok: false,
      code: "invalid-url",
      message: "Invalid YouTube playlist URL.",
    };
  }

  const readPlaylist = dependencies.readPlaylist ?? readStoredPlaylist;
  const writePlaylist = dependencies.writePlaylist ?? writeStoredPlaylist;
  const resolvePlaylist = dependencies.resolvePlaylist ?? resolveYoutubePlaylist;

  try {
    const [existingPlaylist, importedPlaylist] = await Promise.all([
      readPlaylist(),
      resolvePlaylist(request.playlistUrl),
    ]);
    const mergedPlaylist = mergeImportedPlaylist(
      existingPlaylist,
      importedPlaylist,
      request.mode
    );

    if (request.mode === "append" && mergedPlaylist.importedCount === 0) {
      return {
        ok: false,
        code: "playlist-unchanged",
        message: "All videos in this playlist are already saved.",
      };
    }

    try {
      await writePlaylist(mergedPlaylist.playlist);
    } catch (error) {
      return {
        ok: false,
        code: "write-failed",
        message: "Could not save imported playlist.",
      };
    }

    return {
      ok: true,
      importedCount: mergedPlaylist.importedCount,
      skippedDuplicates: mergedPlaylist.skippedDuplicates,
    };
  } catch (error) {
    if (isPlaylistImportError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      ok: false,
      code: "playlist-unavailable",
      message: "YouTube playlist is unavailable.",
    };
  }
};

export {
  buildImportedPlaylistItems,
  extractPlaylistEntriesFromHtml,
  importYoutubePlaylist,
  isYoutubePlaylistUrl,
  normalizeYoutubePlaylistUrl,
  resolveYoutubePlaylist,
  resolveYoutubePlaylistByFetch,
  parseDurationLabelToSeconds,
};
export type {
  ExtractPlaylistFromTab,
  FetchPlaylist,
  ImportYoutubePlaylistDependencies,
  ImportedYoutubePlaylistEntry,
  PlaylistImportError,
  ReadPlaylist,
  ResolvePlaylist,
  ResolveYoutubePlaylistDependencies,
  WritePlaylist,
};
