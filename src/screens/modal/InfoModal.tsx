import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import AudioEqSettings from "../../models/AudioEq";
import AudioEqProfile from "../../models/AudioEqProfile";
import MPlaylistItem from "../../models/MPlaylistItem";
import {
  AUDIO_EQ_BANDS,
  DEFAULT_AUDIO_EQ_SETTINGS,
  normalizeAudioEqSettings,
} from "../../utils/audioEq";
import { selectAudioEqProfileAudioEqById } from "../../utils/audioEqProfiles";
import Modal from "./Modal";
import styles from "./Modal.module.css";

interface props {
  active: boolean;
  close: () => void;
  save: (
    id: string,
    timestamp: number,
    endTimestamp: number | undefined,
    volume: number,
    audioEq: AudioEqSettings
  ) => void;
  onvolumechange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioEqChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  item: MPlaylistItem | undefined;
  profiles: AudioEqProfile[];
}
type infoModels = AudioEqSettings & {
  hours: number;
  minutes: number;
  seconds: number;
  endHours: number;
  endMinutes: number;
  endSeconds: number;
  untilEnd: boolean;
  volume: number;
};

const toNumber = (value: number) => Number(value) || 0;

const InfoModal = ({
  item,
  active,
  onvolumechange,
  onAudioEqChange,
  save,
  close,
  profiles,
}: props) => {
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
    reset,
  } = useForm<infoModels>({
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

  useEffect(() => {
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
  }, [item, reset]);

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
  };

  const onSongAudioEqChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedProfileId) {
      setSelectedProfileId("");
    }

    onAudioEqChange(event);
  };

  const onSubmit = (data: infoModels) => {
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
    save(
      item?.id as string,
      timestamp,
      endtimestamp,
      data.volume,
      normalizeAudioEqSettings(data)
    );
    close();
  };
  return (
    <Modal active={active} close={close}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={styles["header-row"]}>
          <button
            className={styles["cross-button"]}
            onClick={close}
            type="button"
          >
            x
          </button>
          <button className={styles["save-button"]} type="submit">
            Save
          </button>
        </div>
        <div className={styles["content"]}>
          <p className={`${styles["video-title"]} line-clamp-4`}>
            {item?.title}
          </p>
          <p className={styles["channel-name"]}>{item?.channelName}</p>
          <div className={styles["time-container"]}>
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
          </div>
          <div className={styles["error"]}>
            {(errors.hours || errors.minutes || errors.seconds) && (
              <span role="alert">Incorrect start time</span>
            )}
          </div>
          <div className={styles["time-container"]}>
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
          </div>
          <div className={styles["time-container"]}>
            <input
              type="checkbox"
              id="untilEnd"
              value="Y"
              {...register("untilEnd")}
              className={styles["checkbox"]}
            />
            <label className={styles["time-label"]} htmlFor="cs-untilEnd">
              until End
            </label>
          </div>
          <div className={styles["error"]}>
            {(errors.endHours || errors.endMinutes || errors.endSeconds) && (
              <span role="alert">Incorrect end time</span>
            )}
          </div>
          <div className="cs-time-container">
            <label className={styles["volume-label"]}>Volume</label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              id="cs-volume"
              {...register("volume", {
                required: true,
                valueAsNumber: true,
                onChange: onvolumechange,
              })}
            />
            <span id="cs-volume-text" className={styles["volume-text"]}>
              {watch("volume")}
            </span>
          </div>
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
                <label className={styles["eq-band-label"]} htmlFor={band.key}>
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
                <span className={styles["eq-value"]}>{watch(band.key)}</span>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default InfoModal;
