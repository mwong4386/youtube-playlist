const ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY = "analyzeImportBatchState";

type PlaylistImportMode = "append" | "replace";

interface PlaylistImportRequest {
  playlistUrl: string;
  mode: PlaylistImportMode;
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
  PlaylistImportFailure,
  PlaylistImportErrorCode,
  PlaylistImportMode,
  PlaylistImportRequest,
  PlaylistImportResponse,
  PlaylistImportSuccess,
};
export { ANALYZE_IMPORT_BATCH_STATE_STORAGE_KEY };
