import test from "node:test";
import {
  DEFAULT_THEME_PREFERENCE,
  getThemePreferenceIndex,
  getThemePreferenceLabel,
  getResolvedTheme,
  normalizeThemePreference,
  THEME_PREFERENCE_OPTIONS,
} from "./theme";

const expectEqual = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
};

test("normalizeThemePreference falls back to system", () => {
  expectEqual(normalizeThemePreference(undefined), DEFAULT_THEME_PREFERENCE);
  expectEqual(normalizeThemePreference("sepia"), DEFAULT_THEME_PREFERENCE);
});

test("getResolvedTheme respects explicit user choices", () => {
  expectEqual(getResolvedTheme("light", true), "light");
  expectEqual(getResolvedTheme("dark", false), "dark");
});

test("getResolvedTheme follows browser preference for system mode", () => {
  expectEqual(getResolvedTheme("system", true), "dark");
  expectEqual(getResolvedTheme("system", false), "light");
});

test("getThemePreferenceLabel returns user-facing labels", () => {
  expectEqual(getThemePreferenceLabel("system"), "System");
  expectEqual(getThemePreferenceLabel("light"), "Light");
  expectEqual(getThemePreferenceLabel("dark"), "Dark");
});

test("THEME_PREFERENCE_OPTIONS expose the grouped selector order", () => {
  expectEqual(
    THEME_PREFERENCE_OPTIONS.map((option) => option.value),
    ["system", "light", "dark"]
  );
});

test("getThemePreferenceIndex matches selector order", () => {
  expectEqual(getThemePreferenceIndex("system"), 0);
  expectEqual(getThemePreferenceIndex("light"), 1);
  expectEqual(getThemePreferenceIndex("dark"), 2);
});
