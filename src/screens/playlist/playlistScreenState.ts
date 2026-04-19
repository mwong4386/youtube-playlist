const getVisibleSelectedItemIds = (
  visibleItemIds: string[],
  selectedItemIds: string[]
): string[] => {
  const visibleItemIdSet = new Set(visibleItemIds);
  const visibleSelectedItemIds = selectedItemIds.filter((itemId) =>
    visibleItemIdSet.has(itemId)
  );

  return visibleSelectedItemIds.length === selectedItemIds.length
    ? selectedItemIds
    : visibleSelectedItemIds;
};

const getEffectivePlaybackItemId = (
  currentPlaybackItemId?: string,
  pendingPlaybackItemId?: string
): string | undefined => {
  return currentPlaybackItemId || pendingPlaybackItemId;
};

export { getEffectivePlaybackItemId, getVisibleSelectedItemIds };
