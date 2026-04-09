import { GeminiBoundarySuggestion } from "../../models/GeminiSettings";

type GeminiSuggestionFormShape = {
  hours: number;
  minutes: number;
  seconds: number;
  endHours: number;
  endMinutes: number;
  endSeconds: number;
  untilEnd: boolean;
};

const toClockParts = (totalSeconds: number) => {
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
};

const applyGeminiSuggestionToFormValues = (
  suggestion: GeminiBoundarySuggestion,
  currentValues: GeminiSuggestionFormShape
): GeminiSuggestionFormShape => {
  const start = toClockParts(suggestion.startTimestamp);
  const end =
    typeof suggestion.endTimestamp === "number"
      ? toClockParts(suggestion.endTimestamp)
      : null;

  return {
    ...currentValues,
    hours: start.hours,
    minutes: start.minutes,
    seconds: start.seconds,
    endHours: end ? end.hours : currentValues.endHours,
    endMinutes: end ? end.minutes : currentValues.endMinutes,
    endSeconds: end ? end.seconds : currentValues.endSeconds,
    untilEnd: end ? false : currentValues.untilEnd,
  };
};

export { applyGeminiSuggestionToFormValues };
export type { GeminiSuggestionFormShape };
