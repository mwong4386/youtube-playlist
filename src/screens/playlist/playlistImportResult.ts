import type MPlaylistItem from "../../models/MPlaylistItem";
import type {
  PlaylistImportMode,
  PlaylistImportPreviewResponse,
  PlaylistImportResponse,
} from "../../models/PlaylistImport";
import type { PlaylistImportPreview } from "./playlistImportPreview";

const DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE =
  "Could not import YouTube playlist.";

interface PlaylistImportSubmissionResult {
  ok: boolean;
  message?: string;
}

interface PlaylistImportPreviewState extends PlaylistImportPreview {
  source: "youtube";
  mode: PlaylistImportMode;
}

type PlaylistImportPreviewSubmissionResult =
  | {
      ok: true;
      preview: PlaylistImportPreviewState;
    }
  | {
      ok: false;
      message?: string;
    };

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

const resolvePlaylistImportPreviewSubmission = (
  response: PlaylistImportPreviewResponse | undefined,
  runtimeError: Pick<Error, "message"> | null | undefined,
  createPreview: (items: MPlaylistItem[]) => PlaylistImportPreviewState,
): PlaylistImportPreviewSubmissionResult => {
  if (runtimeError) {
    return {
      ok: false,
      message: runtimeError.message || DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE,
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

  const preview = createPreview(response.items);
  if (preview.items.length === 0 && preview.mode === "append") {
    return {
      ok: false,
      message: "All videos in this playlist are already saved.",
    };
  }

  return {
    ok: true,
    preview,
  };
};

export {
  DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE,
  resolvePlaylistImportPreviewSubmission,
  resolvePlaylistImportSubmission,
};
export type {
  PlaylistImportPreviewState,
  PlaylistImportPreviewSubmissionResult,
  PlaylistImportSubmissionResult,
};
