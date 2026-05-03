interface GeminiEqBatchNotificationViewModel {
  title: string;
  detail: string;
  dismissible: boolean;
  actionLabel?: never;
}

interface GeminiEqBatchNotificationState {
  active: boolean;
  totalCount: number;
  successCount: number;
  failCount: number;
}

const getGeminiEqBatchVisibilityKey = (
  state: GeminiEqBatchNotificationState | null,
): string | null => {
  if (!state || state.totalCount <= 0) {
    return null;
  }

  return [
    state.active ? "active" : "complete",
    state.totalCount,
    state.successCount,
    state.failCount,
  ].join(":");
};

const getGeminiEqBatchNotificationViewModel = (
  state: GeminiEqBatchNotificationState | null,
): GeminiEqBatchNotificationViewModel | null => {
  if (!state || state.totalCount <= 0) {
    return null;
  }

  if (state.active) {
    return {
      title: `Adjusting Gemini EQ ${state.successCount + state.failCount}/${state.totalCount} done`,
      detail: `${state.successCount} succeeded, ${state.failCount} failed`,
      dismissible: false,
    };
  }

  return {
    title: "Gemini EQ adjustment finished",
    detail: `${state.successCount} succeeded, ${state.failCount} failed`,
    dismissible: true,
  };
};

export { getGeminiEqBatchNotificationViewModel, getGeminiEqBatchVisibilityKey };
export type {
  GeminiEqBatchNotificationState,
  GeminiEqBatchNotificationViewModel,
};
