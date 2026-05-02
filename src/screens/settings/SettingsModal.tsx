import { useEffect, useState } from "react";
import AudioEqProfile, {
  AUDIO_EQ_PROFILE_LIMIT,
} from "../../models/AudioEqProfile";
import Modal from "../modal/Modal";
import ModalChromeHeader from "../modal/ModalChromeHeader";
import modalStyles from "../modal/Modal.module.css";
import {
  AudioEqSliderList,
  formatAudioEqValue,
} from "../audioEq/AudioEqSliderList";
import styles from "./SettingsModal.module.css";
import AudioEqSettings from "../../models/AudioEq";
import {
  AUDIO_EQ_BANDS,
  AUDIO_EQ_MAX,
  AUDIO_EQ_MIN,
} from "../../utils/audioEq";
import {
  AudioEqProfileDraft,
  createAudioEqProfileDraft,
  isAudioEqProfileDraftDirty,
  shouldReplaceAudioEqProfileDraft,
  updateAudioEqProfileDraftBand,
  updateAudioEqProfileDraftName,
} from "../../utils/audioEqProfiles";

const getAudioEqSummary = (audioEq: AudioEqSettings) => {
  return AUDIO_EQ_BANDS.map((band) => {
    return `${band.shortLabel} ${formatAudioEqValue(audioEq[band.key])}`;
  }).join(" • ");
};

interface Props {
  active: boolean;
  close: () => void;
  audioEqProfiles: AudioEqProfile[];
  onCreateProfile: (name: string, audioEq: AudioEqSettings) => void;
  onUpdateProfile: (profile: AudioEqProfile) => void;
  onDeleteProfile: (id: string) => void;
}

