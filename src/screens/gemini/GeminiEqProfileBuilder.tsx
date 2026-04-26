import { useState } from "react";
import type AudioEqSettings from "../../models/AudioEq";
import type AudioEqProfile from "../../models/AudioEqProfile";
import type {
  GeminiEqProfileResponse,
  GeminiEqProfileSuggestion,
  GeminiEqProfileUserRequest,
  GeminiSongContext,
} from "../../models/GeminiActions";
import { AUDIO_EQ_BANDS } from "../../utils/audioEq";
import styles from "./GeminiEqProfileBuilder.module.css";

interface Props {
  existingProfiles: AudioEqProfile[];
  songContext?: GeminiSongContext;
  onBack: () => void;
  onOpenSettings: () => void;
  onCreateProfile: (name: string, audioEq: AudioEqSettings) => void;
  requestGeminiEqProfile: (
    request: GeminiEqProfileUserRequest,
  ) => Promise<GeminiEqProfileResponse>;
}

const GeminiEqProfileBuilder = ({
  existingProfiles,
  songContext,
  onBack,
  onOpenSettings,
  onCreateProfile,
  requestGeminiEqProfile,
}: Props) => {
  const [userRequest, setUserRequest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState<GeminiEqProfileSuggestion | null>(
    null,
  );

  const onGenerate = async () => {
    const normalizedRequest = userRequest.trim();

    if (!normalizedRequest) {
      setMessage("Describe the EQ profile you want first.");
      return;
    }

    setIsGenerating(true);
    setSuggestion(null);
    setMessage("");

    try {
      const response = await requestGeminiEqProfile({
        userRequest: normalizedRequest,
        existingProfiles,
        songContext,
      });

      if (!response.ok) {
        setSuggestion(null);
        setMessage(response.message);
        return;
      }

      setSuggestion(response.suggestion);
      setMessage("Review the EQ profile before creating it.");
    } catch (_error) {
      setSuggestion(null);
      setMessage("Couldn't generate an EQ profile. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onCreate = () => {
    if (!suggestion) {
      return;
    }

    onCreateProfile(suggestion.name, suggestion.audioEq);
    setMessage("EQ profile created.");
    setSuggestion(null);
    setUserRequest("");
  };

  return (
    <section className={styles.panel} aria-label="Gemini EQ profile builder">
      <header className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onBack}
          aria-label="Back to playlist"
        >
          Back
        </button>
        <h2 className={styles.title}>Gemini EQ</h2>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onOpenSettings}
          aria-label="Open Gemini settings"
        >
          Settings
        </button>
      </header>
      <div className={styles.body}>
        <label className={styles.label}>
          Describe the profile
          <textarea
            className={styles.textarea}
            value={userRequest}
            onChange={(event) => {
              setUserRequest(event.currentTarget.value);
            }}
            placeholder="Make a warm vocal profile for acoustic live performances."
          />
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onOpenSettings}
          >
            Gemini settings
          </button>
        </div>
        <p className={styles.message} role="status" aria-live="polite">
          {message}
        </p>
        {suggestion && (
          <section className={styles.preview} aria-label="EQ profile preview">
            <h3 className={styles.previewTitle}>{suggestion.name}</h3>
            {suggestion.reason && (
              <p className={styles.reason}>{suggestion.reason}</p>
            )}
            <dl className={styles.bandList}>
              {AUDIO_EQ_BANDS.map((band) => (
                <div className={styles.bandRow} key={band.key}>
                  <dt>{band.label}</dt>
                  <dd>{suggestion.audioEq[band.key]}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onCreate}
              >
                Create profile
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setSuggestion(null);
                }}
              >
                Dismiss
              </button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
};

export default GeminiEqProfileBuilder;
