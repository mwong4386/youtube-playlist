import test from "node:test";
import {
  cancelDeleteAllConfirmation,
  confirmDeleteAllConfirmation,
  deleteSelectedPlaylistItems,
} from "./playlistActions.js";
import type MPlaylistItem from "../models/MPlaylistItem";

test("cancelDeleteAllConfirmation closes the modal without deleting songs", () => {
  let deleted = false;
  let closed = false;

  cancelDeleteAllConfirmation(
    () => {
      closed = true;
    }
  );

  if (deleted) {
    throw new Error("Expected playlist deletion to be skipped");
  }

  if (!closed) {
    throw new Error("Expected confirmation modal to close");
  }
});

test("confirmDeleteAllConfirmation deletes songs and closes the modal", () => {
  let deleted = false;
  let closed = false;

  confirmDeleteAllConfirmation(
    () => {
      deleted = true;
    },
    () => {
      closed = true;
    }
  );

  if (deleted) {
    if (!closed) {
      throw new Error("Expected confirmation modal to close");
    }
    return;
  }

  throw new Error("Expected playlist deletion to run");
});

test("deleteSelectedPlaylistItems removes only the selected song ids", () => {
  const playlist = [
    { id: "song-1" } as MPlaylistItem,
    { id: "song-2" } as MPlaylistItem,
    { id: "song-3" } as MPlaylistItem,
  ];

  const result = deleteSelectedPlaylistItems(playlist, ["song-2", "song-4"]);

  const remainingIds = result.map((item: MPlaylistItem) => item.id);
  const expectedIds = ["song-1", "song-3"];

  if (JSON.stringify(remainingIds) !== JSON.stringify(expectedIds)) {
    throw new Error(
      `Expected ${JSON.stringify(expectedIds)}, received ${JSON.stringify(remainingIds)}`
    );
  }
});
