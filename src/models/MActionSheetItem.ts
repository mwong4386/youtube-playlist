import { ThemePreference } from "../utils/theme";

type ActionSheetIconName =
  | "plus"
  | "back"
  | "import"
  | "export"
  | "playlist-check"
  | "chevron-down"
  | "edit"
  | "check"
  | "x";

interface MActionSheetItem {
  id: number | string;
  description?: string;
  callback?: () => any;
  kind?:
    | "action"
    | "theme-selector"
    | "sheet-header"
    | "song-list-selector"
    | "song-list-action"
    | "song-list-row"
    | "song-list-inline-edit";
  tone?: "default" | "danger";
  themePreference?: ThemePreference;
  onThemeChange?: (preference: ThemePreference) => void;
  shouldCloseOnClick?: boolean;
  leadingIcon?: ActionSheetIconName;
  trailingIcon?: ActionSheetIconName;
  iconActions?: Array<{
    icon: ActionSheetIconName;
    label: string;
    callback: () => any;
    disabled?: boolean;
  }>;
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
