import { ThemePreference } from "../utils/theme";

interface MActionSheetItem {
  id: number | string;
  description?: string;
  callback?: () => any;
  kind?:
    | "action"
    | "theme-selector"
    | "song-list-selector"
    | "song-list-action"
    | "song-list-row"
    | "song-list-inline-edit";
  tone?: "default" | "danger";
  themePreference?: ThemePreference;
  onThemeChange?: (preference: ThemePreference) => void;
  shouldCloseOnClick?: boolean;
  leadingIcon?: "plus";
  trailingIcon?: "chevron-down" | "edit";
  isActive?: boolean;
  onEdit?: () => void;
  songListName?: string;
  editValue?: string;
  onEditValueChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  saveIcon?: "check";
  cancelIcon?: "x";
  errorMessage?: string;
}

export default MActionSheetItem;
