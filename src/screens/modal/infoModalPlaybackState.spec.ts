import test from "node:test";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

type InfoModalPlaybackContext = {
  currentPlaybackItemId?: string | null;
  itemId?: string | null;
  hasPlaybackContext?: boolean;
};

type InfoModalPlaybackHelpers = {
  getInfoModalPresentation: (
    context: InfoModalPlaybackContext
  ) => "collapsed" | "expanded";
  shouldShowInfoModalTransport: (
    context: InfoModalPlaybackContext,
    presentation: "collapsed" | "expanded"
  ) => boolean;
};

const fallbackHelpers: InfoModalPlaybackHelpers = {
  getInfoModalPresentation: ({ currentPlaybackItemId, itemId }) =>
    itemId === currentPlaybackItemId ? "expanded" : "collapsed",
  shouldShowInfoModalTransport: ({ currentPlaybackItemId, itemId }) =>
    itemId !== currentPlaybackItemId,
};

const helperModulePath = "./infoModalPlaybackState.js";

const loadInfoModalPlaybackHelpers = async (): Promise<InfoModalPlaybackHelpers> => {
  try {
    return (await import(helperModulePath)) as InfoModalPlaybackHelpers;
  } catch {
    return fallbackHelpers;
  }
};

test("current playback item opens collapsed and shows transport", async () => {
  const { getInfoModalPresentation, shouldShowInfoModalTransport } =
    await loadInfoModalPlaybackHelpers();
  const playbackContext = {
    currentPlaybackItemId: "song-1",
    itemId: "song-1",
    hasPlaybackContext: true,
  };

  const presentation = getInfoModalPresentation(playbackContext);

  expectEqual(presentation, "collapsed");
  expectEqual(
    shouldShowInfoModalTransport(playbackContext, presentation),
    true
  );
});

test("non-playing item opens expanded and hides transport", async () => {
  const { getInfoModalPresentation, shouldShowInfoModalTransport } =
    await loadInfoModalPlaybackHelpers();
  const playbackContext = {
    currentPlaybackItemId: "song-2",
    itemId: "song-1",
    hasPlaybackContext: true,
  };

  const presentation = getInfoModalPresentation(playbackContext);

  expectEqual(presentation, "expanded");
  expectEqual(
    shouldShowInfoModalTransport(playbackContext, presentation),
    false
  );
});

test("missing playback context falls back to editor-only expanded mode", async () => {
  const { getInfoModalPresentation, shouldShowInfoModalTransport } =
    await loadInfoModalPlaybackHelpers();
  const playbackContext = {
    currentPlaybackItemId: undefined,
    itemId: "song-1",
    hasPlaybackContext: false,
  };

  const presentation = getInfoModalPresentation(playbackContext);

  expectEqual(presentation, "expanded");
  expectEqual(
    shouldShowInfoModalTransport(playbackContext, presentation),
    false
  );
});
