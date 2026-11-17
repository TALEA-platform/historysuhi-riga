# Historical Surface Urban Heat Island

**Historical Surface Urban Heat Island** (`historysuhi`) is a Talea Project web platform for reading Riga's surface urban heat patterns from Google Earth Engine outputs.

Live app: <https://talea.comune.bologna.it/historysuhi-riga/>

[Versione italiana](#historical-surface-urban-heat-island-versione-italiana)

## Contents

- [Overview](#overview)
- [Data And Methods](#data-and-methods)
- [Core Indicators](#core-indicators)
- [Application Views](#application-views)
- [Data Inventory](#data-inventory)
- [Limitations](#limitations)
- [Repository And Deployment](#repository-and-deployment)
- [License](#license)

## Overview

The application turns a 2013-2026 Landsat 8/9 archive and a 2026 MODIS day-night product into citizen-readable maps, summaries, and area comparisons. It focuses on **land surface temperature**: the temperature of roofs, roads, vegetation, paved areas, and other surfaces observed from above.

The main purpose is to move beyond a single thermal snapshot. The platform shows where Riga is hot in absolute terms, where heat is persistent across years, where 2026 diverges from local historical behavior, and which physical drivers help explain the pattern.

The public interface is organized as a five-step narrative. Each step combines a map with focused controls, inspection tools, and supporting summaries so the same dataset can be read at pixel and apkaime scale.

## Data And Methods

All analytical data are extracted or computed from Google Earth Engine, then exported into [`webapp/data`](webapp/data) for static delivery by the React/Vite frontend. The webapp does not recompute the full geospatial pipeline; it renders exported rasters and vectors, with only lightweight display transforms where needed.

The Landsat-derived thermal layers use 30 m summer composites for 2013-2026. These support annual LST maps, climatology, anomaly, z-score, hotspot, persistence, and the temperature component of the synthetic indices. The standalone 2026 NDVI and albedo layers are derived from Sentinel-2 at 10 m; UHEI, HVI, and HRI remain at 30 m because they include Landsat temperature, with NDVI and albedo area-averaged from 10 m onto the thermal grid. In the previous (2025) release albedo came from Landsat at 30 m, so albedo, HRI, and UHEI values are not directly comparable with that release. The MODIS-derived layer uses a 1 km 2026 day-night product to describe the surface thermal range between daytime and nighttime observations.

The following sections describe how those outputs are used in the five application views. Formulas are placed near the view where they become part of the user interpretation.

## Core Indicators

| Indicator | What it describes | Resolution / scope | Main source |
| --- | --- | --- | --- |
| LST | Median summer land surface temperature | Landsat 30 m, 2013-2026 | `gee_lst/Riga_LST_{year}_summer_median_30m.tif` |
| Spatial z-score | Within-year deviation from Riga's urban mean | Landsat 30 m, each year | Computed from yearly LST rasters |
| Climatology | Mean summer LST across 2013-2026 | Landsat 30 m | `webapp_rasters/climatology_mean_2013_2026_30m.tif` |
| 2026 anomaly | 2026 LST compared with each pixel's own baseline | Landsat 30 m | `webapp_rasters/anomaly_2026_summer_30m.tif` |
| Temporal persistence | Count of summers where a pixel is anomalous against its own history | Landsat 30 m, observed count 0-5 | `webapp_rasters/hotspot_temporal_persistence_2013_2026.tif` |
| Structural persistence | Count of summers where a pixel is in the citywide top 5% LST | Landsat 30 m, count 0-14 | `webapp_rasters/hotspot_structural_persistence_2013_2026.tif` |
| UHEI / HVI / HRI | Synthetic indices linking heat, vegetation, and albedo | Landsat 30 m, 2026 | `webapp_rasters/UHEI_2026_summer_30m.tif`, `HVI`, `HRI` |
| NDVI | Vegetation presence and density | Sentinel-2 10 m, 2026 | `webapp_rasters/NDVI_2026_summer_10m.tif` |
| Albedo | Fraction of sunlight reflected by the surface | Sentinel-2 10 m, 2026 | `webapp_rasters/Albedo_2026_summer_10m.tif` |
| Day-night delta | Surface temperature range between day and night | MODIS 1 km, 2026 | `csv_info/albedo_deltalst_2026_1km_pairs.csv` (map) |
| Zonal metrics | Mean values by neighbourhood | 58 apkaimes | `webapp_vectors/districts_enriched_2026.geojson`, `src/data/districts.js` |

## Application Views

The frontend is structured as five connected views. Each view starts from a citizen-facing question, then exposes the relevant raster or vector products with the minimum controls needed to read that question correctly.

| View | Question answered | Main content |
| --- | --- | --- |
| 1. Dove fa caldo | Where is the surface hottest in the selected year? | Annual LST, spatial z-score, year slider, compare modal, temporal-hotspot overlay. |
| 2. Cosa è normale, cosa è cambiato | What is habitual, persistent, or anomalous in the 2013-2026 record? | Climatology, 2026 anomaly, temporal/structural persistence, chronic/anomalous categories. |
| 3. Perché fa caldo qui | Which physical conditions help explain heat concentration? | UHEI, HVI, HRI, NDVI, and Albedo on the 2026 baseline. |
| 4. Giorno e notte | Where does the surface cool more or less between day and night? | MODIS day-night delta map and scatter relationships with albedo or NDVI. |
| 5. Zoom sui quartieri | How do Riga's apkaimes compare? | Apkaime aggregation, sortable table, search, map inspection, detail card. |

### View 1: Dove fa caldo

This view reads the annual surface temperature archive. Its logic is: first show the absolute temperature of the selected summer, then offer a standardized view of internal urban differences, then optionally highlight places that were anomalous against their own history.

**Annual LST layer**

- **What it calculates:** the selected year's summer median land surface temperature at each pixel.
- **Formula:**  
  $$L(x,y,t)$$
- **How to read it:** high values identify surfaces that were hottest in absolute terms in year `t`. The compare modal keeps the same LST scale across two years so the visual comparison remains consistent.

**Spatial z-score layer**

- **What it calculates:** how far each pixel is above or below Riga's average in the same year.
- **Formula:**  
  $$z_s(x,y,t) = \frac{L(x,y,t) - \mu_C(t)}{\sigma_C(t)}$$
- **How to read it:** this is not a temperature in degrees. `0` means close to the citywide mean for that year, positive values are warmer than the city average, and negative values are cooler. It is useful for reading internal asymmetries within a year, not absolute change between years.

**Temporal anomaly overlay**

- **What it calculates:** whether a pixel is unusually hot compared with its own 2013-2026 behavior.
- **Formula:**  
  $$z_t(x,y,t) = \frac{L(x,y,t) - \mu_P(x,y)}{\sigma_P(x,y)}$$
  $$H_t(x,y,t) = \mathbb{1}\left[z_t(x,y,t) \geq 1.0\right]$$
- **How to read it:** the overlay does not simply mark the hottest surfaces. It marks places where the selected year is high relative to that same pixel's normal behavior.

Main data: `gee_lst/Riga_LST_{year}_summer_median_30m.tif`, `hotspots/hotspot_temporal_{year}_zgt1p0.tif`, `csv_info/LST_yearly_input_summary_median_30m.csv`.

### View 2: Cosa è normale, cosa è cambiato

This view shifts from single-year reading to the full 2013-2026 history. The sequence is baseline first, 2026 departure second, recurrence third, and combined interpretation last.

**Climatology**

- **What it calculates:** the long-term summer mean LST of each pixel.
- **Formula:**  
  $$\mu_P(x,y) = \frac{1}{N} \sum_{t=2013}^{2026} L(x,y,t), \qquad N = 14$$
- **How to read it:** this layer is the local reference. A hot value here means a surface is habitually hot, not necessarily anomalous.

**2026 anomaly**

- **What it calculates:** the 2026 departure from the same pixel's climatology.
- **Formula:**  
  $$A_{2026}(x,y) = L(x,y,2026) - \mu_P(x,y)$$
- **How to read it:** positive values mean 2026 was warmer than that pixel's normal behavior; negative values mean it was cooler. The layer answers "what changed here?", not "where is hottest overall?"

**Structural persistence**

- **What it calculates:** how many years a pixel was in the hottest 5% of Riga for that year.
- **Formula:**  
  $$H_s(x,y,t) = \mathbb{1}\left[L(x,y,t) \geq P_{95}(L(\cdot,\cdot,t))\right]$$
  $$P_s(x,y) = \sum_{t=2013}^{2026} H_s(x,y,t)$$
- **How to read it:** high values identify chronic heat locations: places that repeatedly rank among the city's hottest surfaces.

**Temporal persistence**

- **What it calculates:** how many years a pixel was unusually hot compared with its own history.
- **Formula:**  
  $$H_t(x,y,t) = \mathbb{1}\left[z_t(x,y,t) \geq 1.0\right]$$
  $$P_t(x,y) = \sum_{t=2013}^{2026} H_t(x,y,t)$$
- **How to read it:** high values identify places where heat behavior often departs from local normality. A place can be structurally hot but not temporally anomalous if it is hot in a stable, recurring way.

**Chronic/anomalous categorical layers**

- **What they combine:** structural heat and temporal anomaly logic.
- **How to read them:** these layers distinguish chronic-only areas, anomalous-only areas, and places where both conditions overlap.

Main data: `webapp_rasters/climatology_mean_2013_2026_30m.tif`, `webapp_rasters/anomaly_2026_summer_30m.tif`, persistence rasters, hotspot combination rasters, and supporting CSV summaries in `csv_info/`.

### View 3: Perché fa caldo qui

This view explains the 2026 physical context behind heat accumulation. All layers use the same summer 2026 baseline, so surface temperature, vegetation, and reflectance can be compared without mixing years.

**Normalization step**

- **What it calculates:** rescales each input layer inside Riga to a common 0-1 range before combining them.
- **Formula:**  
  $$X_{\mathrm{norm}}(x,y) = \frac{X(x,y) - \min_{\Omega} X}{\max_{\Omega} X - \min_{\Omega} X}$$
- **How to read it:** normalization makes LST, NDVI, and Albedo comparable as index inputs. It does not change them into physical units.
- **Water excluded:** 30 m pixels at least half covered by water (ESA WorldCover v200, class 80) are removed before normalization, so they neither set the min/max nor receive a UHEI, HVI or HRI value; district averages of these indices count land only. Water has no vegetation and low reflectance and would otherwise look highly exposed although it is not a hot spot; its cooling effect remains visible in the LST of the shores. The mask is published as `webapp_rasters/water_mask_2026_30m.tif` (1 = water) and labelled on the View 3 maps.

**UHEI: combined exposure**

- **What it calculates:** the combined presence of high surface temperature, low vegetation, and low reflectance.
- **Formula:**  
  $$\mathrm{UHEI}(x,y) = L_{\mathrm{norm}}(x,y) + \left(1 - \mathrm{NDVI}_{\mathrm{norm}}(x,y)\right) + \left(1 - \alpha_{\mathrm{norm}}(x,y)\right)$$
- **How to read it:** higher values mark places where the three physical conditions reinforce one another. UHEI is an index, not a temperature.

**HVI: temperature and vegetation**

- **What it calculates:** whether normalized temperature outweighs normalized vegetation.
- **Formula:**  
  $$\mathrm{HVI}(x,y) = L_{\mathrm{norm}}(x,y) - \mathrm{NDVI}_{\mathrm{norm}}(x,y)$$
- **How to read it:** positive values highlight places where high heat and low vegetation coincide; negative values indicate cooler or more vegetated conditions.

**HRI: temperature and reflectance**

- **What it calculates:** whether normalized temperature outweighs normalized albedo.
- **Formula:**  
  $$\mathrm{HRI}(x,y) = L_{\mathrm{norm}}(x,y) - \alpha_{\mathrm{norm}}(x,y)$$
- **How to read it:** positive values highlight places where high heat and low reflectance coincide. Albedo is the fraction of solar light reflected by the surface.

The standalone NDVI and albedo maps keep the native 10 m Sentinel-2 grid. UHEI, HVI, and HRI stay on the 30 m Landsat thermal grid: before those indices are calculated, the 10 m cells are aggregated with an area mean, so the temperature component is not presented as if it had 10 m information.

NDVI and Albedo remain available as standalone layers because the composite indices should be interpreted through their components.

Main data: `webapp_rasters/UHEI_2026_summer_30m.tif`, `HVI_2026_summer_30m.tif`, `HRI_2026_summer_30m.tif`, `NDVI_2026_summer_10m.tif`, `Albedo_2026_summer_10m.tif`, `csv_info/composite_indices_2026_summary.csv`.

### View 4: Giorno e notte

This view uses the coarser MODIS 1 km product to describe the 2026 day-night surface temperature range. It is designed for area-wide interpretation, not street- or building-scale inspection.

**Day-night map**

- **What it calculates:** the difference between daytime and nighttime MODIS LST for each 1 km cell.
- **Formula:**  
  $$\Delta L(x,y) = L_{\mathrm{day}}(x,y) - L_{\mathrm{night}}(x,y)$$
- **Which cells are shown:** every 1 km cell that touches the city boundary, cut along the boundary on the map. Edge cells also include some area outside the city. Cells without a valid MODIS value (mostly water) are shown hatched as "no data". The map, the scatter plots, and the cell count in the view use the same cells.
- **How to read it:** high values indicate a stronger day-night swing. Low values can indicate surfaces that retain heat, but they can also indicate areas that heat less during the day and therefore have less heat to lose at night.

**Scatter relationships**

- **What they calculate:** the relationship between day-night delta and either albedo or NDVI at the same 1 km cells.
- **Formula:**  
  $$r = \frac{\sum_i (X_i - \bar{X})(\Delta L_i - \overline{\Delta L})}{\sqrt{\sum_i (X_i - \bar{X})^2}\sqrt{\sum_i (\Delta L_i - \overline{\Delta L})^2}}$$
- **How to read it:** `X` is either albedo or NDVI. The correlation summarizes the direction and strength of the relationship; linked map/scatter selection keeps the statistical point tied to its geographic cell.

Main data: `csv_info/albedo_deltalst_2026_1km_pairs.csv` (map), `webapp_rasters/DeltaLST_2026_summer_1km.tif` (cells clipped by centre, not used by the map), `csv_info/albedo_ndvi_delta_2026_1km_pairs.csv`, `csv_info/albedo_deltalst_2026_1km_stats.csv`.

### View 5: Zoom sui quartieri

This view aggregates the 2026 indicators to Riga's 58 apkaimes, the city's official neighbourhood units. It converts pixel-level rasters into comparable area summaries.

**Zonal mean metrics**

- **What they calculate:** the average value of a selected metric inside an apkaime.
- **Formula:**  
  $$\bar{M}_Z = \frac{1}{|Z|} \sum_{(x,y) \in Z} M(x,y)$$
- **How to read it:** the value is a polygon-level summary, so it smooths pixel-level variability. It is useful for comparison between areas, not for locating individual hot surfaces inside the polygon.

**Critical-area share**

- **What it calculates:** the percentage of the polygon where the selected hotspot mask is active.
- **Formula:**  
  $$\mathrm{HP}_Z = \frac{\left|\{(x,y) \in Z : H(x,y) = 1\}\right|}{|Z|} \times 100\%$$
- **How to read it:** high values mean the critical condition is spatially widespread in the area; low values can still hide localized hotspots.

The sortable table ranks the apkaimes by the active metric, the search tool flies to a selected area, and map inspection selects the polygon directly.

Main data: `webapp_vectors/districts_enriched_2026.geojson` (with `apkaime` as the neighbourhood name), `src/data/districts.js`, and `webapp_vectors/riga_boundary_outline.geojson` (derived from the dissolved apkaime polygons).

## Data Inventory

The data directory is part of the delivered application because GitHub Pages serves the app as a static site. The main folders are:

- `webapp/data/gee_lst/`: annual Landsat LST GeoTIFFs for 2013-2026, including median, mean, and valid-observation-count rasters.
- `webapp/data/webapp_rasters/`: derived public map layers, including LST 2026, NDVI, Albedo, UHEI, HVI, HRI, climatology, anomaly, persistence, and day-night delta.
- `webapp/data/hotspots/`: annual structural and temporal hotspot masks plus persistence and chronic/anomalous combinations.
- `webapp/data/webapp_vectors/`: derived Riga boundary and enriched apkaime polygons (with `apkaime` and `saite` properties).
- `webapp/data/csv_info/`: yearly statistics, hotspot summaries, composite-index summaries, and scatter-pair CSV files.
- `webapp/data/csv_data_download/`: CSV metadata intended for user-facing data download or documentation.

Two source files also act as data registries for the frontend: `webapp/src/data/layers.js` defines layer metadata and raster URLs, while `webapp/src/data/districts.js` stores the metrics of the 58 apkaimes used in View 5 (generated by `npm run build:metrics`).

## Limitations

The platform describes the **observed surface**, not air temperature, perceived comfort, or social exposure. LST can be several degrees higher than air temperature, especially over dark or low-albedo surfaces.

Satellite observation gaps are kept as no-data cells rather than interpolated. The standalone Sentinel-2 NDVI and albedo layers have 10 m cells; Landsat thermal layers and every index that includes LST remain at 30 m, while the MODIS day-night layer is 1 km and should be used only for broader spatial interpretation. NDVI, albedo, UHEI, HVI, HRI, and day-night delta are fixed to the 2026 summer baseline.

Legend ranges are computed for each city (percentile clamping in `webapp/scripts/build_legend_ranges.mjs`, written to `webapp/src/data/legendRanges.js`), so colours are not comparable between the Marseille, Riga, Cluj-Napoca, and Bologna apps: compare values, not colours.

The hotspot thresholds are analytical conventions: top 5% for structural heat and temporal z-score `>= 1.0` for temporal anomaly. The app does not include population density, vulnerability indices, building age, health outcomes, or social overlays, so policy interpretation should combine these maps with local demographic and environmental datasets.

## Repository And Deployment

The repository is a single React + Vite web application under `webapp/`. The key source areas are:

- `webapp/src/components/views/`: the five narrative views.
- `webapp/src/components/map/`: MapLibre and raster rendering components.
- `webapp/src/components/panels/`: tables, scatter plots, detail cards, and area search.
- `webapp/src/data/`: layer configuration, view copy, legend ranges, and area metrics.
- `webapp/src/i18n/`: translations of the interface and copy.
- `webapp/src/store/appStore.js`: shared state for year, layer, threshold, comparison, aggregation, and interaction mode.
- `webapp/scripts/`: utility scripts: distribution preparation, area metrics (`npm run build:metrics`), legend ranges (`npm run build:legends`), yearly statistics, and CSV pair generation.
- `webapp/docs/`: logo and static documentation assets imported by the app.

Generated or local-only paths include `webapp/node_modules/`, `webapp/dist/`, and local dev-server `*.log` files (all ignored by git). These are not analytical source files. The public app is deployed to GitHub Pages using the settings in `webapp/package.json`, `webapp/vite.config.js`, and `webapp/scripts/prepare-dist.mjs`; the build copies `webapp/data` into `dist/data`, writes `.nojekyll`, and creates a `404.html` route fallback. `npm run deploy` builds the app and publishes `dist/` to the `gh-pages` branch; the app is served at <https://talea.comune.bologna.it/historysuhi-riga/>.

## License

This repository is released under the MIT License. See [`LICENSE`](LICENSE).

---

# Historical Surface Urban Heat Island (Versione Italiana)

**Historical Surface Urban Heat Island** (`historysuhi`) è una piattaforma web del Progetto Talea per leggere i pattern di isola di calore superficiale a Riga a partire da output prodotti in Google Earth Engine.

Applicazione online: <https://talea.comune.bologna.it/historysuhi-riga/>

## Indice

- [Panoramica](#panoramica)
- [Dati e metodi](#dati-e-metodi)
- [Indicatori principali](#indicatori-principali)
- [Viste applicative](#viste-applicative)
- [Inventario dei dati](#inventario-dei-dati)
- [Limiti](#limiti)
- [Repository e deploy](#repository-e-deploy)
- [Licenza](#licenza)

## Panoramica

L'applicazione trasforma un archivio Landsat 8/9 2013-2026 e un prodotto MODIS giorno-notte 2026 in mappe, sintesi e confronti territoriali leggibili da cittadini e tecnici. Il focus è la **temperatura di superficie**: la temperatura di tetti, strade, vegetazione, piazzali e altre superfici osservate dall'alto.

L'obiettivo è superare la lettura di una singola immagine termica. La piattaforma mostra dove Riga è calda in termini assoluti, dove il caldo è persistente negli anni, dove il 2026 si discosta dal comportamento storico locale e quali fattori fisici aiutano a spiegare il pattern osservato.

L'interfaccia pubblica è organizzata come una narrazione in cinque passaggi. Ogni passaggio combina una mappa con controlli mirati, strumenti di ispezione e sintesi di supporto, così che lo stesso dataset possa essere letto a scala di pixel e di apkaime.

## Dati e metodi

Tutti i dati analitici sono estratti o calcolati da Google Earth Engine e poi esportati in [`webapp/data`](webapp/data) per essere serviti staticamente dal frontend React/Vite. La webapp non ricalcola l'intera pipeline geospaziale: visualizza raster e vettori esportati, con solo trasformazioni leggere necessarie alla visualizzazione.

I layer termici derivati da Landsat usano compositi estivi a 30 m per il periodo 2013-2026. Questi alimentano mappe annuali di LST, climatologia, anomalie, z-score, hotspot, persistenza e la componente termica degli indici sintetici. I layer autonomi di NDVI e albedo 2026 derivano da Sentinel-2 a 10 m; UHEI, HVI e HRI restano a 30 m perché includono la temperatura Landsat, con NDVI e albedo mediati per area dalla griglia a 10 m a quella termica. Nella versione precedente (2025) l'albedo era Landsat a 30 m, quindi albedo, HRI e UHEI non sono direttamente confrontabili con quella versione. Il layer derivato da MODIS usa un prodotto giorno-notte 2026 a 1 km per descrivere l'escursione termica superficiale tra osservazioni diurne e notturne.

Le sezioni successive descrivono come questi output vengono usati nelle cinque viste applicative. Le formule sono inserite vicino alla vista in cui diventano parte dell'interpretazione.

## Indicatori principali

| Indicatore | Cosa descrive | Risoluzione / ambito | Sorgente principale |
| --- | --- | --- | --- |
| LST | Temperatura mediana estiva di superficie | Landsat 30 m, 2013-2026 | `gee_lst/Riga_LST_{year}_summer_median_30m.tif` |
| Z-score spaziale | Scostamento dalla media urbana di Riga nello stesso anno | Landsat 30 m, ogni anno | Calcolato dai raster LST annuali |
| Climatologia | Media estiva LST 2013-2026 | Landsat 30 m | `webapp_rasters/climatology_mean_2013_2026_30m.tif` |
| Anomalia 2026 | LST 2026 confrontata con il riferimento storico dello stesso pixel | Landsat 30 m | `webapp_rasters/anomaly_2026_summer_30m.tif` |
| Persistenza temporale | Numero di estati in cui un pixel è anomalo rispetto alla propria storia | Landsat 30 m, conteggio osservato 0-5 | `webapp_rasters/hotspot_temporal_persistence_2013_2026.tif` |
| Persistenza strutturale | Numero di estati in cui un pixel è nel top 5% LST della città | Landsat 30 m, conteggio 0-14 | `webapp_rasters/hotspot_structural_persistence_2013_2026.tif` |
| UHEI / HVI / HRI | Indici sintetici che collegano caldo, vegetazione e albedo | Landsat 30 m, 2026 | `webapp_rasters/UHEI_2026_summer_30m.tif`, `HVI`, `HRI` |
| NDVI | Presenza e densità della vegetazione | Sentinel-2 10 m, 2026 | `webapp_rasters/NDVI_2026_summer_10m.tif` |
| Albedo | Quota di luce solare riflessa dalla superficie | Sentinel-2 10 m, 2026 | `webapp_rasters/Albedo_2026_summer_10m.tif` |
| Delta giorno-notte | Escursione della temperatura di superficie tra giorno e notte | MODIS 1 km, 2026 | `csv_info/albedo_deltalst_2026_1km_pairs.csv` (mappa) |
| Metriche zonali | Valori medi per apkaime | 58 apkaimes | `webapp_vectors/districts_enriched_2026.geojson`, `src/data/districts.js` |

## Viste applicative

Il frontend è strutturato in cinque viste collegate. Ogni vista parte da una domanda leggibile anche da un pubblico non tecnico e poi espone i prodotti raster o vettoriali necessari per rispondere correttamente.

| Vista | Domanda | Contenuto principale |
| --- | --- | --- |
| 1. Dove fa caldo | Dove la superficie è più calda nell'anno selezionato? | LST annuale, z-score spaziale, slider anno, confronto LST, overlay hotspot temporale. |
| 2. Cosa è normale, cosa è cambiato | Cosa è abituale, persistente o anomalo nel periodo 2013-2026? | Climatologia, anomalia 2026, persistenza temporale/strutturale, classi cronico/anomalo. |
| 3. Perché fa caldo qui | Quali condizioni fisiche aiutano a spiegare la concentrazione del caldo? | UHEI, HVI, HRI, NDVI e Albedo sulla base 2026. |
| 4. Giorno e notte | Dove la superficie si raffredda di più o di meno tra giorno e notte? | Mappa MODIS del delta giorno-notte e relazioni scatter con albedo o NDVI. |
| 5. Zoom sui quartieri | Come si confrontano le apkaimes di Riga? | Aggregazione per apkaime, tabella ordinabile, ricerca, ispezione mappa, scheda dettaglio. |

### Vista 1: Dove fa caldo

Questa vista legge l'archivio annuale della temperatura di superficie. La sua logica è: prima mostrare la temperatura assoluta dell'estate selezionata, poi offrire una vista standardizzata delle differenze interne alla città, poi evidenziare opzionalmente i luoghi anomali rispetto alla propria storia.

**Layer LST annuale**

- **Cosa calcola:** la temperatura mediana estiva di superficie dell'anno selezionato per ogni pixel.
- **Formula:**  
  $$L(x,y,t)$$
- **Come si legge:** valori alti identificano le superfici più calde in termini assoluti nell'anno `t`. Il modale di confronto mantiene la stessa scala LST tra due anni, così il confronto visivo resta coerente.

**Layer z-score spaziale**

- **Cosa calcola:** quanto ogni pixel è sopra o sotto la media di Riga nello stesso anno.
- **Formula:**  
  $$z_s(x,y,t) = \frac{L(x,y,t) - \mu_C(t)}{\sigma_C(t)}$$
- **Come si legge:** non è una temperatura in gradi. `0` indica valori vicini alla media urbana dell'anno, valori positivi indicano superfici più calde della media urbana, valori negativi superfici più fresche. Serve per leggere le asimmetrie interne a un anno, non il cambiamento assoluto tra anni.

**Overlay di anomalia temporale**

- **Cosa calcola:** se un pixel è insolitamente caldo rispetto al proprio comportamento nel periodo 2013-2026.
- **Formula:**  
  $$z_t(x,y,t) = \frac{L(x,y,t) - \mu_P(x,y)}{\sigma_P(x,y)}$$
  $$H_t(x,y,t) = \mathbb{1}\left[z_t(x,y,t) \geq 1.0\right]$$
- **Come si legge:** l'overlay non segnala semplicemente le superfici più calde. Segnala i luoghi in cui l'anno selezionato è alto rispetto al comportamento normale dello stesso pixel.

Dati principali: `gee_lst/Riga_LST_{year}_summer_median_30m.tif`, `hotspots/hotspot_temporal_{year}_zgt1p0.tif`, `csv_info/LST_yearly_input_summary_median_30m.csv`.

### Vista 2: Cosa è normale, cosa è cambiato

Questa vista passa dalla lettura di un singolo anno alla storia completa 2013-2026. La sequenza è: prima il riferimento di base, poi lo scostamento del 2026, poi la ricorrenza, infine la combinazione interpretativa.

**Climatologia**

- **Cosa calcola:** la media estiva LST di lungo periodo per ciascun pixel.
- **Formula:**  
  $$\mu_P(x,y) = \frac{1}{N} \sum_{t=2013}^{2026} L(x,y,t), \qquad N = 14$$
- **Come si legge:** questo layer è il riferimento locale. Un valore caldo qui indica una superficie abitualmente calda, non necessariamente anomala.

**Anomalia 2026**

- **Cosa calcola:** lo scostamento del 2026 dalla climatologia dello stesso pixel.
- **Formula:**  
  $$A_{2026}(x,y) = L(x,y,2026) - \mu_P(x,y)$$
- **Come si legge:** valori positivi indicano un 2026 più caldo del comportamento normale di quel pixel; valori negativi indicano un 2026 più fresco. Il layer risponde a "cosa è cambiato qui?", non a "dove fa più caldo in assoluto?"

**Persistenza strutturale**

- **Cosa calcola:** in quanti anni un pixel è rientrato nel 5% più caldo di Riga per quell'anno.
- **Formula:**  
  $$H_s(x,y,t) = \mathbb{1}\left[L(x,y,t) \geq P_{95}(L(\cdot,\cdot,t))\right]$$
  $$P_s(x,y) = \sum_{t=2013}^{2026} H_s(x,y,t)$$
- **Come si legge:** valori alti identificano luoghi di caldo cronico, cioè superfici che ricorrono spesso tra le più calde della città.

**Persistenza temporale**

- **Cosa calcola:** in quanti anni un pixel è stato insolitamente caldo rispetto alla propria storia.
- **Formula:**  
  $$H_t(x,y,t) = \mathbb{1}\left[z_t(x,y,t) \geq 1.0\right]$$
  $$P_t(x,y) = \sum_{t=2013}^{2026} H_t(x,y,t)$$
- **Come si legge:** valori alti indicano luoghi in cui il comportamento termico si discosta spesso dalla normalità locale. Un luogo può essere strutturalmente caldo ma non temporalmente anomalo se è caldo in modo stabile e ricorrente.

**Layer categorici cronico/anomalo**

- **Cosa combinano:** logica del caldo strutturale e logica dell'anomalia temporale.
- **Come si leggono:** distinguono aree solo croniche, aree solo anomale e luoghi in cui le due condizioni si sovrappongono.

Dati principali: `webapp_rasters/climatology_mean_2013_2026_30m.tif`, `webapp_rasters/anomaly_2026_summer_30m.tif`, raster di persistenza, raster di combinazione hotspot e sintesi CSV in `csv_info/`.

### Vista 3: Perché fa caldo qui

Questa vista spiega il contesto fisico 2026 che aiuta a interpretare l'accumulo di calore. Tutti i layer usano la stessa base estiva 2026, quindi temperatura di superficie, vegetazione e riflettenza possono essere confrontate senza mescolare anni diversi.

**Passaggio di normalizzazione**

- **Cosa calcola:** riscalare ogni layer di input dentro il confine di Riga su un intervallo comune 0-1 prima di combinarli.
- **Formula:**  
  $$X_{\mathrm{norm}}(x,y) = \frac{X(x,y) - \min_{\Omega} X}{\max_{\Omega} X - \min_{\Omega} X}$$
- **Come si legge:** la normalizzazione rende LST, NDVI e Albedo confrontabili come input degli indici. Non trasforma questi valori in nuove unità fisiche.
- **Acqua esclusa:** i pixel da 30 m coperti almeno per metà da acqua (ESA WorldCover v200, classe 80) vengono tolti prima della normalizzazione: non fissano minimo e massimo e non ricevono un valore di UHEI, HVI o HRI; anche le medie per zona di questi indici contano solo la terraferma. L'acqua non ha verde e riflette poco, quindi risulterebbe molto esposta pur non essendo una zona di calore; il suo effetto rinfrescante resta visibile nella LST delle rive. La maschera è pubblicata come `webapp_rasters/water_mask_2026_30m.tif` (1 = acqua) ed è indicata sulle mappe della Vista 3.

**UHEI: esposizione combinata**

- **Cosa calcola:** la compresenza di temperatura alta, poca vegetazione e bassa riflettenza.
- **Formula:**  
  $$\mathrm{UHEI}(x,y) = L_{\mathrm{norm}}(x,y) + \left(1 - \mathrm{NDVI}_{\mathrm{norm}}(x,y)\right) + \left(1 - \alpha_{\mathrm{norm}}(x,y)\right)$$
- **Come si legge:** valori alti indicano luoghi in cui le tre condizioni fisiche si rinforzano. UHEI è un indice, non una temperatura.

**HVI: temperatura e vegetazione**

- **Cosa calcola:** se la temperatura normalizzata prevale sulla vegetazione normalizzata.
- **Formula:**  
  $$\mathrm{HVI}(x,y) = L_{\mathrm{norm}}(x,y) - \mathrm{NDVI}_{\mathrm{norm}}(x,y)$$
- **Come si legge:** valori positivi evidenziano luoghi dove caldo elevato e poca vegetazione coincidono; valori negativi indicano condizioni più fresche o più vegetate.

**HRI: temperatura e riflettenza**

- **Cosa calcola:** se la temperatura normalizzata prevale sull'albedo normalizzato.
- **Formula:**  
  $$\mathrm{HRI}(x,y) = L_{\mathrm{norm}}(x,y) - \alpha_{\mathrm{norm}}(x,y)$$
- **Come si legge:** valori positivi evidenziano luoghi dove caldo elevato e bassa riflettenza coincidono. L'albedo è la quota di luce solare riflessa dalla superficie.

Le mappe autonome di NDVI e albedo mantengono la griglia nativa Sentinel-2 a 10 m. UHEI, HVI e HRI restano sulla griglia termica Landsat a 30 m: prima di calcolare questi indici, le celle a 10 m vengono aggregate con una media areale, così la componente termica non viene presentata come se contenesse informazione a 10 m.

NDVI e Albedo restano disponibili come layer autonomi perché gli indici compositi devono essere interpretati attraverso le loro componenti.

Dati principali: `webapp_rasters/UHEI_2026_summer_30m.tif`, `HVI_2026_summer_30m.tif`, `HRI_2026_summer_30m.tif`, `NDVI_2026_summer_10m.tif`, `Albedo_2026_summer_10m.tif`, `csv_info/composite_indices_2026_summary.csv`.

### Vista 4: Giorno e notte

Questa vista usa il prodotto MODIS a 1 km, più grossolano, per descrivere l'escursione giorno-notte della temperatura di superficie nel 2026. È pensata per una lettura su area vasta, non per ispezioni a scala di strada o edificio.

**Mappa giorno-notte**

- **Cosa calcola:** la differenza tra LST MODIS diurna e notturna per ogni cella da 1 km.
- **Formula:**  
  $$\Delta L(x,y) = L_{\mathrm{day}}(x,y) - L_{\mathrm{night}}(x,y)$$
- **Quali celle sono mostrate:** tutte le celle da 1 km che toccano il confine della città, tagliate lungo il confine sulla mappa. Le celle di bordo includono anche una parte di territorio esterno. Le celle senza un valore MODIS valido (soprattutto acqua) sono tratteggiate come "dato non disponibile". Mappa, scatter plot e numero di celle indicato nella vista usano le stesse celle.
- **Come si legge:** valori alti indicano una maggiore escursione tra giorno e notte. Valori bassi possono indicare superfici che trattengono calore, ma anche aree che si scaldano meno durante il giorno e quindi hanno meno calore da perdere di notte.

**Relazioni scatter**

- **Cosa calcolano:** la relazione tra delta giorno-notte e albedo oppure NDVI nelle stesse celle da 1 km.
- **Formula:**  
  $$r = \frac{\sum_i (X_i - \bar{X})(\Delta L_i - \overline{\Delta L})}{\sqrt{\sum_i (X_i - \bar{X})^2}\sqrt{\sum_i (\Delta L_i - \overline{\Delta L})^2}}$$
- **Come si leggono:** `X` è albedo oppure NDVI. La correlazione sintetizza direzione e intensità della relazione; la selezione collegata tra mappa e scatter mantiene il punto statistico legato alla sua cella geografica.

Dati principali: `csv_info/albedo_deltalst_2026_1km_pairs.csv` (mappa), `webapp_rasters/DeltaLST_2026_summer_1km.tif` (celle ritagliate per centro, non usato dalla mappa), `csv_info/albedo_ndvi_delta_2026_1km_pairs.csv`, `csv_info/albedo_deltalst_2026_1km_stats.csv`.

### Vista 5: Zoom sui quartieri

Questa vista aggrega gli indicatori 2026 sulle 58 apkaimes, le suddivisioni ufficiali di quartiere di Riga. Converte i raster a livello di pixel in sintesi territoriali confrontabili.

**Metriche di media zonale**

- **Cosa calcolano:** il valore medio di una metrica selezionata dentro un'apkaime.
- **Formula:**  
  $$\bar{M}_Z = \frac{1}{|Z|} \sum_{(x,y) \in Z} M(x,y)$$
- **Come si leggono:** il valore è una sintesi di poligono, quindi attenua la variabilità interna dei pixel. Serve per confrontare aree tra loro, non per localizzare singole superfici calde dentro il poligono.

**Quota area critica**

- **Cosa calcola:** la percentuale del poligono in cui la maschera hotspot selezionata è attiva.
- **Formula:**  
  $$\mathrm{HP}_Z = \frac{\left|\{(x,y) \in Z : H(x,y) = 1\}\right|}{|Z|} \times 100\%$$
- **Come si legge:** valori alti indicano che la condizione critica è diffusa nell'area; valori bassi possono comunque nascondere hotspot localizzati.

La tabella ordinabile classifica le apkaimes sulla metrica attiva, la ricerca vola all'area selezionata e l'ispezione mappa seleziona direttamente il poligono.

Dati principali: `webapp_vectors/districts_enriched_2026.geojson`, `src/data/districts.js` e `webapp_vectors/riga_boundary_outline.geojson`.

## Inventario dei dati

La cartella dati fa parte dell'applicazione pubblicata perché GitHub Pages serve il progetto come sito statico. Le cartelle principali sono:

- `webapp/data/gee_lst/`: GeoTIFF annuali Landsat LST per il periodo 2013-2026, inclusi raster di mediana, media e conteggio osservazioni valide.
- `webapp/data/webapp_rasters/`: layer pubblici derivati, inclusi LST 2026, NDVI, Albedo, UHEI, HVI, HRI, climatologia, anomalia, persistenza e delta giorno-notte.
- `webapp/data/hotspots/`: maschere annuali di hotspot strutturale e temporale, più combinazioni di persistenza e cronico/anomalo.
- `webapp/data/webapp_vectors/`: confine di Riga derivato e poligoni delle apkaimes arricchiti (con campi `apkaime` e `saite`).
- `webapp/data/csv_info/`: statistiche annuali, sintesi hotspot, sintesi degli indici compositi e CSV per gli scatter plot.
- `webapp/data/csv_data_download/`: metadati CSV pensati per download o documentazione lato utente.

Due file sorgente funzionano anche come registri dati per il frontend: `webapp/src/data/layers.js` definisce metadati dei layer e URL dei raster, mentre `webapp/src/data/districts.js` contiene le metriche delle 58 apkaimes usate nella Vista 5 (generate con `npm run build:metrics`).

## Limiti

La piattaforma descrive la **superficie osservata**, non la temperatura dell'aria, il comfort percepito o l'esposizione sociale. La LST può essere diversi gradi più alta della temperatura dell'aria, soprattutto su superfici scure o a basso albedo.

I buchi di osservazione satellitare sono mantenuti come celle senza dato e non interpolati. I layer autonomi Sentinel-2 di NDVI e albedo hanno celle di 10 m; i layer termici Landsat e tutti gli indici che includono la LST restano a 30 m, mentre il layer MODIS giorno-notte è a 1 km e va usato solo per interpretazioni spaziali più ampie. NDVI, albedo, UHEI, HVI, HRI e delta giorno-notte sono fissati alla sola base estiva 2026.

Le scale delle legende sono calcolate per ogni città (clamping a percentili in `webapp/scripts/build_legend_ranges.mjs`, scritto in `webapp/src/data/legendRanges.js`), quindi i colori non sono confrontabili tra le app di Marsiglia, Riga, Cluj-Napoca e Bologna: vanno confrontati i valori, non i colori.

Le soglie hotspot sono convenzioni analitiche: top 5% per il caldo strutturale e z-score temporale `>= 1.0` per l'anomalia temporale. L'app non include densità di popolazione, indici di vulnerabilità, età degli edifici, esiti sanitari o overlay sociali; l'uso per policy deve quindi combinare queste mappe con dataset demografici e ambientali locali.

## Repository e deploy

Il repository è una singola applicazione React + Vite dentro `webapp/`. Le aree sorgente principali sono:

- `webapp/src/components/views/`: le cinque viste narrative.
- `webapp/src/components/map/`: componenti MapLibre e rendering raster.
- `webapp/src/components/panels/`: tabelle, scatter plot, schede dettaglio e ricerca area.
- `webapp/src/data/`: configurazione layer, testi delle viste, scale delle legende e metriche per area.
- `webapp/src/i18n/`: traduzioni dell'interfaccia e dei testi.
- `webapp/src/store/appStore.js`: stato condiviso per anno, layer, soglia, confronto, aggregazione e modalità di interazione.
- `webapp/scripts/`: script di utilità: preparazione della distribuzione, metriche per area (`npm run build:metrics`), scale delle legende (`npm run build:legends`), statistiche annuali e generazione delle coppie CSV.
- `webapp/docs/`: logo e asset statici importati dall'app.

Percorsi generati o solo locali includono `webapp/node_modules/`, `webapp/dist/` e i file `*.log` dei server locali (tutti ignorati da git). Non sono file sorgente analitici. L'app pubblica è distribuita su GitHub Pages usando le impostazioni in `webapp/package.json`, `webapp/vite.config.js` e `webapp/scripts/prepare-dist.mjs`; la build copia `webapp/data` in `dist/data`, scrive `.nojekyll` e crea un fallback `404.html` per le rotte. `npm run deploy` esegue la build e pubblica `dist/` sul branch `gh-pages`; l'app è servita su <https://talea.comune.bologna.it/historysuhi-riga/>.

## Licenza

Questo repository è rilasciato con licenza MIT. Vedi [`LICENSE`](LICENSE).
