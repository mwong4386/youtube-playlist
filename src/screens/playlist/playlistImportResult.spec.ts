import test from "node:test";
import {
  DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE,
  resolvePlaylistImportSubmission,
} from "./playlistImportResult.js";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("resolvePlaylistImportSubmission returns ok for a successful import response", () => {
  expectEqual(
    resolvePlaylistImportSubmission({
      ok: true,
      importedCount: 4,
      skippedDuplicates: 1,
    }),
    { ok: true }
  );
});

test("resolvePlaylistImportSubmission surfaces the background failure message", () => {
  expectEqual(
    resolvePlaylistImportSubmission({
      ok: false,
      code: "invalid-url",
      message: "Invalid YouTube playlist URL.",
    }),
    {
      ok: false,
      message: "Invalid YouTube playlist URL.",
    }
  );
});

test("resolvePlaylistImportSubmission prefers the runtime error message when chrome reports one", () => {
  expectEqual(
    resolvePlaylistImportSubmission(undefined, {
      message: "The message port closed before a response was received.",
    }),
    {
      ok: false,
      message: "The message port closed before a response was received.",
    }
  );
});

test("resolvePlaylistImportSubmission falls back to the default message when there is no response or runtime error", () => {
  expectEqual(resolvePlaylistImportSubmission(), {
    ok: false,
    message: DEFAULT_PLAYLIST_IMPORT_ERROR_MESSAGE,
  });
});
