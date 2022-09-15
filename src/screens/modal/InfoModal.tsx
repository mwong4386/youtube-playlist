import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import MPlaylistItem from "../../models/MPlaylistItem";
import Modal from "./Modal";
import styles from "./Modal.module.css";
interface props {
  active: boolean;
  close: () => void;
  save: (
    id: string,
    timestamp: number,
    endTimestamp: number | undefined
  ) => void;
  item: MPlaylistItem | undefined;
}
interface infoModels {
  hours: number;
  minutes: number;
  seconds: number;
  endHours: number;
  endMinutes: number;
  endSeconds: number;
  untilEnd: boolean;
}
const InfoModal = ({ item, active, save, close }: props) => {
  const {
    register,
    handleSubmit,
    watch,
    getValues,
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
    },
  });

  useEffect(() => {
    if (item) {
      const timestamp = Math.floor(item?.timestamp || 0);
      const hours = Math.floor(timestamp / 3600);
      const minutes = Math.floor(timestamp / 60) % 60;
      const seconds = timestamp % 60;
      const endTimestamp = item.endTimestamp
        ? item.endTimestamp
        : item.maxDuration;
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
      });
    } else {
      reset();
    }
  }, [item]);

  const onSubmit = (data: infoModels) => {
    const timestamp = data.hours * 3600 + data.minutes * 60 + data.seconds * 1;
    if (item?.maxDuration && timestamp > item?.maxDuration) return;
    const temp_endtimestamp =
      data.endHours * 3600 + data.endMinutes * 60 + data.endSeconds * 1;
    const endtimestamp =
      data.untilEnd || temp_endtimestamp > (item?.maxDuration as number)
        ? undefined
        : temp_endtimestamp;
    save(item?.id as string, timestamp, endtimestamp);
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
                  validate: (value) => {
                    return (
                      value * 3600 +
                        getValues("minutes") * 60 +
                        getValues("seconds") * 1 <
                      (item?.maxDuration || 0)
                    );
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
                {...register("minutes", { required: true })}
              />
              <span className={styles["semicolon"]}>:</span>
              <input
                className={styles["time-inputgroup"]}
                type="text"
                placeholder="ss"
                maxLength={2}
                size={2}
                pattern="[0-5]?[0-9]"
                {...register("seconds", { required: true })}
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
                {...register("endHours", { required: !watch("untilEnd") })}
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
                {...register("endMinutes", { required: !watch("untilEnd") })}
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
                {...register("endSeconds", { required: !watch("untilEnd") })}
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
        </div>
      </form>
    </Modal>
  );
};

export default InfoModal;
