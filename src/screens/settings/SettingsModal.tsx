import { useEffect, useState } from "react";
import AudioEqProfile from "../../models/AudioEqProfile";
import Modal from "../modal/Modal";
import styles from "./SettingsModal.module.css";
import {
  getThemePreferenceIndex,
  getThemePreferenceLabel,
  THEME_PREFERENCE_OPTIONS,
  ThemePreference,
} from "../../utils/theme";
import AudioEqSettings from "../../models/AudioEq";
import {
  AUDIO_EQ_BANDS,
  AUDIO_EQ_MAX,
  AUDIO_EQ_MIN,
  DEFAULT_AUDIO_EQ_SETTINGS,
  normalizeAudioEqSettings,
} from "../../utils/audioEq";

interface ProfileFormState {
  name: string;
  audioEq: AudioEqSettings;
}

const createDefaultProfileFormState = (): ProfileFormState => ({
  name: "",
  audioEq: { ...DEFAULT_AUDIO_EQ_SETTINGS },
});

const formatEqValue = (value: number) => {
  return value > 0 ? `+${value}` : `${value}`;
};

const getAudioEqSummary = (audioEq: AudioEqSettings) => {
  return AUDIO_EQ_BANDS.map((band) => {
    return `${band.shortLabel} ${formatEqValue(audioEq[band.key])}`;
  }).join(" • ");
};

interface Props {
  active: boolean;
  close: () => void;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  audioEqProfiles: AudioEqProfile[];
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
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
}: Props) => {
  const activeThemeIndex = getThemePreferenceIndex(themePreference);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(
    createDefaultProfileFormState()
  );
  const hasReachedProfileLimit = audioEqProfiles.length >= 10;
  const isEditing = editingProfileId !== null;

  useEffect(() => {
    if (!active) {
      setEditingProfileId(null);
      setProfileForm(createDefaultProfileFormState());
    }
  }, [active]);

  useEffect(() => {
    if (!editingProfileId) {
      return;
    }

    const profile = audioEqProfiles.find(
      (candidate) => candidate.id === editingProfileId
    );

    if (!profile) {
      setEditingProfileId(null);
      setProfileForm(createDefaultProfileFormState());
      return;
    }

    setProfileForm({
      name: profile.name,
      audioEq: normalizeAudioEqSettings(profile.audioEq),
    });
  }, [audioEqProfiles, editingProfileId]);

  const startCreatingProfile = () => {
    setEditingProfileId(null);
    setProfileForm(createDefaultProfileFormState());
  };

  const startEditingProfile = (profile: AudioEqProfile) => {
    setEditingProfileId(profile.id);
    setProfileForm({
      name: profile.name,
      audioEq: normalizeAudioEqSettings(profile.audioEq),
    });
  };

  const closeProfileEditor = () => {
    setEditingProfileId(null);
    setProfileForm(createDefaultProfileFormState());
  };

  const resetProfileForm = () => {
    if (isEditing && editingProfileId) {
      const profile = audioEqProfiles.find(
        (candidate) => candidate.id === editingProfileId
      );
      if (profile) {
        setProfileForm({
          name: profile.name,
          audioEq: normalizeAudioEqSettings(profile.audioEq),
        });
        return;
      }
    }

    setProfileForm(createDefaultProfileFormState());
  };

  const saveProfile = () => {
    if (isEditing && editingProfileId) {
      onUpdateProfile({
        id: editingProfileId,
        name: profileForm.name,
        audioEq: profileForm.audioEq,
      });
      return;
    }

    onCreateProfile(profileForm.name, profileForm.audioEq);
    closeProfileEditor();
  };

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
              {audioEqProfiles.length}/10
            </span>
          </div>
          <p className={styles["note"]}>
            Create up to 10 reusable EQ profiles. Each profile saves all six bands.
          </p>
          <div className={styles["profile-toolbar"]}>
            <button
              type="button"
              className={styles["primary-button"]}
              disabled={hasReachedProfileLimit}
              onClick={startCreatingProfile}
            >
              Create profile
            </button>
            {hasReachedProfileLimit ? (
              <span className={styles["limit-note"]}>
                Delete a profile to add another.
              </span>
            ) : null}
          </div>
          <div className={styles["profile-list"]}>
            {audioEqProfiles.length === 0 ? (
              <div className={styles["empty-state"]}>
                No EQ profiles yet. Create one to save your favorite curve.
              </div>
            ) : (
              audioEqProfiles.map((profile) => {
                const isSelected = editingProfileId === profile.id;
                return (
                  <article
                    key={profile.id}
                    className={`${styles["profile-card"]} ${
                      isSelected ? styles["profile-card-selected"] : ""
                    }`}
                  >
                    <div className={styles["profile-card-header"]}>
                      <div>
                        <h4 className={styles["profile-name"]}>{profile.name}</h4>
                        <p className={styles["profile-summary"]}>
                          {getAudioEqSummary(profile.audioEq)}
                        </p>
                      </div>
                      <div className={styles["profile-actions"]}>
                        <button
                          type="button"
                          className={styles["secondary-button"]}
                          onClick={() => {
                            startEditingProfile(profile);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles["danger-button"]}
                          onClick={() => {
                            onDeleteProfile(profile.id);
                            if (editingProfileId === profile.id) {
                              closeProfileEditor();
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <section className={styles["editor"]} aria-labelledby="eq-profile-editor-title">
            <div className={styles["editor-header"]}>
              <div>
                <h4 id="eq-profile-editor-title" className={styles["editor-title"]}>
                  {isEditing ? "Edit profile" : "Create profile"}
                </h4>
                <p className={styles["editor-note"]}>
                  {isEditing
                    ? "Adjust the name and band levels, then save your changes."
                    : "Set a name and tune each band before saving the new profile."}
                </p>
              </div>
              {isEditing && !hasReachedProfileLimit ? (
                <button
                  type="button"
                  className={styles["secondary-button"]}
                  onClick={closeProfileEditor}
                >
                  New profile
                </button>
              ) : null}
            </div>
            <label className={styles["field"]}>
              <span className={styles["field-label"]}>Profile name</span>
              <input
                type="text"
                value={profileForm.name}
                maxLength={40}
                placeholder="New profile"
                className={styles["text-input"]}
                onChange={(event) => {
                  setProfileForm((current) => ({
                    ...current,
                    name: event.currentTarget.value,
                  }));
                }}
              />
            </label>
            <div className={styles["slider-list"]}>
              {AUDIO_EQ_BANDS.map((band) => (
                <label key={band.key} className={styles["slider-row"]}>
                  <span className={styles["slider-label"]}>{band.label}</span>
                  <input
                    type="range"
                    min={AUDIO_EQ_MIN}
                    max={AUDIO_EQ_MAX}
                    step="1"
                    value={profileForm.audioEq[band.key]}
                    className={styles["slider-input"]}
                    onChange={(event) => {
                      const nextValue = Number(event.currentTarget.value);
                      setProfileForm((current) => ({
                        ...current,
                        audioEq: {
                          ...current.audioEq,
                          [band.key]: nextValue,
                        },
                      }));
                    }}
                  />
                  <span className={styles["slider-value"]}>
                    {formatEqValue(profileForm.audioEq[band.key])}
                  </span>
                </label>
              ))}
            </div>
            <div className={styles["editor-actions"]}>
              <button
                type="button"
                className={styles["secondary-button"]}
                onClick={resetProfileForm}
              >
                Reset
              </button>
              <button
                type="button"
                className={styles["primary-button"]}
                onClick={saveProfile}
                disabled={!isEditing && hasReachedProfileLimit}
              >
                {isEditing ? "Save changes" : "Save profile"}
              </button>
            </div>
          </section>
        </section>
      </div>
    </Modal>
  );
};

export default SettingsModal;
