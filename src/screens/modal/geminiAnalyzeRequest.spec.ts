import test from "node:test";
import { shouldApplyAnalyzeResult } from "./geminiAnalyzeRequest";

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
