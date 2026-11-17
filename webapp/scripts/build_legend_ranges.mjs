import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fromFile } from "geotiff";
import { buildCellBounds, buildCityBoundaryPolygons, cellIntersectsPolygon, parseCsv } from "../src/lib/csvInfo.js";

// Legend ranges for Views 1-5, computed from the served rasters, which the 2026 pipeline already clips to
// the city boundary (pixel centre inside the boundary; everything else is nodata). Every valid pixel is
// therefore a city pixel, and no extra polygon test is needed here.
//
// Visual clamping (same approach as the Bologna 2026 app): the colour ramps are stretched over a robust
// percentile range instead of the absolute min/max, so a handful of extreme pixels does not wash out the
// map. Values outside the range keep the colour of the nearest end of the legend.
//   LST (all years, pooled)  p0.5-p99.5, rounded outward to 1 °C (one scale for every year of View 1)
//   z-score spatial          fixed ±2.5 σ
//   anomaly 2026             symmetric ±max(|p0.5|, |p99.5|), rounded up to 0.5 °C, neutral 0
//   climatology 2013-2026    p0.5-p99.5, rounded outward to 1 °C
//   UHEI                     p0.5-p98
//   HVI / HRI                p0.5-p99.5, neutral 0
//   NDVI 10 m                p5-p98
//   albedo 10 m              p2-p98, gamma 1.15, class breaks at the terciles
//   day-night delta (1 km)   min-max of the displayed cells (pairs CSV cells touching the boundary,
//                            as on the View 4 map and scatter), rounded outward to 0.1 °C
//   area "surface with thermal anomaly" classes: quartiles of the non-zero area values (districts.js
//   and, when present, statisticalAreas.js), so the five colours stay readable whatever the year.
//
// Output: src/data/legendRanges.js, consumed by src/data/layers.js and src/lib/districtColorScale.js.
// Run after build_statistical_area_metrics.mjs (it reads the generated area modules).

const rasterDir = "data/webapp_rasters";
const lstDir = "data/gee_lst";
const outputPath = "src/data/legendRanges.js";
const YEAR = 2026;

// Per-fork constant — the LST filename prefix of this city.
const cityNameForLst = "Riga";

// ── Raster IO ────────────────────────────────────────────────────────────────

async function validValues(filePath) {
  const tiff = await fromFile(filePath);
  const image = await tiff.getImage();
  const [data] = await image.readRasters();
  const nodata = Number(image.getGDALNoData());
  const out = new Float64Array(data.length);
  let n = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = data[i];
    if (!Number.isFinite(v) || v === nodata || v < -9000) continue;
    out[n] = v;
    n += 1;
  }
  return out.subarray(0, n).sort();
}

function pct(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

const clean = (v) => Number(v.toFixed(6));
const floorTo = (v, step) => clean(Math.floor(v / step + 1e-9) * step);
const ceilTo = (v, step) => clean(Math.ceil(v / step - 1e-9) * step);
const fixed = (v, digits) => (Object.is(v, -0) ? 0 : v).toFixed(digits);
const signed = (v, digits) => `${v > 0 ? "+" : ""}${fixed(v, digits)}`;

// ── Per-layer builders ──────────────────────────────────────────────────────

async function buildLst() {
  const files = (await fs.readdir(lstDir))
    .filter((f) => f.startsWith(`${cityNameForLst}_LST_`) && f.endsWith("_summer_median_30m.tif"))
    .sort();
  const parts = await Promise.all(files.map((f) => validValues(path.join(lstDir, f))));
  const pooled = new Float64Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    pooled.set(part, offset);
    offset += part.length;
  }
  pooled.sort();
  const lo = floorTo(pct(pooled, 0.5), 1);
  const hi = ceilTo(pct(pooled, 99.5), 1);
  const ticks = Array.from({ length: 7 }, (_, i) => String(Math.round(lo + ((hi - lo) * i) / 6)));
  ticks[6] = `${ticks[6]} °C`;
  return { range: [lo, hi], numericLegend: ticks, years: files.length };
}

async function buildAnomaly() {
  const v = await validValues(`${rasterDir}/anomaly_${YEAR}_summer_30m.tif`);
  const extent = ceilTo(Math.max(Math.abs(pct(v, 0.5)), Math.abs(pct(v, 99.5))), 0.5);
  return { range: [-extent, extent], neutral: 0, numericLegend: [fixed(-extent, 1), "0", `+${fixed(extent, 1)} °C`] };
}

async function buildClimatology() {
  const v = await validValues(`${rasterDir}/climatology_mean_2013_${YEAR}_30m.tif`);
  const lo = floorTo(pct(v, 0.5), 1);
  const hi = ceilTo(pct(v, 99.5), 1);
  return { range: [lo, hi], numericLegend: [fixed(lo, 1), fixed((lo + hi) / 2, 1), `${fixed(hi, 1)} °C`] };
}

async function buildUhei() {
  const v = await validValues(`${rasterDir}/UHEI_${YEAR}_summer_30m.tif`);
  const lo = floorTo(pct(v, 0.5), 0.01);
  const hi = ceilTo(pct(v, 98), 0.01);
  return { range: [lo, hi], numericLegend: [fixed(lo, 2), fixed((lo + hi) / 2, 2), fixed(hi, 2)] };
}

