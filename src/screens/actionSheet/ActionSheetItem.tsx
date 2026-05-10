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
  ExportIcon,
  GearIcon,
  ImportIcon,
  PlaylistCheckIcon,
  PlusIcon,
  TrashIcon,
  ExternalLinkIcon,
} from "../icons";
import styles from "./ActionSheet.module.css";

interface props {
  item: MActionSheetItem;
  close: () => void;
}

const renderIcon = (icon: NonNullable<MActionSheetItem["leadingIcon"]>) => {
  const iconClassName = styles["row-icon-svg"];

  switch (icon) {
    case "plus":
      return <PlusIcon className={iconClassName} />;
    case "chevron-down":
      return <ChevronDownIcon className={iconClassName} />;
    case "edit":
      return <EditIcon className={iconClassName} />;
    case "gear":
      return <GearIcon className={iconClassName} />;
    case "check":
      return <CheckIcon className={iconClassName} />;
    case "x":
      return <CloseIcon className={iconClassName} />;
    case "back":
      return <BackIcon className={iconClassName} />;
    case "import":
      return <ImportIcon className={iconClassName} />;
    case "export":
      return <ExportIcon className={iconClassName} />;
    case "playlist-check":
      return <PlaylistCheckIcon className={iconClassName} />;
    case "view":
      return <ExternalLinkIcon className={iconClassName} />;
    case "trash":
      return <TrashIcon className={iconClassName} />;
  }
};

const renderIconActions = (
  item: Pick<MActionSheetItem, "iconActions" | "shouldCloseOnClick">,
  close: () => void,
  className: string,
) =>
  item.iconActions?.map((action) => (
    <button
      key={action.label}
      type="button"
      className={className}
      onClick={() => {
        action.callback();
        if (item.shouldCloseOnClick !== false) {
          close();
        }
      }}
      aria-label={action.label}
      title={action.label}
      disabled={action.disabled}
    >
      {renderIcon(action.icon)}
    </button>
  ));

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
        </button>
        <span className={styles["song-list-row-actions"]}>
          <button
            type="button"
            className={`${styles["row-icon-button"]} ${styles["row-icon-button-plain"]}`}
            onClick={() => item.onEdit?.()}
            aria-label={`Rename ${item.songListName || item.description || "song list"}`}
          >
            {renderIcon(item.trailingIcon || "edit")}
          </button>
          {item.overflowIcon ? (
            <button
              type="button"
              className={`${styles["row-icon-button"]} ${styles["row-icon-button-plain"]}`}
              onClick={() => item.onOverflow?.()}
              aria-label={
                item.overflowLabel ||
                `Manage ${item.songListName || item.description || "song list"}`
              }
              title={
                item.overflowLabel ||
                `Manage ${item.songListName || item.description || "song list"}`
              }
            >
              {renderIcon(item.overflowIcon)}
            </button>
          ) : null}
        </span>
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
    const hasToolbarActions = item.iconActions && item.iconActions.length > 0;
    const hasLeadingActions = item.leadingIconActions && item.leadingIconActions.length > 0;

    if (hasToolbarActions || hasLeadingActions) {
      return (
        <div
          className={`${styles["row"]} ${styles["song-list-action-row"]} ${styles["song-list-toolbar-row"]}`}
        >
          <div className={styles["song-list-toolbar-actions"]}>
            {hasLeadingActions && renderIconActions(
              { iconActions: item.leadingIconActions, shouldCloseOnClick: item.shouldCloseOnClick },
              close,
              styles["song-list-toolbar-button"]
            )}
          </div>

          <button
            type="button"
            className={styles["song-list-action-main-button"]}
            onClick={onClick}
          >
            <span className={styles["row-copy"]}>
              {item.leadingIcon ? (
                <span className={styles["row-leading-icon"]}>
                  {renderIcon(item.leadingIcon)}
                </span>
              ) : null}
              <span className={styles["row-label"]}>{item.description}</span>
            </span>
          </button>
          
          <div className={styles["song-list-toolbar-actions"]}>
            {hasToolbarActions && renderIconActions(item, close, styles["song-list-toolbar-button"])}
          </div>
        </div>
      );
    }

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
