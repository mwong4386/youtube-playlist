import test from "node:test";
import {
  beginAnalyzeRequest,
  shouldApplyAnalyzeResult,
  syncAnalyzeScope,
} from "./geminiAnalyzeRequest";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("shouldApplyAnalyzeResult allows only the latest active request for the current item", () => {
  expectEqual(
    shouldApplyAnalyzeResult(
      {
        active: true,
        itemId: "song-1",
        requestToken: 3,
      },
      {
        itemId: "song-1",
        requestToken: 3,
      }
    ),
    true
  );

  expectEqual(
    shouldApplyAnalyzeResult(
      {
        active: false,
        itemId: "song-1",
        requestToken: 3,
      },
      {
        itemId: "song-1",
        requestToken: 3,
      }
    ),
    false
  );

  expectEqual(
    shouldApplyAnalyzeResult(
      {
        active: true,
        itemId: "song-2",
        requestToken: 3,
      },
      {
        itemId: "song-1",
        requestToken: 3,
      }
    ),
    false
  );

  expectEqual(
    shouldApplyAnalyzeResult(
      {
        active: true,
        itemId: "song-1",
        requestToken: 4,
      },
      {
        itemId: "song-1",
        requestToken: 3,
      }
    ),
    false
  );
});

test("beginAnalyzeRequest and syncAnalyzeScope ignore a late response after the modal switches items", () => {
  const initialScope = {
    active: false,
    itemId: undefined,
    requestToken: 0,
  };

  const openedScope = syncAnalyzeScope(initialScope, true, "song-1");
  const started = beginAnalyzeRequest(openedScope, "song-1");
  const switchedScope = syncAnalyzeScope(started.scope, true, "song-2");

  expectEqual(
    shouldApplyAnalyzeResult(switchedScope, started.request),
    false
  );
});
