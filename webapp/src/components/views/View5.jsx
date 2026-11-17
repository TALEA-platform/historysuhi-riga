import { useCallback, useMemo, useRef } from "react";
import { Layers } from "lucide-react";
import { useAppStore } from "../../store/appStore.js";
import { districts } from "../../data/districts.js";
import { useI18n } from "../../i18n/useI18n.js";
import { ViewIntro } from "../layout/ViewIntro.jsx";
import { ContextBanner } from "../layout/ContextBanner.jsx";
import { PanelCard } from "../ui/PanelCard.jsx";
import { LayerOption } from "../ui/LayerOption.jsx";
import { RichText } from "../ui/RichText.jsx";
import { DistrictMapCard } from "../map/DistrictMapCard.jsx";
import { DistrictTable } from "../panels/DistrictTable.jsx";
import { DistrictDetail, MetricInfo } from "../panels/DistrictDetail.jsx";
import { AreaFinder } from "../panels/AreaFinder.jsx";

const FINDER_ANCHOR_ID = "view5-area-finder";

// View 5 — district / statistical-area aggregation.
// The aggregation toggle swaps the dataset under the same metric chooser; the selected entity
// id is reset to the first item so we never end up showing a card for an entity that is no
// longer in the dataset.

export function View5() {
  const { data, language } = useI18n();
  const view5Metric = useAppStore((state) => state.view5Metric);
  const selectedDistrictId = useAppStore((state) => state.selectedDistrictId);
  const setState = useAppStore((state) => state.setState);

  const metric = data.districtMetrics[view5Metric];
  // Riga has a single neighbourhood layer (apkaimes); we don't expose an aggregation toggle.
  const view5Aggregation = "district";
  const entities = districts;
  const mapRef = useRef(null);
  const handleZoomToFeature = useCallback((featureId) => {
    mapRef.current?.flyTo?.(featureId);
  }, []);

  // Sort descending by the active metric, treating missing values as -Infinity so they sink.
  // useMemo prevents resorting on unrelated re-renders (sorting ~90 items is cheap but the
  // child table relies on identity for selection effects).
  const sorted = useMemo(
    () => [...entities].sort((a, b) => (b[view5Metric] ?? -Infinity) - (a[view5Metric] ?? -Infinity)),
    [entities, view5Metric],
  );
  const selected = entities.find((entity) => entity.id === selectedDistrictId) || null;
  const rank = selected ? sorted.findIndex((entity) => entity.id === selected.id) + 1 : 0;
  const copy = language !== "it"
    ? {
      metricDetail: selected ? `${selected.name} · 2026` : "Pick an apkaime to read its 2026 value",
      missingValue: "n/a",
      bannerLabel: "2026 data",
      bannerValue: `${entities.length} apkaimes`,
      bannerText:
        "This view aggregates **2026** summer data by **apkaime** using Riga's official neighbourhood boundary dataset. The source notes that apkaime boundaries are neighbourhood boundaries, not administrative boundaries.",
      panelTitle: "2026 reading",
      apkaimeHelp: "Each apkaime is a Riga neighbourhood boundary unit; pick one to compare its 2026 values against the others.",
      inspectHelp:
        "To choose an apkaime from the map, enable **Inspect** in the controls below the map and then click the neighbourhood.",
    }
    : {
      metricDetail: selected ? `${selected.name} · 2026` : "Scegli un'apkaime per leggere il valore 2026",
      missingValue: "n.d.",
      bannerLabel: "Dati 2026",
      bannerValue: `${entities.length} apkaimes`,
      bannerText:
        "Questa sezione aggrega i dati estivi **2026** per **apkaime**, usando il dataset ufficiale delle unità di quartiere di Riga. La fonte precisa che i confini delle apkaimes non hanno status amministrativo.",
      panelTitle: "Lettura 2026",
      apkaimeHelp: "Ogni apkaime è un'unità di quartiere ufficiale di Riga: selezionane una per confrontarne i valori 2026 con le altre.",
      inspectHelp:
        "Per scegliere un'apkaime dalla mappa, attiva **Ispeziona** nei controlli sotto la mappa e poi clicca il quartiere.",
    };

  return (
    <>
      <ViewIntro
        id="v5"
        metric={{
          label: metric.label,
          value: `${selected?.[view5Metric] ?? copy.missingValue}${metric.unit}`,
          detail: copy.metricDetail,
        }}
      />
      <ContextBanner
        label={copy.bannerLabel}
        value={copy.bannerValue}
        text={copy.bannerText}
      />
      <div className="main-grid">
        <div className="map-stack">
          <DistrictMapCard
            ref={mapRef}
            aggregation={view5Aggregation}
            entities={entities}
            metricKey={view5Metric}
            selectedId={selected?.id}
            infoTargetId="view5-info"
            finderAnchorId={FINDER_ANCHOR_ID}
            onSelect={(id) => {
              setState({ selectedDistrictId: id });
            }}
          />
          <AreaFinder id={FINDER_ANCHOR_ID} onZoomToFeature={handleZoomToFeature} />
          <DistrictTable
            sorted={sorted}
            metricKey={view5Metric}
            selectedId={selected?.id}
            aggregation={view5Aggregation}
            onSelect={(id) => {
              setState({ selectedDistrictId: id });
              handleZoomToFeature(id);
            }}
          />
        </div>
        <aside className="side-panel">
          <PanelCard id="view5-info" className="info-target" title={copy.panelTitle} icon={<Layers size={16} />}>
            <p className="panel-help">{copy.apkaimeHelp}</p>
            <RichText as="p" className="panel-help" text={copy.inspectHelp} />
            {Object.entries(data.districtMetrics).map(([key, item]) => (
              <LayerOption
                key={key}
                selected={view5Metric === key}
                title={item.label}
                body={item.description}
                onClick={() => setState({ view5Metric: key })}
              />
            ))}
            <MetricInfo metric={metric} />
          </PanelCard>
          {selected && (
            <DistrictDetail
              district={selected}
              rank={rank}
              metricKey={view5Metric}
              aggregation={view5Aggregation}
            />
          )}
        </aside>
      </div>
    </>
  );
}

