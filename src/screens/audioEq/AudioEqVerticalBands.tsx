import React from "react";
import AudioEqSettings from "../../models/AudioEq";
import { AUDIO_EQ_BANDS, type AudioEqBandDefinition } from "../../utils/audioEq";
import { formatAudioEqValue } from "./AudioEqSliderList";

type AudioEqVerticalBandsClasses = {
  list: string;
  band: string;
  value: string;
  track: string;
  slider: string;
  label: string;
};

type AudioEqVerticalBandsProps = {
  settings: AudioEqSettings;
  classes: AudioEqVerticalBandsClasses;
  renderSlider: (band: AudioEqBandDefinition, sliderClassName: string) => React.ReactNode;
};

const AudioEqVerticalBands = ({
  settings,
  classes,
  renderSlider,
}: AudioEqVerticalBandsProps) => {
  return (
    <div className={classes.list}>
      {AUDIO_EQ_BANDS.map((band) => (
        <div key={band.key} className={classes.band}>
          <span className={classes.value}>{formatAudioEqValue(settings[band.key])}</span>
          <div className={classes.track}>{renderSlider(band, classes.slider)}</div>
          <span className={classes.label}>{band.shortLabel}</span>
        </div>
      ))}
    </div>
  );
};

export { AudioEqVerticalBands };
export type { AudioEqVerticalBandsClasses, AudioEqVerticalBandsProps };
