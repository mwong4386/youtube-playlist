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
import ModalChromeHeader from "../modal/ModalChromeHeader";
import modalStyles from "../modal/Modal.module.css";
import styles from "./GeminiEqProfileBuilder.module.css";

interface Props {
  existingProfiles: AudioEqProfile[];
  geminiApiKey: string;
  songContext?: GeminiSongContext;
  onBack: () => void;
  onOpenSettings: () => void;
  onCreateProfile: (name: string, audioEq: AudioEqSettings) => void;
  requestGeminiEqProfile: (
    request: GeminiEqProfileUserRequest,
  ) => Promise<GeminiEqProfileResponse>;
  embedded?: boolean;
  onPreviewProfile?: (suggestion: GeminiEqProfileSuggestion) => void;
}

const GeminiEqProfileBuilder = ({
  existingProfiles,
  geminiApiKey,
  songContext,
  onBack,
  onOpenSettings,
  onCreateProfile,
  requestGeminiEqProfile,
  embedded = false,
  onPreviewProfile,
}: Props) => {
  const [userRequest, setUserRequest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] =
    useState<GeminiEqProfileSuggestion | null>(null);
  const hasGeminiApiKey = geminiApiKey.trim().length > 0;

  const onGenerate = async () => {
    if (!hasGeminiApiKey) {
      onOpenSettings();
      return;
    }

    const normalizedRequest = userRequest.trim();

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
      if (embedded && onPreviewProfile) {
        onPreviewProfile(response.suggestion);
      }
      setMessage(
        embedded
          ? "Review and edit the EQ profile below."
          : "Review the EQ profile before creating it.",
      );
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

  const primaryAction = (
    <button
      type="button"
      className={`${styles.primaryButton} ${
        embedded ? styles.embeddedActionButton : ""
      }`}
      onClick={hasGeminiApiKey ? onGenerate : onOpenSettings}
      disabled={isGenerating}
    >
      {isGenerating ? "Generating..." : hasGeminiApiKey ? "Generate" : "Key"}
    </button>
  );

  return (
    <section
      className={styles.panel}
      aria-label={
        embedded
          ? "Gemini assisted profile creation"
          : "Gemini EQ profile builder"
      }
    >
      {!embedded && (
        <ModalChromeHeader
          title="Gemini EQ"
          variant="centered"
          closeLabel="Close Gemini EQ"
          onClose={onBack}
        />
      )}
      {embedded && (
        <div className={styles.embeddedHeader}>
          <h3 className={styles.embeddedTitle}>Ask Gemini</h3>
          {primaryAction}
        </div>
      )}
      <div className={styles.body}>
        <label className={styles.label}>
          <textarea
            className={styles.textarea}
            aria-label="Describe an optional EQ preference"
            value={userRequest}
            onChange={(event) => {
              setUserRequest(event.currentTarget.value);
            }}
            placeholder={
              hasGeminiApiKey
                ? "Describe an optional EQ preference, like make vocals warmer, add bass, or leave blank for Gemini to infer."
                : "Add a Gemini API key first, then describe an optional EQ preference."
            }
            disabled={!hasGeminiApiKey}
          />
        </label>
        {!embedded && <div className={styles.actions}>{primaryAction}</div>}
        <p className={styles.message} role="status" aria-live="polite">
          {message}
        </p>
        {suggestion && !embedded && (
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
                className={modalStyles["chrome-confirm-button"]}
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
