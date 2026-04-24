import React from "react";
import AudioEqSettings from "../../models/AudioEq";
import { AudioEqBandDefinition } from "../../utils/audioEq";

type AudioEqSliderListClasses = {
  section?: string;
  title?: string;
  list: string;
  row: string;
  label: string;
  slider: string;
  value: string;
};

type AudioEqSliderListProps = {
  bands: readonly AudioEqBandDefinition[];
  settings: AudioEqSettings;
  title?: string;
  layout?: "horizontal" | "vertical";
  classes: AudioEqSliderListClasses;
  renderSlider: (band: AudioEqBandDefinition, sliderClassName: string) => React.ReactNode;
};

const formatAudioEqValue = (value: number) => {
  return value > 0 ? `+${value}` : `${value}`;
};

const AudioEqSliderList = ({
  bands,
  settings,
  title,
  layout = "horizontal",
  classes,
  renderSlider,
}: AudioEqSliderListProps) => {
  return (
    <div className={classes.section}>
      {title ? <p className={classes.title}>{title}</p> : null}
      <div className={classes.list}>
        {bands.map((band) => (
          <div key={band.key} className={classes.row}>
            {layout === "vertical" ? (
              <>
                <span className={classes.value}>{formatAudioEqValue(settings[band.key])}</span>
                {renderSlider(band, classes.slider)}
                <label className={classes.label} htmlFor={band.key}>
                  {band.shortLabel}
                </label>
              </>
            ) : (
              <>
                <label className={classes.label} htmlFor={band.key}>
                  {band.label}
                </label>
                {renderSlider(band, classes.slider)}
                <span className={classes.value}>{formatAudioEqValue(settings[band.key])}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { AudioEqSliderList, formatAudioEqValue };
export type { AudioEqSliderListClasses, AudioEqSliderListProps };
