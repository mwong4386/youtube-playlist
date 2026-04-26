import { useState, useEffect } from "react";
import type AudioEqProfile from "../../models/AudioEqProfile";
import type {
  GeminiSongEqResponse,
  GeminiSongEqSuggestion,
  GeminiSongEqUserRequest,
} from "../../models/GeminiActions";
import type MPlaylistItem from "../../models/MPlaylistItem";
import { AUDIO_EQ_BANDS } from "../../utils/audioEq";
import Modal from "../modal/Modal";
import styles from "./Playlist.module.css";

interface Props {
  active: boolean;
  close: () => void;
  selectedCount: number;
  selectedUncalibratedCount: number;
  selectedSong?: MPlaylistItem;
  audioEqProfiles: AudioEqProfile[];
  firstSelectedItemVolume?: number;
  onAnalyzeSelected: () => void;
  onAnalyzeUncalibratedSelected: () => void;
  onDeleteSelected: () => void;
  onAdjustVolumeSelected: (multiplier: number) => void;
  onAdjustSongEqWithGemini: (
    request: GeminiSongEqUserRequest,
  ) => Promise<GeminiSongEqResponse>;
  onApplyGeminiSongEqSuggestion: (suggestion: GeminiSongEqSuggestion) => void;
}

const SelectionActionsModal = ({
  active,
  close,
  selectedCount,
  selectedUncalibratedCount,
  selectedSong,
  audioEqProfiles,
  firstSelectedItemVolume,
  onAnalyzeSelected,
  onAnalyzeUncalibratedSelected,
  onDeleteSelected,
  onAdjustVolumeSelected,
  onAdjustSongEqWithGemini,
  onApplyGeminiSongEqSuggestion,
}: Props) => {
  const [view, setView] = useState<"menu" | "volume" | "geminiEq">("menu");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [geminiEqRequest, setGeminiEqRequest] = useState("");
  const [geminiEqStatus, setGeminiEqStatus] = useState("");
  const [geminiEqSuggestion, setGeminiEqSuggestion] =
    useState<GeminiSongEqSuggestion | null>(null);
  const [isGeminiEqLoading, setIsGeminiEqLoading] = useState(false);

  useEffect(() => {
    if (!active) {
      setView("menu");
      setMultiplier(1);
      setGeminiEqRequest("");
      setGeminiEqStatus("");
      setGeminiEqSuggestion(null);
      setIsGeminiEqLoading(false);
    }
  }, [active]);

  const previewNewVolume =
    firstSelectedItemVolume !== undefined
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(Number((firstSelectedItemVolume * multiplier).toPrecision(12))),
          ),
        )
      : null;

  const handleApplyVolume = () => {
    onAdjustVolumeSelected(multiplier);
  };

  const handleGenerateGeminiEq = async () => {
    if (selectedCount !== 1 || !selectedSong) {
      setGeminiEqStatus("Please select one song for Gemini EQ.");
      setGeminiEqSuggestion(null);
      return;
    }

    setGeminiEqStatus("Generating suggestion...");
    setGeminiEqSuggestion(null);
    setIsGeminiEqLoading(true);

    const response = await onAdjustSongEqWithGemini({
      userRequest: geminiEqRequest,
      existingProfiles: audioEqProfiles,
      songContext: {
        id: selectedSong.id,
        title: selectedSong.title,
        channelName: selectedSong.channelName,
        videoId: selectedSong.videoId,
        url: selectedSong.url,
        audioEq: selectedSong.audioEq,
      },
    });

    setIsGeminiEqLoading(false);

    if (!response.ok) {
      setGeminiEqStatus(response.message);
      return;
    }

    setGeminiEqSuggestion(response.suggestion);
    setGeminiEqStatus(response.suggestion.reason || "Review the suggestion.");
  };

  const handleApplyGeminiEq = () => {
    if (!geminiEqSuggestion) {
      return;
    }

    onApplyGeminiSongEqSuggestion(geminiEqSuggestion);
  };

  return (
    <Modal active={active} close={close}>
      <div className={styles["selection-actions-modal"]}>
        <div className={styles["selection-actions-modal-header"]}>
          {view !== "menu" ? (
            <button
              type="button"
              className={styles["selection-actions-back-button"]}
              onClick={() => setView("menu")}
              aria-label="Back to actions menu"
            >
              ←
            </button>
          ) : (
            <p className={styles["selection-actions-modal-text"]}>
              Actions for {selectedCount} selected
              {selectedCount === 1 ? " song" : " songs"}
            </p>
          )}
          <p className={styles["selection-actions-modal-title"]}>
            {view === "volume" ? "Adjust Volume" : ""}
            {view === "geminiEq" ? "Gemini EQ" : ""}
          </p>
          <button
            type="button"
            className={styles["selection-actions-close-button"]}
            onClick={close}
            aria-label="Close selected song actions"
          >
            x
          </button>
        </div>

        {view === "menu" ? (
          <div className={styles["selection-actions-modal-actions"]}>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={onAnalyzeSelected}
            >
              Analyze Timing
            </button>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={onAnalyzeUncalibratedSelected}
              disabled={selectedUncalibratedCount === 0}
            >
              Analyze Uncalibrated
            </button>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={() => setView("volume")}
            >
              Adjust Volume Ratio
            </button>
            <button
              type="button"
              className={styles["selection-actions-analyze-button"]}
              onClick={() => setView("geminiEq")}
            >
              Gemini EQ
            </button>
            <button
              type="button"
              className={styles["selection-actions-delete-button"]}
              onClick={onDeleteSelected}
            >
              Delete Songs
            </button>
            <button
              type="button"
              className={styles["selection-actions-cancel-button"]}
              onClick={close}
            >
              Cancel
            </button>
          </div>
        ) : view === "volume" ? (
          <div className={styles["selection-actions-volume-form"]}>
            <div className={styles["selection-actions-volume-input-row"]}>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                className={styles["selection-actions-volume-multiplier-input"]}
                aria-label="Volume multiplier"
              />
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                className={styles["selection-actions-volume-slider"]}
                aria-label="Volume multiplier slider"
              />
            </div>

            {previewNewVolume !== null && (
              <p className={styles["selection-actions-volume-preview"]}>
                Example: {firstSelectedItemVolume} → {previewNewVolume}
              </p>
            )}

            <button
              type="button"
              className={styles["selection-actions-volume-submit-button"]}
              onClick={handleApplyVolume}
            >
              Apply to {selectedCount} {selectedCount === 1 ? "song" : "songs"}
            </button>
          </div>
        ) : (
          <div className={styles["selection-actions-gemini-eq-form"]}>
            <textarea
              value={geminiEqRequest}
              onChange={(event) => setGeminiEqRequest(event.target.value)}
              className={styles["selection-actions-gemini-eq-textarea"]}
              placeholder="Describe the EQ change"
              aria-label="Describe the EQ change"
            />
            <button
              type="button"
              className={styles["selection-actions-volume-submit-button"]}
              onClick={handleGenerateGeminiEq}
              disabled={isGeminiEqLoading}
            >
              Generate
            </button>

            {geminiEqStatus && (
              <p className={styles["selection-actions-volume-preview"]}>
                {geminiEqStatus}
              </p>
            )}

            {geminiEqSuggestion && (
              <div className={styles["selection-actions-gemini-eq-preview"]}>
                {AUDIO_EQ_BANDS.map((band) => (
                  <div
                    key={band.key}
                    className={styles["selection-actions-gemini-eq-band"]}
                  >
                    <span>{band.label}</span>
                    <span>{geminiEqSuggestion.audioEq[band.key]} dB</span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles["selection-actions-gemini-eq-actions"]}>
              <button
                type="button"
                className={styles["selection-actions-volume-submit-button"]}
                onClick={handleApplyGeminiEq}
                disabled={!geminiEqSuggestion}
              >
                Apply EQ
              </button>
              <button
                type="button"
                className={styles["selection-actions-cancel-button"]}
                onClick={() => {
                  setGeminiEqSuggestion(null);
                  setGeminiEqStatus("");
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SelectionActionsModal;
