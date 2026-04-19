import styles from "./Playlist.module.css";

interface Props {
  title?: string;
  detail?: string;
  actionLabel?: string;
  dismissible?: boolean;
  onStop: () => void;
  onDismiss: () => void;
}

const AnalyzeImportBannerPanel = ({
  title,
  detail,
  actionLabel,
  dismissible,
  onStop,
  onDismiss,
}: Props) => {
  return (
    <div className={styles["analyze-import-banner-container"]}>
      <div className={styles["analyze-import-banner"]}>
        <div className={styles["analyze-import-banner-header"]}>
          <p className={styles["analyze-import-banner-title"]}>{title}</p>
          {actionLabel === "Stop" ? (
            <button
              type="button"
              aria-label="Stop import analysis"
              className={styles["analyze-import-banner-stop-button"]}
              onClick={onStop}
            >
              <span
                aria-hidden="true"
                className={styles["analyze-import-banner-stop-icon"]}
              />
            </button>
          ) : null}
          {dismissible ? (
            <button
              type="button"
              aria-label="Dismiss import analysis status"
              className={styles["analyze-import-banner-close-button"]}
              onClick={onDismiss}
            >
              ×
            </button>
          ) : null}
        </div>
        <p className={styles["analyze-import-banner-detail"]}>{detail}</p>
      </div>
    </div>
  );
};

export default AnalyzeImportBannerPanel;
