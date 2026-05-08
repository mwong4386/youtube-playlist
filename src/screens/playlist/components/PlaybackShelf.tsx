import { useState } from "react";
import { useForm } from "react-hook-form";
import AudioEqSettings from "../../../models/AudioEq";
import AudioEqProfile from "../../../models/AudioEqProfile";
import {
  type GeminiSongEqResponse,
  type GeminiSongEqUserRequest,
} from "../../../models/GeminiActions";
import {
  type GeminiBoundarySuggestion,
  type GeminiAnalyzeFailure,
  type GeminiAnalyzeSuccess,
} from "../../../models/GeminiSettings";
import MPlaylistItem from "../../../models/MPlaylistItem";
import {
  DEFAULT_AUDIO_EQ_SETTINGS,
  normalizeAudioEqSettings,
} from "../../../utils/audioEq";
import { CloseIcon } from "../../icons";
import SongEditor, { type InfoModels } from "../../modal/SongEditor";
import InfoModalTransport from "../../modal/InfoModalTransport";
import modalStyles from "../../modal/Modal.module.css";
import { hasValidManualTimestampRange } from "../../modal/manualTimestampValidation";
import styles from "./PlaybackShelf.module.css";

interface Props {
  item: MPlaylistItem;
  isPlaying: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  // Editor related props
  profiles: AudioEqProfile[];
  onvolumechange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioEqChange: (audioEq: Partial<AudioEqSettings>) => void;
  onAnalyzeSongBoundaries: (
    itemId: string,
  ) => Promise<GeminiAnalyzeSuccess | GeminiAnalyzeFailure>;
  onAdjustSongEqWithGemini: (
    request: GeminiSongEqUserRequest,
  ) => Promise<GeminiSongEqResponse>;
  save: (
    id: string,
    timestamp: number,
    endTimestamp: number | undefined,
    volume: number,
    audioEq: AudioEqSettings,
    geminiSuggestion?: GeminiBoundarySuggestion,
  ) => void;
  geminiApiKey: string | undefined;
}

const toNumber = (value: number) => Number(value) || 0;

const PlaybackShelf = ({
  item,
  isPlaying,
  isExpanded,
  onToggleExpand,
  profiles,
  onvolumechange,
  onAudioEqChange,
  onAnalyzeSongBoundaries,
  onAdjustSongEqWithGemini,
  save,
  geminiApiKey,
}: Props) => {
  const [latestGeminiSuggestion, setLatestGeminiSuggestion] = useState<
    GeminiBoundarySuggestion | undefined
  >(undefined);

  const formMethods = useForm<InfoModels>({
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

  const { handleSubmit } = formMethods;

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
      latestGeminiSuggestion,
    );
    onToggleExpand();
  };

  return (
    <div
      className={`${styles["shelf-container"]} ${
        isExpanded ? styles["shelf-container-expanded"] : ""
      }`}
    >
      {isExpanded && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={styles["editor-form"]}
        >
          <div className={styles["header-row"]}>
            <button
              className={modalStyles["chrome-close-button"]}
              onClick={onToggleExpand}
              type="button"
              aria-label="Close editor"
              title="Close editor"
            >
              <CloseIcon />
            </button>
            <button className={styles["save-button"]} type="submit">
              Save
            </button>
          </div>
          <div className={styles["editor-content"]}>
            <SongEditor
              item={item}
              profiles={profiles}
              onvolumechange={onvolumechange}
              onAudioEqChange={onAudioEqChange}
              onAnalyzeSongBoundaries={onAnalyzeSongBoundaries}
              onAdjustSongEqWithGemini={onAdjustSongEqWithGemini}
              formMethods={formMethods}
              latestGeminiSuggestion={latestGeminiSuggestion}
              setLatestGeminiSuggestion={setLatestGeminiSuggestion}
              active={isExpanded}
              geminiApiKey={geminiApiKey}
            />
          </div>
        </form>
      )}
      <InfoModalTransport
        item={item}
        isPlaying={isPlaying}
        isExpanded={isExpanded}
        onExpand={onToggleExpand}
      />
    </div>
  );
};

export default PlaybackShelf;
