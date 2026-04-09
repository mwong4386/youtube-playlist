import test from "node:test";
import { hasValidManualTimestampRange } from "./manualTimestampValidation";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("hasValidManualTimestampRange requires a defined end timestamp to be greater than the start", () => {
  expectEqual(hasValidManualTimestampRange(10, undefined), true);
  expectEqual(hasValidManualTimestampRange(10, 11), true);
  expectEqual(hasValidManualTimestampRange(10, 10), false);
  expectEqual(hasValidManualTimestampRange(10, 9), false);
});
