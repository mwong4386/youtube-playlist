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

const renderIcon = (
  icon: "plus" | "chevron-down" | "edit" | "check" | "x"
) => {
  const pathByIcon = {
    plus: "M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z",
    "chevron-down":
      "M6.72 8.97a1 1 0 0 1 1.41 0L12 12.84l3.87-3.87a1 1 0 1 1 1.41 1.41l-4.58 4.59a1 1 0 0 1-1.41 0L6.72 10.38a1 1 0 0 1 0-1.41Z",
    edit: "M15.24 3.86a2 2 0 0 1 2.83 0l2.07 2.07a2 2 0 0 1 0 2.83l-9.9 9.9a1 1 0 0 1-.46.26l-4 1a1 1 0 0 1-1.22-1.22l1-4a1 1 0 0 1 .26-.46l9.42-9.38ZM14 6.5 7.44 13.06l-.58 2.32 2.32-.58L15.74 8.24 14 6.5Z",
    check:
      "M9.55 16.06 5.3 11.81a1 1 0 1 1 1.4-1.42l2.85 2.84 7.75-7.74a1 1 0 1 1 1.4 1.41l-8.45 8.45a1 1 0 0 1-1.4 0Z",
    x: "M7.4 6 12 10.6 16.6 6a1 1 0 0 1 1.4 1.4L13.4 12l4.6 4.6a1 1 0 1 1-1.4 1.4L12 13.4 7.4 18a1 1 0 0 1-1.4-1.4l4.6-4.6L6 7.4A1 1 0 0 1 7.4 6Z",
  } as const;

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles["row-icon-svg"]}>
      <path fill="currentColor" d={pathByIcon[icon]} />
    </svg>
  );
};

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

  if (item.kind === "song-list-inline-edit") {
    return (
      <div className={`${styles["row"]} ${styles["inline-edit-row"]}`}>
        <div className={styles["inline-edit-controls"]}>
          <input
            type="text"
            className={styles["inline-edit-input"]}
            value={item.editValue || ""}
            onChange={(event) => item.onEditValueChange?.(event.currentTarget.value)}
            aria-label={`Rename ${item.songListName || "song list"}`}
            autoFocus
          />
          <button
            type="button"
            className={styles["row-icon-button"]}
            onClick={() => item.onSaveEdit?.()}
            aria-label={`Save ${item.songListName || "song list"} rename`}
          >
            {renderIcon(item.saveIcon || "check")}
          </button>
          <button
            type="button"
            className={styles["row-icon-button"]}
            onClick={() => item.onCancelEdit?.()}
            aria-label={`Cancel ${item.songListName || "song list"} rename`}
          >
            {renderIcon(item.cancelIcon || "x")}
          </button>
        </div>
        {item.errorMessage ? (
          <p className={styles["inline-edit-error"]} role="alert">
            {item.errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  if (item.kind === "song-list-row") {
    return (
      <div
        className={`${styles["row"]} ${styles["song-list-row-container"]} ${
          item.isActive ? styles["row-active"] : ""
        }`}
      >
        <button type="button" className={styles["row-main-button"]} onClick={() => {
          item.callback?.();
          if (item.shouldCloseOnClick !== false) {
            close();
          }
        }}>
          <span className={styles["row-label"]}>{item.description}</span>
          {item.isActive ? <span className={styles["row-current-dot"]} /> : null}
        </button>
        <button
          type="button"
          className={styles["row-icon-button"]}
          onClick={() => item.onEdit?.()}
          aria-label={`Rename ${item.songListName || item.description || "song list"}`}
        >
          {renderIcon(item.trailingIcon || "edit")}
        </button>
      </div>
    );
  }

  if (item.kind === "song-list-selector") {
    return (
      <button
        type="button"
        className={`${styles["row"]} ${styles["row-button"]} ${styles["selector-row"]}`}
        onClick={() => {
          item.callback?.();
        }}
      >
        <span className={styles["selector-label"]}>{item.description}</span>
        {item.trailingIcon ? (
          <span className={styles["selector-chevron"]}>
            {renderIcon(item.trailingIcon)}
          </span>
        ) : null}
      </button>
    );
  }

  const onClick = () => {
    if (item.callback) {
      item.callback();
    }
    if (item.shouldCloseOnClick !== false) {
      close();
    }
  };

  if (item.kind === "song-list-action") {
    return (
      <button
        type="button"
        className={`${styles["row"]} ${styles["row-button"]} ${styles["song-list-action-row"]}`}
        onClick={onClick}
      >
        <span className={styles["row-copy"]}>
          {item.leadingIcon ? (
            <span className={styles["row-leading-icon"]}>{renderIcon(item.leadingIcon)}</span>
          ) : null}
          <span className={styles["row-label"]}>{item.description}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles["row"]} ${styles["row-button"]} ${styles["action-row"]} ${
        item.tone === "danger" ? styles["row-danger"] : ""
      }`}
      onClick={onClick}
    >
      <span className={styles["row-copy"]}>
        {item.leadingIcon ? (
          <span className={styles["row-leading-icon"]}>{renderIcon(item.leadingIcon)}</span>
        ) : null}
        <span className={styles["row-label"]}>{item.description}</span>
      </span>
      {item.trailingIcon ? (
        <span className={styles["row-trailing-icon"]}>
          {renderIcon(item.trailingIcon)}
        </span>
      ) : null}
    </button>
  );
};

export default ActionSheetItem;
