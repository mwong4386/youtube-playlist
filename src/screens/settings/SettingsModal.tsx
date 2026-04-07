import AudioEqProfile from "../../models/AudioEqProfile";
import Modal from "../modal/Modal";
import styles from "./SettingsModal.module.css";
import {
  getThemePreferenceIndex,
  getThemePreferenceLabel,
  THEME_PREFERENCE_OPTIONS,
  ThemePreference,
} from "../../utils/theme";

interface Props {
  active: boolean;
  close: () => void;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  audioEqProfiles: AudioEqProfile[];
}

const SettingsModal = ({
  active,
  close,
  themePreference,
  setThemePreference,
  audioEqProfiles,
}: Props) => {
  const activeThemeIndex = getThemePreferenceIndex(themePreference);

  return (
    <Modal active={active} close={close}>
      <div className={styles["panel"]}>
        <div className={styles["header"]}>
          <div>
            <p className={styles["eyebrow"]}>Popup Settings</p>
            <h2 className={styles["title"]}>Settings</h2>
          </div>
          <button
            type="button"
            className={styles["close-button"]}
            onClick={close}
            aria-label="Close settings"
          >
            x
          </button>
        </div>
        <section className={styles["section"]} aria-labelledby="theme-section-title">
          <div className={styles["section-header"]}>
            <h3 id="theme-section-title" className={styles["section-title"]}>
              Theme
            </h3>
            <span className={styles["badge"]}>
              {getThemePreferenceLabel(themePreference)}
            </span>
          </div>
          <p className={styles["note"]}>
            Choose how the popup should look. The current preference is{" "}
            {getThemePreferenceLabel(themePreference).toLowerCase()}.
          </p>
          <div className={styles["segmented-control"]} role="group" aria-label="Theme">
            <div
              className={styles["segment-indicator"]}
              style={
                {
                  "--segment-index": activeThemeIndex,
                } as React.CSSProperties
              }
            />
            {THEME_PREFERENCE_OPTIONS.map((option) => {
              const isActive = themePreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles["segment-button"]} ${
                    isActive ? styles["segment-button-active"] : ""
                  }`}
                  aria-pressed={isActive}
                  onClick={() => {
                    setThemePreference(option.value);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
        <section className={styles["section"]} aria-labelledby="eq-profiles-section-title">
          <div className={styles["section-header"]}>
            <h3 id="eq-profiles-section-title" className={styles["section-title"]}>
              EQ Profiles
            </h3>
            <span className={styles["badge"]}>
              {audioEqProfiles.length} profile
              {audioEqProfiles.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className={styles["note"]}>
            EQ profile management UI is intentionally deferred to Task 3. This
            shell is keeping the popup state and entry point ready for it.
          </p>
        </section>
      </div>
    </Modal>
  );
};

export default SettingsModal;
