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
const songEditorSource = readFileSync(
  join(process.cwd(), "src/screens/modal/SongEditor.tsx"),
  "utf8"
);
const infoModalTransportSource = readFileSync(
  join(process.cwd(), "src/screens/modal/InfoModalTransport.tsx"),
  "utf8"
);
const modalChromeHeaderSource = readFileSync(
  join(process.cwd(), "src/screens/modal/ModalChromeHeader.tsx"),
  "utf8"
);
const playbackShelfSource = readFileSync(
  join(process.cwd(), "src/screens/playlist/components/PlaybackShelf.tsx"),
  "utf8"
);
const playbackShelfStyles = readFileSync(
  join(process.cwd(), "src/screens/playlist/components/PlaybackShelf.module.css"),
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

test("InfoModal source is a clean shell that hosts the SongEditor", () => {
  expectEqual(infoModalSource.includes("InfoModalPresentation"), false);
  expectEqual(infoModalSource.includes("currentPlaybackItemId"), true);
  expectEqual(infoModalSource.includes("<SongEditor"), true);
  expectEqual(infoModalSource.includes("<InfoModalTransport"), true);
  expectEqual(infoModalSource.includes('closeLabel="Close editor"'), true);
});

test("SongEditor source preserves editor state across item changes", () => {
  expectEqual(
    songEditorSource.includes("}, [active, item?.id, reset, setLatestGeminiSuggestion]);"),
    true
  );
});

test("InfoModal source keeps transport below the editor", () => {
  expectEqual(
    infoModalSource.lastIndexOf('className={styles["transport-section"]}') >
      infoModalSource.indexOf("<SongEditor"),
    true
  );
});

test("InfoModal source uses a simple close control", () => {
  expectEqual(infoModalSource.includes("const onDismiss = () => {"), true);
  expectEqual(infoModalSource.includes("close();"), true);
  expectEqual(infoModalSource.includes('closeLabel="Close editor"'), true);
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

test("InfoModal replaces the Edit Song header with a wide shared marquee title", () => {
  expectEqual(
    infoModalSource.includes('import InfoModalTransport, { MarqueeText } from "./InfoModalTransport";'),
    true,
  );
  expectEqual(modalChromeHeaderSource.includes("titleContent?: ReactNode;"), true);
  expectEqual(infoModalSource.includes("titleContent={"), true);
  expectEqual(infoModalSource.includes("title=\"Edit Song\""), false);
  expectEqual(songEditorSource.includes("line-clamp-4"), false);
  expectEqual(songEditorSource.includes("song-heading"), false);
  expectEqual(
    infoModalSource.includes(
      '<MarqueeText text={item?.title || ""} className={styles["video-title"]} />',
    ),
    true,
  );
  expectEqual(
    infoModalSource.includes(
      '<MarqueeText text={item?.channelName || ""} className={styles["channel-name"]} />',
    ),
    false,
  );
  expectEqual(infoModalStyles.includes(".song-heading"), true);
  expectEqual(
    infoModalStyles.includes(
      "grid-template-columns: auto minmax(0, 1fr) auto;",
    ),
    true,
  );
  expectEqual(infoModalStyles.includes("gap: 12px;"), true);
  expectEqual(infoModalStyles.includes("white-space: nowrap;"), true);
});

test("expanded song editor reuses the shared modal close button style", () => {
  expectEqual(
    playbackShelfSource.includes('import { CloseIcon } from "../../icons";'),
    true
  );
  expectEqual(
    playbackShelfSource.includes('import modalStyles from "../../modal/Modal.module.css";'),
    true
  );
  expectEqual(
    playbackShelfSource.includes('className={modalStyles["chrome-close-button"]}'),
    true
  );
  expectEqual(playbackShelfSource.includes("<CloseIcon />"), true);
  expectEqual(playbackShelfSource.includes('styles["cross-button"]'), false);
  expectEqual(playbackShelfStyles.includes(".cross-button"), false);
});
