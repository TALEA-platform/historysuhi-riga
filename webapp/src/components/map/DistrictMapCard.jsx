import { forwardRef, useMemo } from "react";
import { Search } from "lucide-react";
import { useAppStore } from "../../store/appStore.js";
import { useI18n } from "../../i18n/useI18n.js";
import { DISTRICT_HEAT_COLORS, hotspotPercentLegendLabels } from "../../lib/districtColorScale.js";
import { DistrictMapLibre } from "./DistrictMapLibre.jsx";
import { Legend } from "./Legend.jsx";
import { MapFloatingControls } from "./MapFloatingControls.jsx";

// Wraps the DistrictMapLibre choropleth with the standard card chrome:
// title, the map itself, finder/legend helpers, an inspect hint and the
// floating controls. Used by View 5. Forwards a ref to the inner map so
// View 5 can call flyTo(featureId) when the user picks an area from finder/table.

export const DistrictMapCard = forwardRef(function DistrictMapCard({
  aggregation,
  entities,
  metricKey,
  selectedId,
  finderAnchorId,
  onSelect,
}, ref) {
  const { data, language } = useI18n();
  const basemap = useAppStore((state) => state.basemap);
  const districtOpacity = useAppStore((state) => state.districtOpacity);
  const districtInteractionMode = useAppStore((state) => state.districtInteractionMode);
  const setState = useAppStore((state) => state.setState);
  const copy = language !== "it"
    ? {
      districtPill: "apkaimes",
      dataYear: "2026 data",
      inspectHint: "Click an apkaime to update the card.",
      opacityLabel: "Transparency",
      findArea: "Find an apkaime",
    }
    : {
      districtPill: "apkaimes",
      dataYear: "dati 2026",
      inspectHint: "Clicca un'apkaime per aggiornare la scheda.",
      opacityLabel: "Trasparenza",
      findArea: "Trova un'apkaime",
    };
  const legendLayer = useMemo(() => {
    const values = entities
      .map((entity) => entity?.[metricKey])
      .filter(Number.isFinite);
    if (!values.length) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const mid = min + ((max - min) / 2);
    const formatter = new Intl.NumberFormat(language !== "it" ? "en-US" : "it-IT", {
      minimumFractionDigits: metricKey === "uhei" ? 2 : 1,
      maximumFractionDigits: metricKey === "uhei" ? 2 : 1,
    });
    const formatValue = (value) => `${formatter.format(value)}${data.districtMetrics[metricKey].unit}`;

    if (metricKey === "hotspotPercent") {
      const labels = hotspotPercentLegendLabels(language);
      return {
        legendTitle: data.districtMetrics[metricKey].label,
        legendType: "districtHeat",
        legendLayout: "stepped",
        legendStops: labels.map((label, index) => ({
          label,
          color: DISTRICT_HEAT_COLORS.default[index],
          accessibleColor: DISTRICT_HEAT_COLORS.accessible[index],
        })),
      };
    }

    return {
      legendTitle: data.districtMetrics[metricKey].label,
      legendType: "districtHeat",
      numericLegend: [formatValue(min), formatValue(mid), formatValue(max)],
      legend: [
        language !== "it" ? "lower values" : "valori più bassi",
        language !== "it" ? "middle" : "intermedi",
        language !== "it" ? "higher values" : "valori più alti",
      ],
    };
  }, [data.districtMetrics, entities, language, metricKey]);

  function focusFinder() {
    if (!finderAnchorId) return;
    const el = document.getElementById(finderAnchorId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const input = el.querySelector("input[type='search']");
    if (input) setTimeout(() => input.focus(), 250);
  }

  return (
    <section className="district-map-card">
      <div className="map-head">
        <div className="map-title-wrap">
          <span className="pill">{copy.districtPill}</span>
          <div>
            <strong>{data.districtMetrics[metricKey].label}</strong>
            <span>{data.districtMetrics[metricKey].description} · {copy.dataYear}</span>
          </div>
        </div>
      </div>
      <div className="district-map-shell">
        <DistrictMapLibre
          ref={ref}
          aggregation={aggregation}
          metricKey={metricKey}
          selectedId={selectedId}
          entities={entities}
          interactionMode={districtInteractionMode}
          onSelect={onSelect}
        />
        <div className="district-map-left-stack">
          {finderAnchorId && (
            <button
              type="button"
              className="map-search-button"
              onClick={focusFinder}
              aria-label={copy.findArea}
              title={copy.findArea}
            >
              <Search size={16} />
              <span>{copy.findArea}</span>
            </button>
          )}
          {legendLayer && <Legend layer={legendLayer} showNumericValues />}
          {districtInteractionMode === "inspect" && (
            <div className="district-inspect-hint">
              {copy.inspectHint}
            </div>
          )}
        </div>
        <MapFloatingControls
          basemap={basemap}
          setState={setState}
          interactionMode={districtInteractionMode}
          // The district map drives a separate slice of the store so navigate/inspect
          // does not collide with the raster map's mode.
          interactionStateKey="districtInteractionMode"
          showInteractionMode
          opacityValue={districtOpacity}
          opacityLabel={copy.opacityLabel}
          onOpacityChange={(value) => setState({ districtOpacity: value })}
          showValuesToggle={false}
        />
      </div>
    </section>
  );
});

