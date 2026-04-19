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
const infoModalTransportSource = readFileSync(
  join(process.cwd(), "src/screens/modal/InfoModalTransport.tsx"),
  "utf8"
);
const infoModalTransportStyles = readFileSync(
  join(process.cwd(), "src/screens/modal/InfoModalTransport.module.css"),
  "utf8"
);
const infoModalStyles = readFileSync(
  join(process.cwd(), "src/screens/modal/Modal.module.css"),
  "utf8"
);

test("playlist no longer renders a standalone now-playing banner component", () => {
  expectEqual(
    playlistSource.includes('import NowPlayingBanner from "./NowPlayingBanner"'),
    false
  );
  expectEqual(playlistSource.includes("<NowPlayingBanner"), false);
  expectEqual(playlistSource.includes("playlist-bottom-spacer"), false);
});

test("InfoModal source is a clean editor without collapsed presentation", () => {
  expectEqual(infoModalSource.includes("InfoModalPresentation"), false);
  expectEqual(infoModalSource.includes("currentPlaybackItemId"), true);
  expectEqual(infoModalSource.includes('presentation === "collapsed"'), false);
  expectEqual(infoModalSource.includes('setPresentation'), false);
  expectEqual(infoModalSource.includes("<InfoModalTransport"), true);
  expectEqual(infoModalSource.includes("showEditorSection"), false);
  expectEqual(infoModalSource.includes('aria-label="Close editor"'), true);
  expectEqual(infoModalSource.includes('title="Close editor"'), true);
});

test("InfoModal source preserves editor state across item changes and keeps transport below the editor", () => {
  expectEqual(infoModalSource.includes("}, [active, item?.id, reset]);"), true);
  expectEqual(
    infoModalSource.lastIndexOf('<div className={styles["transport-section"]}>') >
      infoModalSource.indexOf('<div className={styles["editor-section"]}>'),
    true
  );
});

test("InfoModal source uses a simple close control", () => {
  expectEqual(infoModalSource.includes("const onDismiss = () => {"), true);
  expectEqual(infoModalSource.includes("close();"), true);
  expectEqual(infoModalSource.includes('aria-label="Close editor"'), true);
  expectEqual(infoModalSource.includes('title="Close editor"'), true);
});

test("collapsed player-first modal classes are still present in CSS for now", () => {
  expectEqual(infoModalStyles.includes(".content-collapsed"), true);
  expectEqual(infoModalStyles.includes("margin-bottom: 0;"), true);
  expectEqual(infoModalStyles.includes(".transport-section"), true);
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
