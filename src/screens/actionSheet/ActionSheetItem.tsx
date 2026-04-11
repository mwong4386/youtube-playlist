import MActionSheetItem from "../../models/MActionSheetItem";
import {
  getThemePreferenceIndex,
  THEME_PREFERENCE_OPTIONS,
} from "../../utils/theme";
import styles from "./ActionSheet.module.css";

interface props {
  item: MActionSheetItem;
  close: () => void;
}
const ActionSheetItem = ({ item, close }: props) => {
  if (item.kind === "theme-selector" && item.themePreference && item.onThemeChange) {
    const activeIndex = getThemePreferenceIndex(item.themePreference);

    return (
      <div className={`${styles["row"]} ${styles["control-row"]}`}>
        <div className={styles["segmented-control"]} role="group" aria-label="Theme">
          <div
            className={styles["segment-indicator"]}
            style={
              {
                "--segment-index": activeIndex,
              } as React.CSSProperties
            }
          />
          {THEME_PREFERENCE_OPTIONS.map((option) => {
            const isActive = item.themePreference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles["segment-button"]} ${
                  isActive ? styles["segment-button-active"] : ""
                }`}
                aria-pressed={isActive}
                onClick={() => item.onThemeChange?.(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const onClick = () => {
    if (item.callback) {
      item.callback();
    }
    close();
  };
  return (
    <div
      className={`${styles["row"]} ${
        item.tone === "danger" ? styles["row-danger"] : ""
      }`}
      onClick={onClick}
    >
      <p>{item.description}</p>
    </div>
  );
};

export default ActionSheetItem;
