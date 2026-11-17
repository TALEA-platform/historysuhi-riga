import fs from "node:fs/promises";
import { fromFile } from "geotiff";
import proj4 from "proj4";

const sourceGeojson = "data/webapp_vectors/districts_enriched_2026.geojson";
const outputPath = "src/data/districts.js";

const rasters = {
  uhei: "data/webapp_rasters/UHEI_2026_summer_30m.tif",
  lst: "data/webapp_rasters/LST_2026_summer_30m.tif",
  anomaly: "data/webapp_rasters/anomaly_2026_summer_30m.tif",
  hotspot: "data/webapp_rasters/hotspot_temporal_2026_summer_30m.tif",
  persistence: "data/webapp_rasters/hotspot_temporal_persistence_2013_2026.tif",
};

const wgs84 = "EPSG:4326";
// Riga (~24°E) sits in UTM zone 35N.
const utm = "+proj=utm +zone=35 +datum=WGS84 +units=m +no_defs";

function round(value, digits = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ringContains(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonContains(point, polygon) {
  if (!ringContains(point, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i += 1) {
    if (ringContains(point, polygon[i])) return false;
  }
  return true;
}

function geometryContains(point, polygons) {
  return polygons.some((polygon) => polygonContains(point, polygon));
}

function projectGeometry(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) =>
    polygon.map((ring) => ring.map(([lon, lat]) => proj4(wgs84, utm, [lon, lat]))),
  );
}

function geometryBounds(polygons) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        bounds[0] = Math.min(bounds[0], x);
        bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x);
        bounds[3] = Math.max(bounds[3], y);
      }
    }
  }
  return bounds;
}

async function loadRaster(path) {
  const tiff = await fromFile(path);
  const image = await tiff.getImage();
  const [data] = await image.readRasters();
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();
  return {
    data,
    width: image.getWidth(),
    height: image.getHeight(),
    originX,
    originY,
    resX,
    resY,
    nodata: Number(image.getGDALNoData()),
  };
}

function validValue(value, nodata) {
  return Number.isFinite(value) && value !== nodata && value > -9000;
}

function pixelWindow(bounds, raster) {
  const [minX, minY, maxX, maxY] = bounds;
  const absY = Math.abs(raster.resY);
  return {
    colMin: Math.max(0, Math.floor((minX - raster.originX) / raster.resX) - 1),
    colMax: Math.min(raster.width - 1, Math.ceil((maxX - raster.originX) / raster.resX) + 1),
    rowMin: Math.max(0, Math.floor((raster.originY - maxY) / absY) - 1),
    rowMax: Math.min(raster.height - 1, Math.ceil((raster.originY - minY) / absY) + 1),
  };
}

function computeFeatureStats(feature, loaded) {
  const polygons = projectGeometry(feature.geometry);
  const bounds = geometryBounds(polygons);
  const reference = loaded.uhei;
  const window = pixelWindow(bounds, reference);
  const stats = Object.fromEntries(Object.keys(loaded).map((key) => [key, { sum: 0, count: 0, hit: 0 }]));

  for (let row = window.rowMin; row <= window.rowMax; row += 1) {
    const y = reference.originY + (row + 0.5) * reference.resY;
    for (let col = window.colMin; col <= window.colMax; col += 1) {
      const x = reference.originX + (col + 0.5) * reference.resX;
      if (!geometryContains([x, y], polygons)) continue;
      const index = row * reference.width + col;
      for (const [key, raster] of Object.entries(loaded)) {
        const value = raster.data[index];
        if (!validValue(value, raster.nodata)) continue;
        stats[key].sum += value;
        stats[key].count += 1;
        if (key === "hotspot" && value > 0.5) stats[key].hit += 1;
      }
    }
  }

  return {
    uhei: stats.uhei.count ? round(stats.uhei.sum / stats.uhei.count, 2) : null,
    lst: stats.lst.count ? round(stats.lst.sum / stats.lst.count, 1) : null,
    anomaly: stats.anomaly.count ? round(stats.anomaly.sum / stats.anomaly.count, 2) : null,
    hotspotPercent: stats.hotspot.count ? round((stats.hotspot.hit / stats.hotspot.count) * 100, 1) : null,
    persistenceMean: stats.persistence.count ? round(stats.persistence.sum / stats.persistence.count, 1) : null,
  };
}

const geojson = JSON.parse(await fs.readFile(sourceGeojson, "utf8"));
const loaded = Object.fromEntries(
  await Promise.all(Object.entries(rasters).map(async ([key, path]) => [key, await loadRaster(path)])),
);

const districts = geojson.features
  .map((feature) => {
    const properties = feature.properties || {};
    const name = properties.apkaime || properties.area_statistica || properties.quartiere;
    if (!name) return null;
    const stats = computeFeatureStats(feature, loaded);
    return {
      id: `apk-${slug(name)}`,
      name,
      ...stats,
    };
  })
  .filter(Boolean)
  .sort((a, b) => (b.uhei ?? -Infinity) - (a.uhei ?? -Infinity));

await fs.writeFile(
  outputPath,
  `export const districts = ${JSON.stringify(districts, null, 2)};\n`,
  "utf8",
);
console.log(`Wrote ${districts.length} apkaimes to ${outputPath}`);