async function buildDivergingIndex(name) {
  const v = await validValues(`${rasterDir}/${name}_${YEAR}_summer_30m.tif`);
  // Keep 0 strictly inside the range so the diverging ramp stays centred (white) on 0 even when the
  // city has (almost) no negative or no positive values.
  const lo = Math.min(floorTo(pct(v, 0.5), 0.01), -0.01);
  const hi = Math.max(ceilTo(pct(v, 99.5), 0.01), 0.01);
  return { range: [lo, hi], neutral: 0, numericLegend: [fixed(lo, 2), "0", signed(hi, 2)] };
}

async function buildNdvi() {
  const v = await validValues(`${rasterDir}/NDVI_${YEAR}_summer_10m.tif`);
  const lo = floorTo(pct(v, 5), 0.01);
  const hi = ceilTo(pct(v, 98), 0.01);
  return { range: [lo, hi], numericLegend: [fixed(lo, 2), fixed(pct(v, 50), 2), fixed(hi, 2)] };
}

async function buildAlbedo() {
  const v = await validValues(`${rasterDir}/Albedo_${YEAR}_summer_10m.tif`);
  const lo = floorTo(pct(v, 2), 0.01);
  const hi = ceilTo(pct(v, 98), 0.01);
  const breaks = [pct(v, 100 / 3), pct(v, 200 / 3)].map((b) => Math.round(b * 1000) / 1000);
  return {
    range: [lo, hi],
    gamma: 1.15,
    legendBreaks: breaks,
    numericLegend: [fixed(lo, 2), fixed(pct(v, 50), 2), fixed(hi, 2)],
  };
}

// Same cells as the View 4 map and scatter (Bologna rule): 1 km cells of the pairs CSV that touch the city
// boundary, tested with the frontend helpers from src/lib/csvInfo.js.
async function buildDelta() {
  const boundary = JSON.parse(await fs.readFile("data/webapp_vectors/riga_boundary_outline.geojson", "utf8"));
  const polygons = buildCityBoundaryPolygons(boundary);
  const rows = parseCsv(await fs.readFile(`data/csv_info/albedo_deltalst_${YEAR}_1km_pairs.csv`, "utf8"));
  const v = rows
    .filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y) && Number.isFinite(row.delta_lst_1km))
    .filter((row) => polygons.some((polygon) => cellIntersectsPolygon(buildCellBounds(row.x, row.y), polygon)))
    .map((row) => row.delta_lst_1km)
    .sort((a, b) => a - b);
  const lo = floorTo(v[0], 0.1);
  const hi = ceilTo(v[v.length - 1], 0.1);
  return { range: [lo, hi], numericLegend: [fixed(lo, 1), fixed((lo + hi) / 2, 1), `${fixed(hi, 1)} °C`], cells: v.length };
}

function niceBreak(value) {
  if (value < 1) return Math.max(0.1, clean(Math.round(value * 10) / 10));
  if (value < 10) return clean(Math.round(value * 2) / 2);
  return Math.round(value);
}

async function buildHotspotPercent() {
  const values = [];
  for (const [file, key] of [["src/data/districts.js", "districts"], ["src/data/statisticalAreas.js", "statisticalAreas"]]) {
    try {
      await fs.access(file);
    } catch {
      continue;
    }
    const mod = await import(`${pathToFileURL(path.resolve(file)).href}?t=${Date.now()}`);
    for (const item of mod[key] || []) {
      if (Number.isFinite(item.hotspotPercent) && item.hotspotPercent > 0) values.push(item.hotspotPercent);
    }
  }
  values.sort((a, b) => a - b);
  const max = values[values.length - 1];
  const valid = (b) => b[0] > 0 && b[0] < b[1] && b[1] < b[2] && b[2] < max;
  // Quartiles of the non-zero values; if they collapse (e.g. most areas close to 100%), equal intervals
  // between the smallest non-zero value and the maximum.
  let breaks = [25, 50, 75].map((q) => niceBreak(pct(values, q)));
  let rule = "quartiles";
  if (!valid(breaks)) {
    const lo = values[0];
    breaks = [1, 2, 3].map((k) => niceBreak(lo + ((max - lo) * k) / 4));
    rule = "equal intervals";
  }
  return { breaks, rule, areas: values.length };
}

// ── main ─────────────────────────────────────────────────────────────────────

const legendRanges = {
  lst: await buildLst(),
  zspat: { range: [-2.5, 2.5], neutral: 0, numericLegend: ["-2.5σ", "-1.25σ", "0", "+1.25σ", "+2.5σ"] },
  anomaly: await buildAnomaly(),
  climatology: await buildClimatology(),
  uhei: await buildUhei(),
  hvi: await buildDivergingIndex("HVI"),
  hri: await buildDivergingIndex("HRI"),
  ndvi: await buildNdvi(),
  albedo: await buildAlbedo(),
  delta: await buildDelta(),
  hotspotPercent: await buildHotspotPercent(),
};

const body = `// Auto-generated by scripts/build_legend_ranges.mjs — do not edit by hand.
// Robust (percentile) ranges from the boundary-clipped ${YEAR} rasters; see the script header for the rules.
// Re-run \`npm run build:legends\` after a data update (after \`npm run build:metrics\`).
export const legendRanges = ${JSON.stringify(legendRanges, null, 2)};
`;

await fs.writeFile(outputPath, body, "utf8");
console.log(`Wrote ${Object.keys(legendRanges).length} legend ranges to ${outputPath}`);
for (const [key, val] of Object.entries(legendRanges)) {
  console.log(`  ${key.padEnd(15)} ${JSON.stringify(val.range ?? val.breaks)}  ${JSON.stringify(val.numericLegend ?? "")}`
    + (val.legendBreaks ? `  breaks=${JSON.stringify(val.legendBreaks)}` : ""));
}
