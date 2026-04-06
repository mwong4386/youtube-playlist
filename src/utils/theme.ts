export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCE_OPTIONS: {
  value: ThemePreference;
  label: string;
}[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
export const THEME_PREFERENCE_KEY = "themePreference";

export const normalizeThemePreference = (
  value: unknown
): ThemePreference => {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return DEFAULT_THEME_PREFERENCE;
};

export const getResolvedTheme = (
  preference: ThemePreference,
  prefersDark: boolean
): ResolvedTheme => {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return prefersDark ? "dark" : "light";
};

export const getThemePreferenceLabel = (preference: ThemePreference) => {
  return (
    THEME_PREFERENCE_OPTIONS.find((option) => option.value === preference)
      ?.label || "System"
  );
};

export const getThemePreferenceIndex = (preference: ThemePreference) => {
  const index = THEME_PREFERENCE_OPTIONS.findIndex(
    (option) => option.value === preference
  );

  return index >= 0 ? index : 0;
};
