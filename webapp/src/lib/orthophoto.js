import { RIGA_CITY_BOUNDS } from "./mapBounds.js";

const ORTHOPHOTO_SOURCES = Object.freeze({
  2013: {
    layer: "public:OF_LGIA2013",
    label: "LGIA orthophoto 2013",
  },
  2016: {
    layer: "public:OF_LGIA2016",
    label: "LGIA orthophoto 2016",
  },
  2020: {
    layer: "public:OF_LGIA2020",
    label: "LGIA orthophoto 2020",
  },
  2023: {
    layer: "public:OF_LGIA2023",
    label: "LGIA orthophoto 2023",
  },
  2024: {
    layer: "georiga:Summer_2024_Riga",
    label: "GeoRiga summer orthophoto 2024",
  },
});

export const AVAILABLE_ORTHOPHOTO_YEARS = Object.freeze(Object.keys(ORTHOPHOTO_SOURCES).map(Number));
export const EARLIEST_ORTHOPHOTO_YEAR = AVAILABLE_ORTHOPHOTO_YEARS[0];
export const LATEST_ORTHOPHOTO_YEAR = AVAILABLE_ORTHOPHOTO_YEARS[AVAILABLE_ORTHOPHOTO_YEARS.length - 1];
export const ORTHOPHOTO_AVAILABLE_YEARS_LABEL = "2013, 2016, 2020, 2023, 2024 (2021-2022 use 2023; 2025-2026 use 2024)";

const ORTHOPHOTO_BOUNDS = Object.freeze([
  RIGA_CITY_BOUNDS[0][0],
  RIGA_CITY_BOUNDS[0][1],
  RIGA_CITY_BOUNDS[1][0],
  RIGA_CITY_BOUNDS[1][1],
]);

function normalizeOrthophotoYear(year) {
  const numericYear = Number(year);
  return Number.isFinite(numericYear) ? Math.round(numericYear) : LATEST_ORTHOPHOTO_YEAR;
}

export function resolveOrthophotoYear(requestedYear = LATEST_ORTHOPHOTO_YEAR) {
  const year = normalizeOrthophotoYear(requestedYear);
  if (year <= EARLIEST_ORTHOPHOTO_YEAR) return EARLIEST_ORTHOPHOTO_YEAR;

  const exactYear = AVAILABLE_ORTHOPHOTO_YEARS.find((item) => item === year);
  if (exactYear) return exactYear;

  const nextAvailableYear = AVAILABLE_ORTHOPHOTO_YEARS.find((item) => item > year);
  return nextAvailableYear || LATEST_ORTHOPHOTO_YEAR;
}

export function getOrthophotoConfig(requestedYear = LATEST_ORTHOPHOTO_YEAR) {
  const year = resolveOrthophotoYear(requestedYear);
  const source = ORTHOPHOTO_SOURCES[year];
  return {
    year,
    tiles: [
      `https://aks-geoserver.riga.lv/geoserver/wms?service=WMS&version=1.1.1&request=GetMap&layers=${source.layer}&styles=&format=image/png8&transparent=false&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256`,
    ],
    attribution: `Riga / LGIA · ${source.label}`,
    bounds: ORTHOPHOTO_BOUNDS,
  };
}
