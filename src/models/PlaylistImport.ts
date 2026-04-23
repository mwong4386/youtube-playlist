import type MPlaylistItem from "./MPlaylistItem";

const ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY = "analyzeImportBatchState";

type PlaylistImportMode = "append" | "replace";

interface PlaylistImportRequest {
  playlistUrl: string;
  mode: PlaylistImportMode;
}

interface PlaylistImportPreviewRequest {
  playlistUrl: string;
}

interface AnalyzeImportBatchRequest {
  itemIds?: string[];
  scope?: "default" | "uncalibrated";
}

interface PlaylistImportSuccess {
  ok: true;
  importedCount: number;
  skippedDuplicates: number;
}

type PlaylistImportErrorCode =
  | "invalid-url"
  | "playlist-unavailable"
  | "playlist-empty"
  | "parse-failed"
  | "playlist-unchanged"
  | "write-failed";

interface PlaylistImportFailure {
  ok: false;
  code: PlaylistImportErrorCode;
  message: string;
}

type PlaylistImportResponse = PlaylistImportSuccess | PlaylistImportFailure;

interface PlaylistImportPreviewSuccess {
  ok: true;
  items: MPlaylistItem[];
}

type PlaylistImportPreviewResponse =
  | PlaylistImportPreviewSuccess
  | PlaylistImportFailure;

interface AnalyzeImportBatchState {
  active: boolean;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pendingItemIds: string[];
  completedItemIds: string[];
  failedItemIds: string[];
  currentItemId?: string;
}

export type {
  AnalyzeImportBatchState,
  AnalyzeImportBatchRequest,
  PlaylistImportFailure,
  PlaylistImportErrorCode,
  PlaylistImportMode,
  PlaylistImportPreviewRequest,
  PlaylistImportPreviewResponse,
  PlaylistImportPreviewSuccess,
  PlaylistImportRequest,
  PlaylistImportResponse,
  PlaylistImportSuccess,
};
export { ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY };
