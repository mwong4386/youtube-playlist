import { useState } from "react";
import { useForm } from "react-hook-form";
import AudioEqSettings from "../../models/AudioEq";
import AudioEqProfile from "../../models/AudioEqProfile";
import type {
  GeminiSongEqResponse,
  GeminiSongEqUserRequest,
} from "../../models/GeminiActions";
import {
  type GeminiBoundarySuggestion,
  type GeminiAnalyzeFailure,
  type GeminiAnalyzeSuccess,
} from "../../models/GeminiSettings";
import MPlaylistItem from "../../models/MPlaylistItem";
import {
  DEFAULT_AUDIO_EQ_SETTINGS,
  normalizeAudioEqSettings,
} from "../../utils/audioEq";
import Modal from "./Modal";
import ModalChromeHeader from "./ModalChromeHeader";
import InfoModalTransport, { MarqueeText } from "./InfoModalTransport";
import styles from "./Modal.module.css";
import SongEditor, { type InfoModels } from "./SongEditor";
import { hasValidManualTimestampRange } from "./manualTimestampValidation";
import { shouldShowInfoModalTransport } from "./infoModalPlaybackState";

interface Props {
  active: boolean;
  close: () => void;
  save: (
    id: string,
    timestamp: number,
    endTimestamp: number | undefined,
    volume: number,
    audioEq: AudioEqSettings,
    geminiSuggestion?: GeminiBoundarySuggestion,
  ) => void;
  onvolumechange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioEqChange: (audioEq: Partial<AudioEqSettings>) => void;
  item: MPlaylistItem | undefined;
  profiles: AudioEqProfile[];
  currentPlaybackItemId?: string | null;
  isPlaybackActive: boolean;
  onAnalyzeSongBoundaries: (
    itemId: string,
  ) => Promise<GeminiAnalyzeSuccess | GeminiAnalyzeFailure>;
  onAdjustSongEqWithGemini: (
    request: GeminiSongEqUserRequest,
  ) => Promise<GeminiSongEqResponse>;
  geminiApiKey: string | undefined;
}

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
  onAdjustSongEqWithGemini,
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
  const itemId = item?.id;
  const showTransport = shouldShowInfoModalTransport({
    itemId,
    currentPlaybackItemId,
  });

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
    close();
  };

  const onDismiss = () => {
    close();
  };

  return (
    <Modal active={active} close={close}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles["chrome-panel"]}>
        <ModalChromeHeader
          title={item?.title || "Song"}
          titleContent={
            <div
              className={`${styles["song-heading"]} ${styles["chrome-song-heading"]}`}
            >
              <MarqueeText text={item?.title || ""} className={styles["video-title"]} />
            </div>
          }
          closeLabel="Close editor"
          onClose={onDismiss}
          action={
            <button className={styles["save-button"]} type="submit">
              Save
            </button>
          }
        />
        <div className={styles["content"]}>
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
            active={active}
            geminiApiKey={geminiApiKey}
          />
          {showTransport ? (
            <div className={styles["transport-section"]}>
              <InfoModalTransport
                item={item as MPlaylistItem}
                isPlaying={isPlaybackActive}
                isExpanded={true}
                onExpand={() => {}}
              />
            </div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
};

export default InfoModal;
