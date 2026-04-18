import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import AudioEqSettings from "../../models/AudioEq";
import AudioEqProfile from "../../models/AudioEqProfile";
import {
  GeminiAnalyzeErrorCode,
  type GeminiBoundarySuggestion,
  type GeminiAnalyzeFailure,
  type GeminiAnalyzeSuccess,
} from "../../models/GeminiSettings";
import MPlaylistItem from "../../models/MPlaylistItem";
import {
  AUDIO_EQ_BANDS,
  DEFAULT_AUDIO_EQ_SETTINGS,
  normalizeAudioEqSettings,
} from "../../utils/audioEq";
import {
  clearSelectedAudioEqProfileId,
  normalizeSelectedAudioEqProfileId,
  selectAudioEqProfileAudioEqById,
} from "../../utils/audioEqProfiles";
import Modal from "./Modal";
import InfoModalTransport from "./InfoModalTransport";
import styles from "./Modal.module.css";
import {
  applyGeminiSuggestionToFormValues,
  type GeminiSuggestionFormShape,
} from "./geminiSuggestionForm";
import { hasValidManualTimestampRange } from "./manualTimestampValidation";
import {
  beginAnalyzeRequest,
  shouldApplyAnalyzeResult,
  syncAnalyzeScope,
  type GeminiAnalyzeScope,
} from "./geminiAnalyzeRequest";
import {
  getInfoModalPresentation,
  shouldShowInfoModalTransport,
  type InfoModalPresentation,
} from "./infoModalPlaybackState";

interface Props {
  active: boolean;
  close: () => void;
  save: (
    id: string,
    timestamp: number,
    endTimestamp: number | undefined,
    volume: number,
    audioEq: AudioEqSettings,
    geminiSuggestion?: GeminiBoundarySuggestion
  ) => void;
  onvolumechange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioEqChange: (audioEq: Partial<AudioEqSettings>) => void;
  item: MPlaylistItem | undefined;
  profiles: AudioEqProfile[];
  currentPlaybackItemId?: string | null;
  isPlaybackActive: boolean;
  onAnalyzeSongBoundaries: (
    itemId: string
  ) => Promise<GeminiAnalyzeSuccess | GeminiAnalyzeFailure>;
}
type InfoModels = AudioEqSettings &
  GeminiSuggestionFormShape & {
  volume: number;
};
type InfoModalView = "info" | "eq";

const toNumber = (value: number) => Number(value) || 0;

