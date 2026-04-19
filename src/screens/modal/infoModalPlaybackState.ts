type InfoModalPlaybackState = {
  itemId?: string | null;
  currentPlaybackItemId?: string | null;
};

export const shouldShowInfoModalTransport = ({
  itemId,
  currentPlaybackItemId,
}: InfoModalPlaybackState) =>
  Boolean(itemId && currentPlaybackItemId && itemId === currentPlaybackItemId);
