import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const playlistSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/Playlist.tsx"),
  "utf8"
);
const bannerSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/NowPlayingBanner.tsx"),
  "utf8"
);
const bannerStyles = readFileSync(
  join(process.cwd(), "src/screens/playlist/NowPlayingBanner.module.css"),
  "utf8"
);
const infoModalSource = readFileSync(
  join(process.cwd(), "src/screens/modal/InfoModal.tsx"),
  "utf8"
);

test("playlist renders an isolated now-playing banner component", () => {
  expectEqual(playlistSource.includes('import NowPlayingBanner from "./NowPlayingBanner"'), true);
  expectEqual(playlistSource.includes("<NowPlayingBanner"), true);
  expectEqual(playlistSource.includes("playbackState.currentItemId"), true);
  expectEqual(playlistSource.includes("playing && playingId"), false);
});

test("now-playing banner source exposes horizontal utility buttons for info and eq", () => {
  expectEqual(bannerSource.includes("Open song info"), true);
  expectEqual(bannerSource.includes("Open song EQ"), true);
  expectEqual(bannerSource.includes("Open previous song"), true);
  expectEqual(bannerSource.includes("Open next song"), true);
  expectEqual(bannerSource.includes("utilityTabs"), true);
  expectEqual(bannerSource.includes('role="tablist"'), true);
  expectEqual(bannerSource.includes('role="tab"'), true);
  expectEqual(bannerSource.includes("playerShell"), true);
  expectEqual(bannerSource.includes("transportSurface"), true);
  expectEqual(bannerSource.includes("marqueeViewport"), true);
  expectEqual(bannerSource.includes("requestAnimationFrame"), true);
  expectEqual(bannerSource.includes("MARQUEE_PIXELS_PER_SECOND"), true);
  expectEqual(bannerSource.includes("MsgType.PlayVideo"), true);
  expectEqual(bannerSource.includes("MsgType.PreviousVideo"), true);
  expectEqual(bannerSource.includes("MsgType.NextVideo"), true);
  expectEqual(bannerSource.includes("isPlaying"), true);
  expectEqual(bannerSource.includes("item.channelName"), true);
});

test("now-playing banner styles define one unified player shell with attached tabs", () => {
  expectEqual(bannerStyles.includes(".banner"), true);
  expectEqual(bannerStyles.includes(".playerShell"), true);
  expectEqual(bannerStyles.includes(".utilityTabs"), true);
  expectEqual(bannerStyles.includes(".utilityButton"), true);
  expectEqual(bannerStyles.includes(".utilityButtonActive"), true);
  expectEqual(bannerStyles.includes("position: fixed;"), true);
  expectEqual(bannerStyles.includes(".transportSurface"), true);
  expectEqual(bannerStyles.includes(".trackMeta"), true);
  expectEqual(bannerStyles.includes(".marqueeContent"), true);
  expectEqual(bannerStyles.includes("white-space: nowrap;"), true);
  expectEqual(bannerStyles.includes("padding-inline: 8px;"), true);
  expectEqual(bannerStyles.includes("black 12px,"), true);
  expectEqual(bannerStyles.includes("@keyframes marquee-scroll"), false);
});

test("info modal renders tabbed details and eq sections", () => {
  expectEqual(infoModalSource.includes("initialView"), true);
  expectEqual(infoModalSource.includes("activeView"), true);
  expectEqual(infoModalSource.includes("modal-tab-row"), true);
  expectEqual(infoModalSource.includes('role="tablist"'), true);
  expectEqual(infoModalSource.includes('setActiveView("eq")'), true);
});
