import test from "node:test";
import {
  getGeminiEqBatchNotificationViewModel,
  getGeminiEqBatchVisibilityKey,
  type GeminiEqBatchNotificationState,
} from "./geminiEqBatchNotification";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
};

test("getGeminiEqBatchNotificationViewModel hides without batch state", () => {
  expectEqual(getGeminiEqBatchNotificationViewModel(null), null);
});

test("getGeminiEqBatchNotificationViewModel returns a stoppable-looking progress banner without stop action", () => {
  const viewModel = getGeminiEqBatchNotificationViewModel({
    active: true,
    totalCount: 2,
    successCount: 1,
    failCount: 0,
  });

  expectEqual(viewModel?.title, "Adjusting Gemini EQ 1/2 done");
  expectEqual(viewModel?.detail, "1 succeeded, 0 failed");
  expectEqual(viewModel?.dismissible, false);
  expectEqual(viewModel?.actionLabel, undefined);
});

test("getGeminiEqBatchNotificationViewModel returns dismissible completion banner", () => {
  const viewModel = getGeminiEqBatchNotificationViewModel({
    active: false,
    totalCount: 2,
    successCount: 1,
    failCount: 1,
  });

  expectEqual(viewModel?.title, "Gemini EQ adjustment finished");
  expectEqual(viewModel?.detail, "1 succeeded, 1 failed");
  expectEqual(viewModel?.dismissible, true);
});

test("getGeminiEqBatchVisibilityKey tracks the batch snapshot", () => {
  const state: GeminiEqBatchNotificationState = {
    active: false,
    totalCount: 2,
    successCount: 2,
    failCount: 0,
  };

  expectEqual(getGeminiEqBatchVisibilityKey(state), "complete:2:2:0");
  expectEqual(getGeminiEqBatchVisibilityKey(null), null);
});
