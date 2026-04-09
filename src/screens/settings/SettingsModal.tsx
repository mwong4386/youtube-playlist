import { useEffect, useState } from "react";
import AudioEqProfile, {
  AUDIO_EQ_PROFILE_LIMIT,
} from "../../models/AudioEqProfile";
import Modal from "../modal/Modal";
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
import {
  getMaskedGeminiApiKeyLabel,
  normalizeGeminiApiKey,
} from "../../utils/geminiSettings";

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
  audioEqProfiles: AudioEqProfile[];
  onCreateProfile: (name: string, audioEq: AudioEqSettings) => void;
  onUpdateProfile: (profile: AudioEqProfile) => void;
  onDeleteProfile: (id: string) => void;
  geminiApiKey: string;
  onSaveGeminiApiKey: (value: string) => Promise<void>;
  onRemoveGeminiApiKey: () => Promise<void>;
}

const SettingsModal = ({
  active,
  close,
  audioEqProfiles,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  geminiApiKey,
  onSaveGeminiApiKey,
  onRemoveGeminiApiKey,
}: Props) => {
  const [isProfileEditorOpen, setProfileEditorOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<AudioEqProfileDraft>(
    createAudioEqProfileDraft()
  );
  const [editingSourceProfile, setEditingSourceProfile] =
    useState<AudioEqProfile | null>(null);
  const [geminiInputValue, setGeminiInputValue] = useState("");
  const [geminiStatus, setGeminiStatus] = useState("");
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
      setGeminiInputValue("");
      setGeminiStatus("");
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

  const saveGeminiApiKey = async () => {
    const normalized = normalizeGeminiApiKey(geminiInputValue);
    if (!normalized) {
      setGeminiStatus("Enter an API key before saving.");
      return;
    }

    await onSaveGeminiApiKey(normalized);
    setGeminiInputValue("");
    setGeminiStatus("Gemini API key saved.");
  };

  const removeGeminiApiKey = async () => {
    await onRemoveGeminiApiKey();
    setGeminiInputValue("");
    setGeminiStatus("Gemini API key removed.");
  };

  return (
    <>
      <Modal active={active} close={close}>
        <div className={styles["panel"]}>
          <div className={styles["header"]}>
            <div className={styles["header-main"]}>
              <h2 className={styles["title"]}>EQ Profiles</h2>
              <span className={styles["badge"]}>
                {audioEqProfiles.length}/{AUDIO_EQ_PROFILE_LIMIT}
              </span>
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
          <section className={styles["section"]} aria-labelledby="eq-profiles-section-title">
            <h3 id="eq-profiles-section-title" className={styles["section-title"]}>
              Manage reusable EQ curves
            </h3>
            <p className={styles["note"]}>
              Create up to {AUDIO_EQ_PROFILE_LIMIT} reusable EQ profiles. Each profile
              saves all six bands.
            </p>
            <div className={styles["profile-toolbar"]}>
              <button
                type="button"
                className={styles["primary-button"]}
                disabled={!canCreateProfile}
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
            {!canCreateProfile ? (
              <section className={styles["editor"]} aria-labelledby="eq-profile-editor-title">
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
          <section className={styles["section"]} aria-labelledby="gemini-section-title">
            <h3 id="gemini-section-title" className={styles["section-title"]}>
              Gemini
            </h3>
            <p className={styles["note"]}>
              Stored locally in this browser only. Websites and content scripts
              cannot read it.
            </p>
            <input
              type="password"
              value={geminiInputValue}
              onChange={(event) => {
                setGeminiInputValue(event.currentTarget.value);
                setGeminiStatus("");
              }}
              placeholder="Paste Gemini API key"
              className={styles["text-input"]}
            />
            <div className={styles["profile-toolbar"]}>
              <button
                type="button"
                className={styles["primary-button"]}
                onClick={saveGeminiApiKey}
              >
                Save key
              </button>
              <button
                type="button"
                className={styles["secondary-button"]}
                disabled={!geminiApiKey}
                onClick={removeGeminiApiKey}
              >
                Remove key
              </button>
            </div>
            <div className={styles["note"]}>
              {geminiStatus ||
                getMaskedGeminiApiKeyLabel(geminiApiKey) ||
                "No Gemini API key saved."}
            </div>
          </section>
        </div>
      </Modal>
      <Modal active={isProfileEditorOpen} close={closeProfileEditor}>
        <div className={styles["editor-panel"]}>
          <div className={styles["editor-panel-header"]}>
            <div>
              <h3 className={styles["editor-title"]}>
                {isEditing ? "Update profile" : "Create profile"}
              </h3>
              <p className={styles["editor-note"]}>
                {isEditing
                  ? "Adjust the name and band levels, then save your changes."
                  : "Set a name and tune each band before saving the new profile."}
              </p>
            </div>
            <button
              type="button"
              className={styles["close-button"]}
              onClick={closeProfileEditor}
              aria-label="Close profile editor"
            >
              x
            </button>
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
                const nextName = event.currentTarget.value;
                setProfileForm((current) =>
                  updateAudioEqProfileDraftName(current, nextName)
                );
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
                    setProfileForm((current) =>
                      updateAudioEqProfileDraftBand(
                        current,
                        band.key,
                        nextValue
                      )
                    );
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
              {isProfileFormDirty ? "Reset changes" : "Reset"}
            </button>
            <button
              type="button"
              className={styles["primary-button"]}
              onClick={saveProfile}
            >
              {isEditing ? "Save changes" : "Save profile"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SettingsModal;
