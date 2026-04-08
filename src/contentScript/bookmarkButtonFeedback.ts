export const BOOKMARK_BUTTON_SUCCESS_DURATION_MS = 2000;

export type BookmarkButtonVisualState = "idle" | "success";

export interface BookmarkButtonFeedbackController {
  dispose: () => void;
  showSuccess: () => void;
}

interface CreateBookmarkButtonFeedbackControllerOptions {
  applyState: (state: BookmarkButtonVisualState) => void;
  clearScheduled: (timerId: number) => void;
  schedule: (callback: () => void, delayMs: number) => number;
  successDurationMs?: number;
}

export const createBookmarkButtonFeedbackController = ({
  applyState,
  clearScheduled,
  schedule,
  successDurationMs = BOOKMARK_BUTTON_SUCCESS_DURATION_MS,
}: CreateBookmarkButtonFeedbackControllerOptions): BookmarkButtonFeedbackController => {
  let timerId: number | null = null;

  const resetTimer = () => {
    if (timerId === null) {
      return;
    }

    clearScheduled(timerId);
    timerId = null;
  };

  applyState("idle");

  return {
    dispose: () => {
      resetTimer();
      applyState("idle");
    },
    showSuccess: () => {
      resetTimer();
      applyState("success");
      timerId = schedule(() => {
        timerId = null;
        applyState("idle");
      }, successDurationMs);
    },
  };
};
