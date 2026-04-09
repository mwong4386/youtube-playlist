import test from "node:test";
import { applyGeminiSuggestionToFormValues } from "./geminiSuggestionForm";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("applyGeminiSuggestionToFormValues maps seconds into start and end input fields", () => {
  expectEqual(
    applyGeminiSuggestionToFormValues(
      {
        startTimestamp: 65,
        endTimestamp: 130,
      },
      {
        hours: 0,
        minutes: 0,
        seconds: 0,
        endHours: 0,
        endMinutes: 0,
        endSeconds: 0,
        untilEnd: true,
      }
    ),
    {
      hours: 0,
      minutes: 1,
      seconds: 5,
      endHours: 0,
      endMinutes: 2,
      endSeconds: 10,
      untilEnd: false,
    }
  );
});

test("applyGeminiSuggestionToFormValues keeps the current untilEnd value when endTimestamp is omitted", () => {
  expectEqual(
    applyGeminiSuggestionToFormValues(
      {
        startTimestamp: 9,
      },
      {
        hours: 1,
        minutes: 0,
        seconds: 0,
        endHours: 0,
        endMinutes: 2,
        endSeconds: 30,
        untilEnd: false,
      }
    ),
    {
      hours: 0,
      minutes: 0,
      seconds: 9,
      endHours: 0,
      endMinutes: 2,
      endSeconds: 30,
      untilEnd: false,
    }
  );
});
