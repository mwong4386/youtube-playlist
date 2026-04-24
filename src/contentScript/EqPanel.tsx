import AudioEqSettings from "../models/AudioEq";
import AudioEqProfile from "../models/AudioEqProfile";
import { AUDIO_EQ_MAX, AUDIO_EQ_MIN } from "../utils/audioEq";
import { AudioEqVerticalBands } from "../screens/audioEq/AudioEqVerticalBands";
import {
  getEqPanelHintText,
  shouldShowEqProfileSelect,
} from "./eqPanelViewModel";

type EqPanelProps = {
  settings: AudioEqSettings;
  profiles: AudioEqProfile[];
  selectedProfileId: string;
  isCurrentPlaybackTab: boolean;
  onClose: () => void;
  onProfileChange: (profileId: string) => void;
  onSliderInput: (bandKey: keyof AudioEqSettings, value: number) => void;
  onSliderChange: (bandKey: keyof AudioEqSettings, value: number) => void;
};

const EqPanel = ({
  settings,
  profiles,
  selectedProfileId,
  isCurrentPlaybackTab,
  onClose,
  onProfileChange,
  onSliderInput,
  onSliderChange,
}: EqPanelProps) => {
  return (
    <>
      <div className="yt-playlist-panel__header yt-playlist-eq-panel__header">
        <div>
          <p className="yt-playlist-panel__title yt-playlist-eq-panel__title">Song EQ</p>
          <div className="yt-playlist-eq-panel__hint" data-eq-save-hint>
            {getEqPanelHintText(isCurrentPlaybackTab)}
          </div>
        </div>
        <button
          className="yt-playlist-panel__close yt-playlist-eq-panel__close"
          type="button"
          aria-label="Close EQ panel"
          onClick={onClose}
        >
          x
        </button>
      </div>
      <div
        className="yt-playlist-eq-panel__profile"
        data-eq-profile-container
        hidden={!shouldShowEqProfileSelect(profiles)}
      >
        <label className="yt-playlist-eq-panel__profile-label" htmlFor="yt-playlist-eq-profile">
          EQ Profile
        </label>
        <select
          id="yt-playlist-eq-profile"
          className="yt-playlist-eq-panel__profile-select"
          data-eq-profile-select
          value={selectedProfileId}
          onChange={(event) => onProfileChange(event.currentTarget.value)}
        >
          <option value="">Custom</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>
      <AudioEqVerticalBands
        settings={settings}
        classes={{
          list: "yt-playlist-eq-panel__bands",
          band: "yt-playlist-eq-panel__band",
          value: "yt-playlist-eq-panel__value",
          track: "yt-playlist-eq-panel__track",
          slider: "yt-playlist-eq-panel__slider",
          label: "yt-playlist-eq-panel__label",
        }}
        renderSlider={(band, sliderClassName) => (
          <input
            className={sliderClassName}
            data-eq-slider={band.key}
            type="range"
            min={AUDIO_EQ_MIN}
            max={AUDIO_EQ_MAX}
            step={1}
            value={settings[band.key]}
            onInput={(event) =>
              onSliderInput(band.key, Number((event.target as HTMLInputElement).value))
            }
            onChange={(event) => onSliderChange(band.key, Number(event.currentTarget.value))}
          />
        )}
      />
    </>
  );
};

export default EqPanel;
