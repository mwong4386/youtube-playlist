import type { ReactNode } from "react";
import { CloseIcon } from "../icons";
import styles from "./Modal.module.css";

interface Props {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  titleClassName?: string;
  closeIcon?: ReactNode;
  closeLabel: string;
  onClose: () => void;
}

const ModalChromeHeader = ({
  title,
  subtitle,
  badge,
  action,
  titleClassName,
  closeIcon,
  closeLabel,
  onClose,
}: Props) => {
  return (
    <div className={styles["chrome-header"]}>
      <button
        type="button"
        className={styles["chrome-close-button"]}
        onClick={onClose}
        aria-label={closeLabel}
        title={closeLabel}
      >
        {closeIcon || <CloseIcon />}
      </button>
      <div className={styles["chrome-title-stack"]}>
        <h2
          className={`${styles["chrome-title"]} ${titleClassName || ""}`}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className={styles["chrome-subtitle"]}>{subtitle}</p>
        ) : null}
      </div>
      <div className={styles["chrome-header-action"]}>
        {action || badge || null}
      </div>
    </div>
  );
};

export default ModalChromeHeader;
