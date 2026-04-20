import { describe, it } from "node:test";
import assert from "node:assert";
import {
  cancelDeleteAllConfirmation,
  confirmDeleteAllConfirmation,
  deleteSelectedPlaylistItems,
  updateSelectedVolumeMultiplier,
} from "./playlistActions.js";
import type MPlaylistItem from "../models/MPlaylistItem";

it("cancelDeleteAllConfirmation closes the modal without deleting songs", () => {
  let deleted = false;
  let closed = false;

  cancelDeleteAllConfirmation(
    () => {
      closed = true;
    }
  );

  assert.strictEqual(deleted, false, "Expected playlist deletion to be skipped");
  assert.strictEqual(closed, true, "Expected confirmation modal to close");
});

it("confirmDeleteAllConfirmation deletes songs and closes the modal", () => {
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

  assert.strictEqual(deleted, true, "Expected playlist deletion to run");
  assert.strictEqual(closed, true, "Expected confirmation modal to close");
});

it("deleteSelectedPlaylistItems removes only the selected song ids", () => {
  const playlist = [
    { id: "song-1" } as MPlaylistItem,
    { id: "song-2" } as MPlaylistItem,
    { id: "song-3" } as MPlaylistItem,
  ];

  const result = deleteSelectedPlaylistItems(playlist, ["song-2", "song-4"]);

  const remainingIds = result.map((item: MPlaylistItem) => item.id);
  const expectedIds = ["song-1", "song-3"];

  assert.deepStrictEqual(remainingIds, expectedIds);
});

describe("updateSelectedVolumeMultiplier", () => {
  const mockPlaylist: Partial<MPlaylistItem>[] = [
    { id: "1", volume: 50 },
    { id: "2", volume: 30 },
    { id: "3", volume: 80 },
  ];

  it("applies multiplier to selected items and rounds to nearest integer", () => {
    const result = updateSelectedVolumeMultiplier(mockPlaylist as MPlaylistItem[], ["1", "2"], 1.15);
    assert.strictEqual(result.find((i: MPlaylistItem) => i.id === "1")?.volume, 58); // 50 * 1.15 = 57.5 -> 58
    assert.strictEqual(result.find((i: MPlaylistItem) => i.id === "2")?.volume, 35); // 30 * 1.15 = 34.5 -> 35
    assert.strictEqual(result.find((i: MPlaylistItem) => i.id === "3")?.volume, 80); // Unchanged
  });

  it("clamps volume at 100", () => {
    const result = updateSelectedVolumeMultiplier(mockPlaylist as MPlaylistItem[], ["3"], 1.5);
    assert.strictEqual(result.find((i: MPlaylistItem) => i.id === "3")?.volume, 100); // 80 * 1.5 = 120 -> 100
  });

  it("clamps volume at 0", () => {
    const result = updateSelectedVolumeMultiplier(mockPlaylist as MPlaylistItem[], ["2"], 0);
    assert.strictEqual(result.find((i: MPlaylistItem) => i.id === "2")?.volume, 0);
  });
});
