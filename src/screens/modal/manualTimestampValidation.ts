const hasValidManualTimestampRange = (
  startTimestamp: number,
  endTimestamp: number | undefined
) => {
  return typeof endTimestamp === "undefined" || endTimestamp > startTimestamp;
};

export { hasValidManualTimestampRange };
