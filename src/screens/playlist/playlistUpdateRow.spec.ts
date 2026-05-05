import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const expectIncludes = (source: string, expected: string) => {
  if (!source.includes(expected)) {
    throw new Error(`Expected source to include ${expected}`);
  }
};

test("PlaylistContent renders playlist update row before playlist items", () => {
  const source = readFileSync(
    join(process.cwd(), "src/screens/playlist/PlaylistContent.tsx"),
    "utf8"
  );

  expectIncludes(source, "PlaylistUpdateRow");
  expectIncludes(source, "pendingPlaylistUpdateItems");
  expectIncludes(source, "onAddPendingPlaylistUpdateItem");
  expectIncludes(source, "onDismissPendingPlaylistUpdateItem");
  expectIncludes(source, "hasPendingPlaylistUpdates");
  expectIncludes(source, "hasPlaylistUpdateCheckNotice");
  expectIncludes(source, "!hasPlaylistUpdateCheckNotice");

  const updateRowIndex = source.indexOf("<PlaylistUpdateRow");
  const playlistMapIndex = source.indexOf("{playlist.map");
  if (
    updateRowIndex === -1 ||
    playlistMapIndex === -1 ||
    updateRowIndex > playlistMapIndex
  ) {
    throw new Error("Expected PlaylistUpdateRow to render before playlist items");
  }
});

test("PlaylistUpdateRow renders every pending song with per-item actions", () => {
  const source = readFileSync(
    join(process.cwd(), "src/screens/playlist/PlaylistUpdateRow.tsx"),
    "utf8"
  );

  expectIncludes(source, "items.map");
  expectIncludes(source, "{item.title}");
  expectIncludes(source, "{item.channelName}");
  expectIncludes(source, "onAdd(item.id)");
  expectIncludes(source, "onDismiss(item.id)");
});
