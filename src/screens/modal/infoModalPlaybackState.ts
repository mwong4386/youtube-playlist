export type InfoModalPresentation = "collapsed" | "expanded";

type InfoModalPlaybackState = {
  itemId?: string | null;
  currentPlaybackItemId?: string | null;
};

export const shouldShowInfoModalTransport = ({
  itemId,
  currentPlaybackItemId,
}: InfoModalPlaybackState) =>
  Boolean(itemId && currentPlaybackItemId && itemId === currentPlaybackItemId);

export const getInfoModalPresentation = ({
  itemId,
  currentPlaybackItemId,
}: InfoModalPlaybackState): InfoModalPresentation =>
  shouldShowInfoModalTransport({ itemId, currentPlaybackItemId })
    ? "collapsed"
    : "expanded";
