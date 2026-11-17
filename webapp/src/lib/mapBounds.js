export const RIGA_CITY_BOUNDS = [
  [23.93364263, 56.85734619],
  [24.32450423, 57.08616884],
];

export function expandBounds(bounds, { xMultiplier = 1, yMultiplier = xMultiplier } = {}) {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const halfWidth = ((maxLng - minLng) * xMultiplier) / 2;
  const halfHeight = ((maxLat - minLat) * yMultiplier) / 2;

  return [
    [centerLng - halfWidth, centerLat - halfHeight],
    [centerLng + halfWidth, centerLat + halfHeight],
  ];
}

export const RIGA_MAX_PAN_BOUNDS = expandBounds(RIGA_CITY_BOUNDS, {
  xMultiplier: 4.5,
  yMultiplier: 3.75,
});
