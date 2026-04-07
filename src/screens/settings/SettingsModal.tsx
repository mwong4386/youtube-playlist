import AudioEqSettings from "../../models/AudioEq";
import AudioEqProfile from "../../models/AudioEqProfile";
import Modal from "../modal/Modal";
import styles from "./SettingsModal.module.css";
import {
  getThemePreferenceLabel,
  ThemePreference,
} from "../../utils/theme";

interface Props {
  active: boolean;
  close: () => void;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  audioEqProfiles: AudioEqProfile[];
  saveProfiles: (profiles: AudioEqProfile[]) => void;
  onCreateProfile: (name: string, audioEq: AudioEqSettings) => void;
  onUpdateProfile: (profile: AudioEqProfile) => void;
  onDeleteProfile: (id: string) => void;
}

const SettingsModal = ({
  active,
  close,
  themePreference,
  setThemePreference,
  audioEqProfiles,
  saveProfiles,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
}: Props) => {
  void setThemePreference;
  void saveProfiles;
  void onCreateProfile;
  void onUpdateProfile;
  void onDeleteProfile;

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
            Theme controls will move here in Task 3. The popup is currently using
            the {getThemePreferenceLabel(themePreference).toLowerCase()} theme
            preference.
          </p>
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
