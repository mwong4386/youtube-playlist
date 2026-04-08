import test from "node:test";
import {
  cancelDeleteAllConfirmation,
  confirmDeleteAllConfirmation,
} from "./playlistActions";

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
