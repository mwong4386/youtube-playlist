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
const infoModalSource = readFileSync(
  join(process.cwd(), "src/screens/modal/InfoModal.tsx"),
  "utf8"
);
const readOptionalSource = (relativePath: string) => {
  try {
    return readFileSync(join(process.cwd(), relativePath), "utf8");
  } catch {
    return "";
  }
};

const infoModalTransportSource = readOptionalSource(
  "src/screens/modal/InfoModalTransport.tsx"
);
const infoModalTransportStyles = readOptionalSource(
  "src/screens/modal/InfoModalTransport.module.css"
);

test("playlist no longer renders a standalone now-playing banner component", () => {
  expectEqual(
    playlistSource.includes('import NowPlayingBanner from "./NowPlayingBanner"'),
    false
  );
  expectEqual(playlistSource.includes("<NowPlayingBanner"), false);
  expectEqual(playlistSource.includes("playlist-bottom-spacer"), false);
});

test("InfoModal source owns the collapsed player-first presentation", () => {
  expectEqual(infoModalSource.includes("InfoModalPresentation"), true);
  expectEqual(infoModalSource.includes("currentPlaybackItemId"), true);
  expectEqual(infoModalSource.includes('presentation === "collapsed"'), true);
  expectEqual(infoModalSource.includes('setPresentation("expanded")'), true);
  expectEqual(infoModalSource.includes("<InfoModalTransport"), true);
});

test("modal transport source exposes a dedicated expand surface and transport buttons", () => {
  expectEqual(infoModalTransportSource.includes("Expand song editor"), true);
  expectEqual(infoModalTransportSource.includes("Open previous song"), true);
  expectEqual(infoModalTransportSource.includes("Open next song"), true);
  expectEqual(infoModalTransportSource.includes("isExpanded"), true);
  expectEqual(infoModalTransportSource.includes("MarqueeText"), true);
  expectEqual(infoModalTransportSource.includes("ResizeObserver"), true);
  expectEqual(infoModalTransportSource.includes('role="button"'), true);
  expectEqual(infoModalTransportSource.includes("tabIndex={0}"), true);
  expectEqual(infoModalTransportSource.includes('title="Expand song editor"'), true);
  expectEqual(infoModalTransportSource.includes("MsgType.PreviousVideo"), true);
  expectEqual(infoModalTransportSource.includes("MsgType.NextVideo"), true);
  expectEqual(infoModalTransportSource.includes("MsgType.PlayVideo"), true);
  expectEqual(infoModalTransportSource.includes("MsgType.PauseVideo"), true);
  expectEqual(infoModalTransportStyles.includes(".expandSurface"), true);
  expectEqual(infoModalTransportStyles.includes(".transportActions"), true);
  expectEqual(infoModalTransportStyles.includes(".marqueeViewport"), true);
  expectEqual(infoModalTransportStyles.includes(".marqueeContent"), true);
});
