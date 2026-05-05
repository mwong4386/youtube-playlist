import MActionSheetItem from "../../models/MActionSheetItem";
import {
  getThemePreferenceIndex,
  THEME_PREFERENCE_OPTIONS,
} from "../../utils/theme";
import {
  BackIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
} from "../icons";
import styles from "./ActionSheet.module.css";

interface props {
  item: MActionSheetItem;
  close: () => void;
}

const renderIcon = (
  icon: "plus" | "chevron-down" | "edit" | "check" | "x" | "back"
) => {
  const iconClassName = styles["row-icon-svg"];

  switch (icon) {
    case "plus":
      return <PlusIcon className={iconClassName} />;
    case "chevron-down":
      return <ChevronDownIcon className={iconClassName} />;
    case "edit":
      return <EditIcon className={iconClassName} />;
    case "check":
      return <CheckIcon className={iconClassName} />;
    case "x":
      return <CloseIcon className={iconClassName} />;
    case "back":
      return <BackIcon className={iconClassName} />;
  }
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
          className={`${styles["row-icon-button"]} ${styles["row-icon-button-plain"]}`}
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
