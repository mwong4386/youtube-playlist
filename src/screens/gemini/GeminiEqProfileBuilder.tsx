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
import GeminiKeyIcon from "../icons/GeminiKeyIcon";
import ModalChromeHeader from "../modal/ModalChromeHeader";
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
      <ModalChromeHeader
        title="Gemini EQ"
        closeLabel="Close Gemini EQ"
        onClose={onBack}
        action={
          <button
            type="button"
            className={styles.settingsButton}
            onClick={onOpenSettings}
            aria-label="Open Gemini settings"
          >
            <GeminiKeyIcon className={styles.settingsIcon} />
          </button>
        }
      />
      <div className={styles.body}>
        <label className={styles.label}>
          Describe an optional EQ preference
          <textarea
            className={styles.textarea}
            value={userRequest}
            onChange={(event) => {
              setUserRequest(event.currentTarget.value);
            }}
            placeholder="Make vocals warmer, add bass, or leave blank for Gemini to infer."
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
