import { legendRanges } from "../data/legendRanges.js";

export const DISTRICT_HEAT_COLORS = {
  default: ["#fff5c0", "#feb24c", "#fd8d3c", "#e31a1c", "#b10026"],
  accessible: ["#f7fcf0", "#7bccc4", "#43a2ca", "#0868ac", "#00204d"],
};

// Upper bounds (in %) of classes 2-4 of the "surface with thermal anomaly" map. Class 1 is exactly 0%
// and class 5 is above the last break. Generated per city by scripts/build_legend_ranges.mjs from the
// published area values, so the five colours stay readable whatever the year's anomaly extent.
export const HOTSPOT_PERCENT_BREAKS = legendRanges.hotspotPercent.breaks;

function palette(colorblindMode) {
  return colorblindMode ? DISTRICT_HEAT_COLORS.accessible : DISTRICT_HEAT_COLORS.default;
}

export function districtHeatColor(value, min, max, colorblindMode = false) {
  const t = (value - min) / Math.max(0.0001, max - min);
  const index = t > 0.8 ? 4 : t > 0.6 ? 3 : t > 0.4 ? 2 : t > 0.2 ? 1 : 0;
  return palette(colorblindMode)[index];
}

export function hotspotPercentClass(value) {
  if (value <= 0) return 0;
  const index = HOTSPOT_PERCENT_BREAKS.findIndex((upper) => value <= upper);
  return index === -1 ? 4 : index + 1;
}

export function hotspotPercentColor(value, colorblindMode = false) {
  return palette(colorblindMode)[hotspotPercentClass(value)];
}

// Legend labels matching hotspotPercentClass; values are shown with one decimal like the area cards.
export function hotspotPercentLegendLabels(language) {
  const decimal = language === "en" ? "." : ",";
  const fmt = (value) => {
    const rounded = Math.round(value * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return text.replace(".", decimal);
  };
  const [b1, b2, b3] = HOTSPOT_PERCENT_BREAKS;
  return [
    "0%",
    `${fmt(0.1)}–${fmt(b1)}%`,
    `${fmt(b1 + 0.1)}–${fmt(b2)}%`,
    `${fmt(b2 + 0.1)}–${fmt(b3)}%`,
    `> ${fmt(b3)}%`,
  ];
}
