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

test("InfoModal source owns the collapsed player-first presentation", () => {
  expectEqual(infoModalSource.includes("InfoModalPresentation"), true);
  expectEqual(infoModalSource.includes("currentPlaybackItemId"), true);
  expectEqual(infoModalSource.includes('presentation === "collapsed"'), true);
  expectEqual(infoModalSource.includes('setPresentation("expanded")'), true);
  expectEqual(infoModalSource.includes("<InfoModalTransport"), true);
  expectEqual(infoModalSource.includes('{showEditorSection ? ('), true);
  expectEqual(
    infoModalSource.includes(
      '{showEditorSection ? (\n          <div className={styles["header-row"]}>'
    ),
    true
  );
  expectEqual(infoModalSource.includes('styles["header-spacer"]'), false);
  expectEqual(
    infoModalSource.includes(
      ') : showTransport ? (\n            <>\n              <p className={`${styles["video-title"]} line-clamp-4`}>'
    ),
    false
  );
  expectEqual(
    infoModalSource.includes(
      ') : showTransport ? (\n            <div className={styles["transport-section"]}>'
    ),
    true
  );
});

test("InfoModal source preserves editor state across playback changes and keeps expanded transport below the editor", () => {
  expectEqual(infoModalSource.includes("}, [active, item?.id, reset]);"), true);
  expectEqual(
    infoModalSource.includes(
      'if (active && !showTransport && presentation === "collapsed")'
    ),
    true
  );
  expectEqual(
    infoModalSource.lastIndexOf('<div className={styles["transport-section"]}>') >
      infoModalSource.indexOf('<div className={styles["editor-section"]}>'),
    true
  );
});

test("InfoModal source uses a collapse control to return the current song to mini player mode", () => {
  expectEqual(infoModalSource.includes("const onDismiss = () => {"), true);
  expectEqual(infoModalSource.includes('if (showTransport) {'), true);
  expectEqual(infoModalSource.includes('setPresentation("collapsed");'), true);
  expectEqual(infoModalSource.includes("close();"), true);
  expectEqual(infoModalSource.includes('aria-label={showTransport ? "Collapse player" : "Close editor"}'), true);
  expectEqual(infoModalSource.includes('title={showTransport ? "Collapse player" : "Close editor"}'), true);
});

test("collapsed player-first modal trims leftover bottom spacing around the transport", () => {
  expectEqual(
    infoModalStyles.includes(".content-collapsed"),
    true
  );
  expectEqual(
    infoModalStyles.includes("margin-bottom: 0;"),
    true
  );
  expectEqual(
    infoModalStyles.includes(".content-collapsed .transport-section"),
    true
  );
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
