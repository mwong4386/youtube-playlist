import test from "node:test";
import { getTool, getAllTools } from "./geminiAgentRegistry";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("add_song_to_playlist tool is registered and has correct schema", async () => {
  const tool = getTool("add_song_to_playlist");
  if (!tool) {
    throw new Error("Tool add_song_to_playlist not found in registry");
  }

  expectEqual(tool.name, "add_song_to_playlist");
  expectEqual(tool.parameters.type, "object");
  expectEqual(tool.parameters.required, ["videoId", "title", "channelName", "durationSeconds"]);
});

test("add_song_to_playlist tool execute returns mock result in test environment", async () => {
  const tool = getTool("add_song_to_playlist");
  if (!tool) {
    throw new Error("Tool add_song_to_playlist not found in registry");
  }

  const result = await tool.execute({
    videoId: "abc",
    title: "Test Song",
    channelName: "Test Channel",
    durationSeconds: 120,
  });

  expectEqual(result.ok, true);
  expectEqual(result.message, 'Added "Test Song" to the playlist (mock).');
});

test("remove_song_from_playlist tool is registered and has correct schema", async () => {
  const tool = getTool("remove_song_from_playlist");
  if (!tool) {
    throw new Error("Tool remove_song_from_playlist not found in registry");
  }

  expectEqual(tool.name, "remove_song_from_playlist");
  expectEqual(tool.parameters.type, "object");
  expectEqual(tool.parameters.required, ["songId"]);
});

test("remove_song_from_playlist tool execute returns mock result in test environment", async () => {
  const tool = getTool("remove_song_from_playlist");
  if (!tool) {
    throw new Error("Tool remove_song_from_playlist not found in registry");
  }

  const result = await tool.execute({
    songId: "test-id",
  });

  expectEqual(result.ok, true);
  expectEqual(result.message, "Removed song with ID test-id from the playlist (mock).");
});

test("reorder_playlist tool is registered and has correct schema", async () => {
  const tool = getTool("reorder_playlist");
  if (!tool) {
    throw new Error("Tool reorder_playlist not found in registry");
  }

  expectEqual(tool.name, "reorder_playlist");
  expectEqual(tool.parameters.type, "object");
  expectEqual(tool.parameters.required, ["songIds"]);
});

test("reorder_playlist tool execute returns mock result in test environment", async () => {
  const tool = getTool("reorder_playlist");
  if (!tool) {
    throw new Error("Tool reorder_playlist not found in registry");
  }

  const result = await tool.execute({
    songIds: ["a", "b", "c"],
  });

  expectEqual(result.ok, true);
  expectEqual(result.message, "Reordered 3 songs in the playlist (mock).");
});
