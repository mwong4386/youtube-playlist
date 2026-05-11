import type { ReactNode } from "react";
import { CloseIcon } from "../icons";
import styles from "./Modal.module.css";

interface Props {
  title: string;
  subtitle?: string;
  titleContent?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  titleClassName?: string;
  closeIcon?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  closeDisabled?: boolean;
  // Replace balanceActionSlot with variant
  variant?: "centered" | "roomy";
}

const ModalChromeHeader = ({
  title,
  subtitle,
  titleContent,
  badge,
  action,
  titleClassName,
  closeIcon,
  closeLabel,
  onClose,
  closeDisabled,
  variant = "centered", // Default to centered
}: Props) => {
  const isCentered = variant === "centered";

  return (
    <div className={styles["chrome-header"]}>
      <div className={styles["chrome-header-left"]}>
        <button
          type="button"
          className={styles["chrome-close-button"]}
          disabled={closeDisabled}
          onClick={onClose}
          aria-label={closeLabel}
          title={closeLabel}
        >
          {closeIcon || <CloseIcon />}
        </button>
        {isCentered && (
          <div className={styles["chrome-ghost"]} aria-hidden="true">
            {action || badge || null}
          </div>
        )}
      </div>
      <div className={styles["chrome-title-stack"]}>
        {titleContent || (
          <>
            <h2
              className={`${styles["chrome-title"]} ${titleClassName || ""}`}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className={styles["chrome-subtitle"]}>{subtitle}</p>
            ) : null}
          </>
        )}
      </div>
      <div className={styles["chrome-header-action"]}>
        {isCentered && (
          <div className={styles["chrome-ghost"]} aria-hidden="true">
            <div className={styles["chrome-close-button"]}>
              {closeIcon || <CloseIcon />}
            </div>
          </div>
        )}
        {action || badge || null}
      </div>
    </div>
  );
};

export default ModalChromeHeader;
