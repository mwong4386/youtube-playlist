import { ThemePreference } from "../utils/theme";

interface MActionSheetItem {
  id: number;
  description?: string;
  callback?: () => any;
  kind?: "action" | "theme-selector";
  themePreference?: ThemePreference;
  onThemeChange?: (preference: ThemePreference) => void;
}

export default MActionSheetItem;
