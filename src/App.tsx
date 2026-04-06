import { useEffect, useMemo, useState } from "react";
import "./App.css";
import Playlist from "./screens/playlist/Playlist";
import { ActionSheetProvider } from "./screens/actionSheet/ActionSheetContext";
import { getStorage } from "./utils/syncStorage";
import {
  DEFAULT_THEME_PREFERENCE,
  getResolvedTheme,
  normalizeThemePreference,
  THEME_PREFERENCE_KEY,
  ThemePreference,
} from "./utils/theme";

function App() {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(
    DEFAULT_THEME_PREFERENCE
  );
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreference = (matches: boolean) => {
      setPrefersDark(matches);
    };
    const onMediaQueryChange = (event: MediaQueryListEvent) => {
      syncPreference(event.matches);
    };

    syncPreference(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onMediaQueryChange);
      return () => {
        mediaQuery.removeEventListener("change", onMediaQueryChange);
      };
    }

    mediaQuery.addListener(onMediaQueryChange);
    return () => {
      mediaQuery.removeListener(onMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadThemePreference = async () => {
      try {
        const storedPreference = await getStorage(THEME_PREFERENCE_KEY);
        if (mounted) {
          setThemePreferenceState(normalizeThemePreference(storedPreference));
        }
      } catch {
        if (mounted) {
          setThemePreferenceState(DEFAULT_THEME_PREFERENCE);
        }
      }
    };

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: "sync" | "local" | "managed" | "session"
    ) => {
      if (namespace !== "sync" || !(THEME_PREFERENCE_KEY in changes)) {
        return;
      }

      setThemePreferenceState(
        normalizeThemePreference(changes[THEME_PREFERENCE_KEY].newValue)
      );
    };

    loadThemePreference();
    chrome.storage.onChanged.addListener(listener);

    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const resolvedTheme = useMemo(
    () => getResolvedTheme(themePreference, prefersDark),
    [themePreference, prefersDark]
  );

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setThemePreference = (nextPreference: ThemePreference) => {
    setThemePreferenceState(nextPreference);
    chrome.storage.sync.set({
      [THEME_PREFERENCE_KEY]: nextPreference,
    });
  };

  return (
    <div className="App">
      <ActionSheetProvider>
        <Playlist
          themePreference={themePreference}
          setThemePreference={setThemePreference}
        />
      </ActionSheetProvider>
    </div>
  );
}

export default App;
