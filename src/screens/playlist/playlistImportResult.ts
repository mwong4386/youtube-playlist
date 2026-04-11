import type { PlaylistImportResponse } from "../../models/PlaylistImport";

const DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE =
  "Could not import YouTube playlist.";

interface PlaylistImportSubmissionResult {
  ok: boolean;
  message?: string;
}

const resolvePlaylistImportSubmission = (
  response?: PlaylistImportResponse,
  runtimeError?: Pick<Error, "message"> | null
): PlaylistImportSubmissionResult => {
  if (runtimeError) {
    return {
      ok: false,
      message:
        runtimeError.message || DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE,
    };
  }

  if (!response) {
    return {
      ok: false,
      message: DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: response.message,
    };
  }

  return { ok: true };
};

export {
  DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE,
  resolvePlaylistImportSubmission,
};
export type { PlaylistImportSubmissionResult };