const InfoModal = ({
  item,
  active,
  onvolumechange,
  onAudioEqChange,
  save,
  close,
  profiles,
  currentPlaybackItemId,
  isPlaybackActive,
  onAnalyzeSongBoundaries,
}: Props) => {
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [presentation, setPresentation] =
    useState<InfoModalPresentation>("expanded");
  const [activeView, setActiveView] = useState<InfoModalView>("info");
  const [isAnalyzing, setAnalyzing] = useState(false);
  const [analyzeMessage, setAnalyzeMessage] = useState("");
  const [latestGeminiSuggestion, setLatestGeminiSuggestion] =
    useState<GeminiBoundarySuggestion | undefined>(undefined);
  const analyzeScopeRef = useRef<GeminiAnalyzeScope>({
    active: false,
    itemId: undefined,
    requestToken: 0,
  });
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
    reset,
  } = useForm<InfoModels>({
    defaultValues: {
      hours: 0,
      minutes: 0,
      seconds: 0,
      endHours: 0,
      endMinutes: 0,
      endSeconds: 0,
      untilEnd: false,
      volume: 0,
      ...DEFAULT_AUDIO_EQ_SETTINGS,
    },
  });
  const itemId = item?.id;
  const showTransport = shouldShowInfoModalTransport({
    itemId,
    currentPlaybackItemId,
  });

  useEffect(() => {
    analyzeScopeRef.current = syncAnalyzeScope(
      analyzeScopeRef.current,
      active && !!item,
      itemId
    );

    if (!active) {
      return;
    }

    if (item) {
      const timestamp = Math.floor(item?.timestamp || 0);
      const hours = Math.floor(timestamp / 3600);
      const minutes = Math.floor(timestamp / 60) % 60;
      const seconds = timestamp % 60;
      const fallbackEndTimestamp =
        typeof item.endTimestamp === "number" && Number.isFinite(item.endTimestamp)
          ? item.endTimestamp
          : typeof item.maxDuration === "number" && Number.isFinite(item.maxDuration)
            ? item.maxDuration
            : 0;
      const endTimestamp = Math.floor(fallbackEndTimestamp);
      const endHours = Math.floor(endTimestamp / 3600);
      const endMinutes = Math.floor(endTimestamp / 60) % 60;
      const endSeconds = endTimestamp % 60;
      reset({
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        endHours: endHours,
        endMinutes: endMinutes,
        endSeconds: endSeconds,
        untilEnd: !item.endTimestamp,
        volume: item.volume,
        ...normalizeAudioEqSettings(item.audioEq),
      });
    } else {
      reset();
    }
    setSelectedProfileId("");
    setPresentation(
      getInfoModalPresentation({
        itemId,
        currentPlaybackItemId,
      })
    );
    setActiveView("info");
    setAnalyzing(false);
    setAnalyzeMessage("");
    setLatestGeminiSuggestion(undefined);
  }, [active, item?.id, reset]);

  useEffect(() => {
    if (active && !showTransport && presentation === "collapsed") {
      setPresentation("expanded");
    }
  }, [active, presentation, showTransport]);

  useEffect(() => {
    const normalizedSelectedProfileId = normalizeSelectedAudioEqProfileId(
      profiles,
      selectedProfileId
    );
    if (normalizedSelectedProfileId !== selectedProfileId) {
      setSelectedProfileId(normalizedSelectedProfileId);
    }
  }, [profiles, selectedProfileId]);

  const onProfileChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProfileId = event.currentTarget.value;
    setSelectedProfileId(nextProfileId);

    if (!nextProfileId) {
      return;
    }

    const selectedProfile = selectAudioEqProfileAudioEqById(
      profiles,
      nextProfileId
    );

    if (!selectedProfile) {
      return;
    }

    AUDIO_EQ_BANDS.forEach((band) => {
      setValue(band.key, selectedProfile[band.key], {
        shouldDirty: true,
        shouldTouch: true,
      });
    });

    onAudioEqChange(selectedProfile);
  };

  const onSongAudioEqChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedProfileId) {
      setSelectedProfileId(clearSelectedAudioEqProfileId(selectedProfileId));
    }

    onAudioEqChange({
      [event.currentTarget.id]: Number(event.currentTarget.value),
    });
  };

  const onAnalyze = async () => {
    if (!item || isAnalyzing) {
      return;
    }

    const startedRequest = beginAnalyzeRequest(analyzeScopeRef.current, item.id);
    const { request } = startedRequest;
    analyzeScopeRef.current = startedRequest.scope;
    setAnalyzing(true);
    setAnalyzeMessage("");

    try {
      const response = await onAnalyzeSongBoundaries(request.itemId);

      if (!shouldApplyAnalyzeResult(analyzeScopeRef.current, request)) {
        return;
      }

      if (!response.ok) {
        setAnalyzeMessage(
          response.code === GeminiAnalyzeErrorCode.MissingApiKey
            ? "Add a Gemini API key in settings first."
            : response.message
        );
        return;
      }

      const nextValues = applyGeminiSuggestionToFormValues(
        response.suggestion,
        getValues()
      );

      setValue("hours", nextValues.hours);
      setValue("minutes", nextValues.minutes);
      setValue("seconds", nextValues.seconds);
      setValue("endHours", nextValues.endHours);
      setValue("endMinutes", nextValues.endMinutes);
      setValue("endSeconds", nextValues.endSeconds);
      setValue("untilEnd", nextValues.untilEnd);
      setLatestGeminiSuggestion(response.suggestion);
      setAnalyzeMessage("Suggested timestamps loaded.");
    } catch {
      if (!shouldApplyAnalyzeResult(analyzeScopeRef.current, request)) {
        return;
      }

      setAnalyzeMessage("Couldn't analyze song boundaries. Try again.");
    } finally {
      if (shouldApplyAnalyzeResult(analyzeScopeRef.current, request)) {
        setAnalyzing(false);
      }
    }
  };

  const onSubmit = (data: InfoModels) => {
    const timestamp =
      toNumber(data.hours) * 3600 +
      toNumber(data.minutes) * 60 +
      toNumber(data.seconds);
    if (item?.maxDuration && timestamp > item.maxDuration) return;
    const temp_endtimestamp =
      toNumber(data.endHours) * 3600 +
      toNumber(data.endMinutes) * 60 +
      toNumber(data.endSeconds);
    const endtimestamp =
      data.untilEnd || temp_endtimestamp > (item?.maxDuration as number)
        ? undefined
        : temp_endtimestamp;
    if (!hasValidManualTimestampRange(timestamp, endtimestamp)) return;
    save(
      item?.id as string,
      timestamp,
      endtimestamp,
      data.volume,
      normalizeAudioEqSettings(data),
      latestGeminiSuggestion
    );
    close();
  };
  const expandToInfo = () => {
    setPresentation("expanded");
    setActiveView("info");
  };
  const onDismiss = () => {
    if (showTransport) {
      setPresentation("collapsed");
      return;
    }

    close();
  };
  const showEditorSection = presentation !== "collapsed";

  return (
    <Modal active={active} close={close}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {showEditorSection ? (
          <div className={styles["header-row"]}>
            <button
              className={styles["cross-button"]}
              onClick={onDismiss}
              type="button"
              aria-label={showTransport ? "Collapse player" : "Close editor"}
              title={showTransport ? "Collapse player" : "Close editor"}
            >
              {showTransport ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={styles["cross-button-icon"]}
                >
                  <path
                    d="m6 9 6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                "x"
              )}
            </button>
            <button className={styles["save-button"]} type="submit">
              Save
            </button>
          </div>
        ) : null}
        <div
          className={`${styles["content"]} ${
            presentation === "collapsed" ? styles["content-collapsed"] : ""
          }`}
        >
          {showEditorSection ? (
            <>
              <p className={`${styles["video-title"]} line-clamp-4`}>
                {item?.title}
              </p>
              <p className={styles["channel-name"]}>{item?.channelName}</p>
              <div className={styles["editor-section"]}>
                <div
                  className={styles["modal-tab-row"]}
                  role="tablist"
                  aria-label="Song editor sections"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === "info"}
                    className={`${styles["modal-tab-button"]} ${
                      activeView === "info"
                        ? styles["modal-tab-button-active"]
                        : ""
                    }`}
                    onClick={() => {
                      setActiveView("info");
                    }}
                  >
                    Info
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === "eq"}
                    className={`${styles["modal-tab-button"]} ${
                      activeView === "eq"
                        ? styles["modal-tab-button-active"]
                        : ""
                    }`}
                    onClick={() => {
                      setActiveView("eq");
                    }}
                  >
                    EQ
                  </button>
                </div>
                {activeView === "info" ? (
                  <>
                    <div className={styles["time-grid"]}>
                      <label className={styles["time-label"]}>Start Time</label>
                      <span className={styles["time"]}>
                        <input
                          className={styles["time-inputgroup"]}
                          type="text"
                          placeholder="HH"
                          maxLength={2}
                          size={2}
                          pattern="[0-9]{0,2}"
                          {...register("hours", {
                            required: true,
                            valueAsNumber: true,
                            validate: (value) => {
                              const maxDuration = item?.maxDuration;
                              if (
                                typeof maxDuration !== "number" ||
                                !Number.isFinite(maxDuration) ||
                                maxDuration <= 0
                              ) {
                                return true;
                              }

                              const timestamp =
                                toNumber(value) * 3600 +
                                toNumber(getValues("minutes")) * 60 +
                                toNumber(getValues("seconds"));

                              return timestamp <= maxDuration;
                            },
                          })}
                        />
                        <span className={styles["semicolon"]}>:</span>
                        <input
                          className={styles["time-inputgroup"]}
                          type="text"
                          placeholder="mm"
                          maxLength={2}
                          size={2}
                          pattern="[0-5]?[0-9]"
                          {...register("minutes", {
                            required: true,
                            valueAsNumber: true,
                          })}
                        />
                        <span className={styles["semicolon"]}>:</span>
                        <input
                          className={styles["time-inputgroup"]}
                          type="text"
                          placeholder="ss"
                          maxLength={2}
                          size={2}
                          pattern="[0-5]?[0-9]"
                          {...register("seconds", {
                            required: true,
                            valueAsNumber: true,
                          })}
                        />
                      </span>
                      <button
                        type="button"
                        className={styles["analyze-button"]}
                        disabled={isAnalyzing}
                        onClick={onAnalyze}
                      >
                        {isAnalyzing ? "Analyzing..." : "Analyze"}
                      </button>

                      <label className={styles["time-label"]}>End Time</label>
                      <span className={styles["time"]}>
                        <input
                          id="end-hour"
                          className={styles["time-inputgroup"]}
                          type="text"
                          placeholder="HH"
                          maxLength={2}
                          size={2}
                          {...register("endHours", {
                            required: !watch("untilEnd"),
                            valueAsNumber: true,
                          })}
                          {...(!watch("untilEnd")
                            ? { pattern: "[0-9]{0,2}" }
                            : { disabled: true })}
                        />
                        <span className={styles["semicolon"]}>:</span>
                        <input
                          id="end-minute"
                          className={styles["time-inputgroup"]}
                          type="text"
                          placeholder="mm"
                          maxLength={2}
                          size={2}
                          {...register("endMinutes", {
                            required: !watch("untilEnd"),
                            valueAsNumber: true,
                          })}
                          {...(!watch("untilEnd")
                            ? { pattern: "[0-5]?[0-9]" }
                            : { disabled: true })}
                        />
                        <span className={styles["semicolon"]}>:</span>
                        <input
                          id="end-second"
                          className={styles["time-inputgroup"]}
                          type="text"
                          placeholder="ss"
                          maxLength={2}
                          size={2}
                          {...register("endSeconds", {
                            required: !watch("untilEnd"),
                            valueAsNumber: true,
                          })}
                          {...(!watch("untilEnd")
                            ? { pattern: "[0-5]?[0-9]" }
                            : { disabled: true })}
                        />
                      </span>
                      <label
                        className={styles["checkbox-label"]}
                        htmlFor="untilEnd"
                      >
                        <input
                          type="checkbox"
                          id="untilEnd"
                          value="Y"
                          {...register("untilEnd")}
                          className={styles["checkbox"]}
                        />
                        <span>until End</span>
                      </label>
                    </div>
                    <div className={styles["analyze-row"]}>
                      <p className={styles["helper-text"]}>{analyzeMessage}</p>
                    </div>
                    <div className={styles["error"]}>
                      {(errors.hours || errors.minutes || errors.seconds) && (
                        <span role="alert">Incorrect start time</span>
                      )}
                    </div>
                    <div className={styles["error"]}>
                      {(errors.endHours ||
                        errors.endMinutes ||
                        errors.endSeconds) && (
                        <span role="alert">Incorrect end time</span>
                      )}
                    </div>
                    <div className={styles["volume-row"]}>
                      <label className={styles["volume-label"]}>Volume</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        id="cs-volume"
                        className={styles["volume-slider"]}
                        {...register("volume", {
                          required: true,
                          valueAsNumber: true,
                          onChange: onvolumechange,
                        })}
                      />
                      <span
                        id="cs-volume-text"
                        className={styles["volume-text"]}
                      >
                        {watch("volume")}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {profiles.length > 0 && (
                      <div className={styles["eq-profile-container"]}>
                        <label
                          className={styles["eq-profile-label"]}
                          htmlFor="song-eq-profile"
                        >
                          EQ Profile
                        </label>
                        <select
                          id="song-eq-profile"
                          className={styles["eq-profile-select"]}
                          value={selectedProfileId}
                          onChange={onProfileChange}
                        >
                          <option value="">Custom</option>
                          {profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className={styles["eq-section"]}>
                      <p className={styles["eq-title"]}>Song EQ</p>
                      {AUDIO_EQ_BANDS.map((band) => (
                        <div key={band.key} className={styles["eq-row"]}>
                          <label
                            className={styles["eq-band-label"]}
                            htmlFor={band.key}
                          >
                            {band.label}
                          </label>
                          <input
                            id={band.key}
                            className={styles["eq-slider"]}
                            type="range"
                            min="-10"
                            max="10"
                            step="1"
                            {...register(band.key, {
                              valueAsNumber: true,
                              onChange: onSongAudioEqChange,
                            })}
                          />
                          <span className={styles["eq-value"]}>
                            {watch(band.key)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {showTransport ? (
                <div className={styles["transport-section"]}>
                  <InfoModalTransport
                    item={item}
                    isPlaying={isPlaybackActive}
                    isExpanded={showEditorSection}
                    onExpand={expandToInfo}
                  />
                </div>
              ) : null}
            </>
          ) : showTransport ? (
            <div className={styles["transport-section"]}>
              <InfoModalTransport
                item={item}
                isPlaying={isPlaybackActive}
                isExpanded={showEditorSection}
                onExpand={expandToInfo}
              />
            </div>
          ) : (
            <>
              <p className={`${styles["video-title"]} line-clamp-4`}>
                {item?.title}
              </p>
              <p className={styles["channel-name"]}>{item?.channelName}</p>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default InfoModal;
