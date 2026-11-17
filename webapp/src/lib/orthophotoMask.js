const ORTHOPHOTO_MASK_SOURCE_ID = "talea-ortho-mask";
export const ORTHOPHOTO_MASK_LAYER_ID = ORTHOPHOTO_MASK_SOURCE_ID;

const WORLD_MASK_RING = Object.freeze([
  [-180, -85.051129],
  [180, -85.051129],
  [180, 85.051129],
  [-180, 85.051129],
  [-180, -85.051129],
]);

function closeRing(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first?.[0] === last?.[0] && first?.[1] === last?.[1]) return ring;
  return [...ring, first];
}

function collectExteriorRings(geometry, rings) {
  if (!geometry) return;
  if (geometry.type === "Polygon") {
    const ring = closeRing(geometry.coordinates?.[0]);
    if (ring) rings.push(ring);
    return;
  }
  if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates || []) {
      const ring = closeRing(polygon?.[0]);
      if (ring) rings.push(ring);
    }
    return;
  }
  if (geometry.type === "GeometryCollection") {
    for (const child of geometry.geometries || []) collectExteriorRings(child, rings);
  }
}

export function buildOutsideMaskGeojson(boundaryGeojson) {
  const rings = [];
  if (boundaryGeojson?.type === "FeatureCollection") {
    for (const feature of boundaryGeojson.features || []) collectExteriorRings(feature.geometry, rings);
  } else if (boundaryGeojson?.type === "Feature") {
    collectExteriorRings(boundaryGeojson.geometry, rings);
  } else {
    collectExteriorRings(boundaryGeojson, rings);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [WORLD_MASK_RING, ...rings],
        },
      },
    ],
  };
}

export async function loadOutsideMaskGeojson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load boundary mask: ${response.status}`);
  return buildOutsideMaskGeojson(await response.json());
}

export function ensureOrthophotoMaskLayer(map, maskGeojson, beforeId) {
  if (!maskGeojson) return false;
  const source = map.getSource(ORTHOPHOTO_MASK_SOURCE_ID);
  if (!source) {
    map.addSource(ORTHOPHOTO_MASK_SOURCE_ID, {
      type: "geojson",
      data: maskGeojson,
    });
  } else if (source.setData) {
    source.setData(maskGeojson);
  }

  if (!map.getLayer(ORTHOPHOTO_MASK_LAYER_ID)) {
    const layer = {
      id: ORTHOPHOTO_MASK_LAYER_ID,
      type: "fill",
      source: ORTHOPHOTO_MASK_SOURCE_ID,
      layout: { visibility: "visible" },
      paint: {
        "fill-color": "#ffffff",
        "fill-opacity": 1,
        "fill-antialias": false,
      },
    };
    if (beforeId && map.getLayer(beforeId)) map.addLayer(layer, beforeId);
    else map.addLayer(layer);
  } else {
    map.setLayoutProperty(ORTHOPHOTO_MASK_LAYER_ID, "visibility", "visible");
    if (beforeId && map.getLayer(beforeId)) map.moveLayer(ORTHOPHOTO_MASK_LAYER_ID, beforeId);
  }
  return true;
}

export function setOrthophotoMaskVisibility(map, visible) {
  if (map?.getLayer(ORTHOPHOTO_MASK_LAYER_ID)) {
    map.setLayoutProperty(ORTHOPHOTO_MASK_LAYER_ID, "visibility", visible ? "visible" : "none");
  }
}