const SettingsModal = ({
  active,
  close,
  audioEqProfiles,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
}: Props) => {
  const [isProfileEditorOpen, setProfileEditorOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<AudioEqProfileDraft>(
    createAudioEqProfileDraft()
  );
  const [editingSourceProfile, setEditingSourceProfile] =
    useState<AudioEqProfile | null>(null);
  const hasReachedProfileLimit = audioEqProfiles.length >= AUDIO_EQ_PROFILE_LIMIT;
  const isEditing = editingProfileId !== null;
  const isProfileFormDirty = isAudioEqProfileDraftDirty(
    editingSourceProfile,
    profileForm
  );
  const canCreateProfile = !hasReachedProfileLimit;

  useEffect(() => {
    if (!active) {
      setProfileEditorOpen(false);
      setEditingProfileId(null);
      setEditingSourceProfile(null);
      setProfileForm(createAudioEqProfileDraft());
    }
  }, [active]);

  useEffect(() => {
    if (!editingProfileId) {
      return;
    }

    const nextProfile = audioEqProfiles.find(
      (candidate) => candidate.id === editingProfileId
    ) || null;

    if (!nextProfile) {
      setEditingProfileId(null);
      setEditingSourceProfile(null);
      setProfileForm(createAudioEqProfileDraft());
      return;
    }

    if (
      shouldReplaceAudioEqProfileDraft({
        sourceProfile: editingSourceProfile,
        nextProfile,
        draft: profileForm,
      })
    ) {
      setEditingSourceProfile(nextProfile);
      setProfileForm(createAudioEqProfileDraft(nextProfile));
    }
  }, [audioEqProfiles, editingProfileId, editingSourceProfile, profileForm]);

  const startCreatingProfile = () => {
    setProfileEditorOpen(true);
    setEditingProfileId(null);
    setEditingSourceProfile(null);
    setProfileForm(createAudioEqProfileDraft());
  };

  const startEditingProfile = (profile: AudioEqProfile) => {
    setProfileEditorOpen(true);
    setEditingProfileId(profile.id);
    setEditingSourceProfile(profile);
    setProfileForm(createAudioEqProfileDraft(profile));
  };

  const closeProfileEditor = () => {
    setProfileEditorOpen(false);
    setEditingProfileId(null);
    setEditingSourceProfile(null);
    setProfileForm(createAudioEqProfileDraft());
  };

  const resetProfileForm = () => {
    if (editingSourceProfile) {
      setProfileForm(createAudioEqProfileDraft(editingSourceProfile));
      return;
    }

    setProfileForm(createAudioEqProfileDraft());
  };

  const saveProfile = () => {
    if (isEditing && editingProfileId) {
      const nextProfile = {
        id: editingProfileId,
        name: profileForm.name,
        audioEq: profileForm.audioEq,
      };
      onUpdateProfile(nextProfile);
      closeProfileEditor();
      return;
    }

    onCreateProfile(profileForm.name, profileForm.audioEq);
    closeProfileEditor();
  };

  return (
    <>
      <Modal active={active} close={close}>
        <div className={`${modalStyles["chrome-panel"]} ${styles["panel"]}`}>
          <ModalChromeHeader
            title="EQ Profiles"
            subtitle="Reusable curves for saved songs"
            closeLabel="Close settings"
            onClose={close}
            action={
              canCreateProfile ? (
                <button
                  type="button"
                  className={modalStyles["chrome-primary-button"]}
                  onClick={startCreatingProfile}
                >
                  Create
                </button>
              ) : (
                <span className={modalStyles["chrome-badge"]}>
                  {audioEqProfiles.length}/{AUDIO_EQ_PROFILE_LIMIT}
                </span>
              )
            }
          />
          <section
            className={`${modalStyles["chrome-section"]} ${styles["section"]}`}
            aria-labelledby="eq-profiles-section-title"
          >
            <h3 id="eq-profiles-section-title" className={styles["section-title"]}>
              Manage reusable EQ curves
            </h3>
            <p className={styles["note"]}>
              Create up to {AUDIO_EQ_PROFILE_LIMIT} reusable EQ profiles. Each profile
              saves all six bands.
            </p>
            {hasReachedProfileLimit ? (
              <span className={styles["limit-note"]}>
                Delete a profile to add another.
              </span>
            ) : null}
            <div className={styles["profile-list"]}>
              {audioEqProfiles.length === 0 ? (
                <div
                  className={`${modalStyles["chrome-inset-panel"]} ${styles["empty-state"]}`}
                >
                  No EQ profiles yet. Create one to save your favorite curve.
                </div>
              ) : (
                audioEqProfiles.map((profile) => {
                  const isSelected = editingProfileId === profile.id;
                  return (
                    <article
                      key={profile.id}
                      className={`${modalStyles["chrome-inset-panel"]} ${
                        styles["profile-card"]
                      } ${
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
                            className={modalStyles["chrome-primary-button"]}
                            onClick={() => {
                              startEditingProfile(profile);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={modalStyles["chrome-danger-button"]}
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
            {!canCreateProfile ? (
              <section
                className={`${modalStyles["chrome-muted-panel"]} ${styles["editor"]}`}
                aria-labelledby="eq-profile-editor-title"
              >
                <div className={styles["editor-header"]}>
                  <div>
                    <h4 id="eq-profile-editor-title" className={styles["editor-title"]}>
                      Profile limit reached
                    </h4>
                    <p className={styles["editor-note"]}>
                      You already have {AUDIO_EQ_PROFILE_LIMIT} saved profiles. Edit an
                      existing profile or delete one to make room for a new preset.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </section>
        </div>
      </Modal>
      <Modal active={isProfileEditorOpen} close={closeProfileEditor}>
        <div className={`${modalStyles["chrome-panel"]} ${styles["editor-panel"]}`}>
          <ModalChromeHeader
            title={isEditing ? "Update profile" : "Create profile"}
            subtitle={
              isEditing
                ? "Adjust the name and band levels"
                : "Set a name and tune each band"
            }
            closeLabel="Close profile editor"
            onClose={closeProfileEditor}
            action={
              <button
                type="button"
                className={modalStyles["chrome-confirm-button"]}
                onClick={saveProfile}
              >
                Save
              </button>
            }
          />
          <label className={styles["field"]}>
            <span className={styles["field-label"]}>Profile name</span>
            <input
              type="text"
              value={profileForm.name}
              maxLength={40}
              placeholder="New profile"
              className={modalStyles["chrome-text-input"]}
              onChange={(event) => {
                const nextName = event.currentTarget.value;
                setProfileForm((current) =>
                  updateAudioEqProfileDraftName(current, nextName)
                );
              }}
            />
          </label>
          <AudioEqSliderList
            bands={AUDIO_EQ_BANDS}
            settings={profileForm.audioEq}
            classes={{
              list: styles["slider-list"],
              row: styles["slider-row"],
              label: styles["slider-label"],
              slider: styles["slider-input"],
              value: styles["slider-value"],
            }}
            renderSlider={(band, sliderClassName) => (
              <input
                id={band.key}
                type="range"
                min={AUDIO_EQ_MIN}
                max={AUDIO_EQ_MAX}
                step="1"
                value={profileForm.audioEq[band.key]}
                className={sliderClassName}
                onChange={(event) => {
                  const nextValue = Number(event.currentTarget.value);
                  setProfileForm((current) =>
                    updateAudioEqProfileDraftBand(
                      current,
                      band.key,
                      nextValue
                    )
                  );
                }}
              />
            )}
          />
          <div className={styles["editor-actions"]}>
            <button
              type="button"
              className={modalStyles["chrome-secondary-button"]}
              onClick={resetProfileForm}
            >
              {isProfileFormDirty ? "Reset changes" : "Reset"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SettingsModal;
