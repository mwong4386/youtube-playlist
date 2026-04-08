import test from "node:test";
import {
  BOOKMARK_BUTTON_SUCCESS_DURATION_MS,
  createBookmarkButtonFeedbackController,
} from "./bookmarkButtonFeedback";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("showSuccess applies success state immediately and resets after the timeout", () => {
  const appliedStates: string[] = [];
  let scheduledCallback: (() => void) | null = null;
  let scheduledDelay = -1;

  const controller = createBookmarkButtonFeedbackController({
    applyState: (state) => {
      appliedStates.push(state);
    },
    clearScheduled: () => {
      throw new Error("Did not expect timeout clearing");
    },
    schedule: (callback, delayMs) => {
      scheduledCallback = callback;
      scheduledDelay = delayMs;
      return 1;
    },
  });

  controller.showSuccess();

  expectEqual(appliedStates, ["idle", "success"]);
  expectEqual(scheduledDelay, BOOKMARK_BUTTON_SUCCESS_DURATION_MS);

  if (!scheduledCallback) {
    throw new Error("Expected success reset callback to be scheduled");
  }

  (scheduledCallback as () => void)();

  expectEqual(appliedStates, ["idle", "success", "idle"]);
});

test("showSuccess restarts the timeout when triggered again before reset", () => {
  const appliedStates: string[] = [];
  const clearedTimerIds: number[] = [];
  const scheduledCallbacks = new Map<number, () => void>();
  let nextTimerId = 1;

  const controller = createBookmarkButtonFeedbackController({
    applyState: (state) => {
      appliedStates.push(state);
    },
    clearScheduled: (timerId) => {
      clearedTimerIds.push(timerId);
      scheduledCallbacks.delete(timerId);
    },
    schedule: (callback) => {
      const timerId = nextTimerId++;
      scheduledCallbacks.set(timerId, callback);
      return timerId;
    },
  });

  controller.showSuccess();
  controller.showSuccess();

  expectEqual(clearedTimerIds, [1]);
  expectEqual(appliedStates, ["idle", "success", "success"]);

  const finalCallback = scheduledCallbacks.get(2);
  if (!finalCallback) {
    throw new Error("Expected restarted timeout to be scheduled");
  }

  finalCallback();

  expectEqual(appliedStates, ["idle", "success", "success", "idle"]);
});
