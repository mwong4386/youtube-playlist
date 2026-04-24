import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AudioEqSettings from "../../models/AudioEq";
import { AUDIO_EQ_BANDS, type AudioEqBandDefinition } from "../../utils/audioEq";
import {
  AudioEqSliderList,
  formatAudioEqValue,
} from "./AudioEqSliderList";
import { AudioEqVerticalBands } from "./AudioEqVerticalBands";

const expect = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const settings: AudioEqSettings = {
  clearBass: 0,
  band400: 1,
  band1k: -2,
  band2k5: 3,
  band6k3: 0,
  band16k: -4,
};

test("AudioEqSliderList renders one horizontal row per EQ band", () => {
  const markup = renderToStaticMarkup(
    React.createElement(AudioEqSliderList, {
      bands: AUDIO_EQ_BANDS,
      settings,
      title: "Song EQ",
      classes: {
        list: "eq-list",
        row: "eq-row",
        label: "eq-label",
        slider: "eq-slider",
        value: "eq-value",
      },
      renderSlider: (band: AudioEqBandDefinition) =>
        React.createElement("input", {
          id: `eq-${band.key}`,
          className: "eq-slider",
          type: "range",
          value: settings[band.key],
          readOnly: true,
        }),
    })
  );

  expect(markup.includes("Song EQ"), "expected the section title");
  expect(markup.includes("Clear Bass"), "expected the bass label");
  expect(markup.includes("16 kHz"), "expected the final band label");
  expect(markup.includes(">+3<"), "expected formatted positive values");
  expect(markup.includes(">-4<"), "expected formatted negative values");
  expect(
    markup.split('class="eq-row"').length - 1 === AUDIO_EQ_BANDS.length,
    "expected one rendered row per EQ band"
  );
});

test("AudioEqVerticalBands renders the popup-style vertical EQ layout", () => {
  const markup = renderToStaticMarkup(
    React.createElement(AudioEqVerticalBands, {
      settings,
      classes: {
        list: "eq-bands",
        band: "eq-band",
        value: "eq-value",
        track: "eq-track",
        slider: "eq-slider",
        label: "eq-label",
      },
      renderSlider: (band: AudioEqBandDefinition) =>
        React.createElement("input", {
          id: `eq-${band.key}`,
          className: "eq-slider",
          type: "range",
          value: settings[band.key],
          readOnly: true,
        }),
    })
  );

  expect(
    markup.includes('class="eq-value">+3</span><div class="eq-track"><input'),
    "expected vertical layout to place the value before the slider"
  );
  expect(markup.includes(">Bass<"), "expected short labels in the vertical layout");
  expect(markup.includes(">16k<"), "expected compact final label in the vertical layout");
});

test("formatAudioEqValue prefixes positive EQ values", () => {
  expect(formatAudioEqValue(0) === "0", "expected zero to stay unprefixed");
  expect(formatAudioEqValue(5) === "+5", "expected positive values to use a plus sign");
  expect(formatAudioEqValue(-2) === "-2", "expected negative values to keep the minus sign");
});
