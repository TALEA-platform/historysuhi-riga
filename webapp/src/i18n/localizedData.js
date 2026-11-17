import {
  titleHighlightPattern as italianTitleHighlightPattern,
  titleSplitPattern as italianTitleSplitPattern,
  view2LayersWithoutValuesToggle,
  viewCopy as italianViewCopy,
  views as italianViews,
} from "../data/viewsCopy.js";
import {
  dataAvailability,
  deltaLayer as italianDeltaLayer,
  districtMetrics as italianDistrictMetrics,
  districts,
  rasterOverlays as italianRasterOverlays,
  view1Layers as italianView1Layers,
  view2Layers as italianView2Layers,
  view3Layers as italianView3Layers,
  yearlyStats,
  years,
} from "../data/layers.js";
import { normalizeLanguage } from "./config.js";

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Set);
}

function mergeLocalized(baseValue, overrideValue) {
  if (overrideValue === undefined) return baseValue;
  if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) return overrideValue;

  const merged = { ...baseValue };
  for (const key of Object.keys(overrideValue)) {
    merged[key] = mergeLocalized(baseValue?.[key], overrideValue[key]);
  }
  return merged;
}

function localizeCollection(baseCollection, overrides = {}) {
  return Object.fromEntries(
    Object.entries(baseCollection).map(([key, value]) => [key, mergeLocalized(value, overrides[key])]),
  );
}

const englishViews = [
  { id: "v1", title: "Where it gets hot", subtitle: "Observed heat" },
  { id: "v2", title: "What is normal, what changed", subtitle: "2013-2026 history" },
  { id: "v3", title: "Why it gets hot here", subtitle: "Physical drivers" },
  { id: "v4", title: "Day and night", subtitle: "Cooling" },
  { id: "v5", title: "Zoom into districts", subtitle: "Area summaries" },
];

const englishViewCopy = {
  v1: {
    kicker: "View 1",
    title: "Where Riga's surface heats up the most in summer.",
    note: "These maps show surfaces observed by satellite during the summer months: roads, roofs, paved areas and vegetation. They do not represent air temperature.",
  },
  v2: {
    kicker: "View 2",
    title: "What is normal, what has changed over time.",
    note: "This section distinguishes usual conditions, anomalies and heat persistence across 2013-2026.",
  },
  v3: {
    kicker: "View 3",
    title: "Why some areas accumulate more heat.",
    note: "This section focuses on the physical factors that help explain heat accumulation: greenery, materials and how surfaces reflect light.",
  },
  v4: {
    kicker: "View 4",
    title: "Where the city cools down, and where it holds heat.",
    note: "The day-night dataset is calculated for 2026 at 1 km resolution: useful for reading city zones, not individual buildings.",
  },
  v5: {
    kicker: "View 5",
    title: "A summary reading by apkaime.",
    note: "This view aggregates the main 2026 data so Riga's apkaimes can be compared.",
  },
};

const englishLayerOverrides = {
  view1Layers: {
    lst: {
      title: "Where the surface heats up the most",
      subtitle: "Surface temperature in the selected year",
      description:
        "Shows the surface temperature observed in the selected year. It is a direct reading: it indicates how hot roads, roofs, paved areas and vegetation appear in summer satellite observations.",
      explanation:
        "Use it to understand where the surface temperature is highest in absolute terms. A road or a roof can have a surface temperature much higher than the air temperature people breathe (satellite-observed surface data).",
      details: [
        "Blue and green indicate surfaces with lower temperatures; orange and red indicate surfaces with very high temperatures.",
        "This map lets you compare different years with the Compare slider.",
        "It differs from the second layer because here you read the temperature value itself, not the relationship with the city's annual average.",
        "Hatched areas mean data not available: at that location the satellite did not collect valid summer observations in the selected year.",
      ],
      legendTitle: "Surface temperature",
      legend: ["among the least hot", "less hot", "mid-range", "hot", "very hot", "among the hottest"],
      noDataLabel: "No data",
      noDataDescription:
        "At this location the satellite did not collect valid summer observations in the selected year, so the map leaves it as no data.",
      method: "Summer median LST, Landsat 8/9, 30 m resolution.",
    },
    zspat: {
      title: "Areas where the temperature differs from the average",
      subtitle: "How much a place differs from the urban average in the same year",
      description:
        "This map shows by how much a point's temperature is above or below Riga's average **in the same year**. It does not show the absolute value of the surface temperature.",
      explanation:
        "Use it to read internal imbalances across the city: blue means below the city's annual average, white roughly in line, red above the city's annual average.",
      details: [
        "Different years are not compared directly here: each year is recalibrated to its own urban average.",
        "An area can appear red even in a non-extreme year if its temperature is above the rest of the city's average in that year.",
        "Use it to understand differences between districts and urban zones within the same selected year.",
        "Hatched areas mean data not available: at that location the satellite did not collect valid summer observations in the selected year.",
      ],
      valueInfo:
        "When you enable values, the number is not a temperature. It is a **standardized deviation**: 0 means close to the city's annual average, positive values indicate areas with temperature above the average, negative values areas with temperature below the average.",
      legendTitle: "Compared with the city",
      legend: ["well below average", "below average", "in line", "above average", "well above average"],
      noDataLabel: "No data",
      noDataDescription:
        "At this location the satellite did not collect valid summer observations in the selected year, so the map leaves it as no data.",
      method: "Year-by-year spatial z-score.",
    },
  },
  view2Layers: {
    anomaly: {
      title: "How much 2026 differs from the usual temperature",
      subtitle: "How much 2026 differs from this area's usual temperature",
      description:
        "Shows where 2026 behaved differently from the usual pattern across 2013-2026. It does not answer 'where is it hottest?', but rather 'where was 2026 **anomalous compared with its own history**?'.",
      explanation:
        "Blue indicates places with temperature below their usual pattern, white places in line, red places with temperature above their usual pattern. Each point is compared with its own history, not with the rest of the city.",
      details: [
        "A location that is usually hot can appear white if in 2026 it behaved as usual.",
        "A place that is not especially hot in absolute terms can appear red if in 2026 its temperature was above its own history.",
      ],
      inspectNote: "Here the value indicates the difference between 2026 and the usual behaviour of the same location.",
      legendTitle: "Departure from normal",
      legend: [
        "below the usual",
        "slightly below",
        "in line",
        "slightly above",
        "above the usual",
        "well above",
      ],
      method: "",
    },
    climatology: {
      title: "Usual temperature",
      subtitle: "Historical mean 2013-2026: the reference for reading the other layers",
      description:
        "Shows the **historical mean** of surface temperature across summers 2013-2026. It is the baseline map for View 2: it helps you see where the mean surface temperature is normally high or low.",
      explanation:
        "Read it as the usual behaviour of the surface. An industrial area, a large parking lot or parts of the historic centre can show a high surface temperature here even when they are not anomalous: that means the temperature is recurrently high.",
      details: [
        "It differs from the layer in View 1: here you are not reading a selected year, but an average across 14 summers.",
        "It helps separate usual heat from anomalous heat.",
      ],
      moreInfo: [
        "If an area shows a high temperature on this map it means that area tends to have a high surface temperature across the 2013-2026 series.",
        "This map is the starting point for understanding the following maps: first you see the average behaviour, then you read where heat is chronic or anomalous.",
      ],
      inspectNote: "Computed on the observed surface.",
      legendTitle: "Historical mean 2013-2026",
      legend: ["historically lowest", "low", "intermediate", "high", "very high", "historically among the highest"],
    },
    persistenceTemporal: {
      title: "Areas often anomalous",
      subtitle: "Places that heated beyond their usual pattern in several years",
      description:
        "This map shows how many times an area was **anomalous compared with its own history**. It does not look for places that are always hot: it looks for places that, in some years, become hotter than they usually are.",
      explanation:
        "An area can be very hot yet show few anomalies if it is hot in almost the same way every year. A central urban area, for example, can be constantly hot but vary little from year to year.",
      details: [
        "The number indicates in how many summers that point was anomalous compared with itself.",
        "Rare anomalies do not automatically mean low temperatures: they can also indicate stable, consistently high temperatures.",
        "The highest value observed in this dataset is 5 years: not all 14 summers produced anomalies in the same location.",
      ],
      moreInfo: [
        "Read this map together with **Chronically hot areas**. If an area has few anomalies but many chronic years, it is probably a stable critical area rather than a temporary exception.",
        "If an area has many anomalies but is not chronic, it may be a place whose behaviour changes in specific years.",
      ],
      inspectNote: "Few anomalies do not necessarily mean low temperatures: also check the chronically hot areas layer.",
      legendTitle: "Anomaly persistence",
      legend: ["0 years", "1 year", "2 years", "3 years", "4 years", "5 years"],
      numericLegend: ["0", "1", "2", "3", "4", "5 years"],
      legendStops: [
        { label: "0 years", color: "#fffdf0", accessibleColor: "#f7fcf0" },
        { label: "1 year", color: "#fee391", accessibleColor: "#ccebc5" },
        { label: "2 years", color: "#fec44f", accessibleColor: "#7bccc4" },
        { label: "3 years", color: "#fe9929", accessibleColor: "#43a2ca" },
        { label: "4 years", color: "#e31a1c", accessibleColor: "#0868ac" },
        { label: "5 years", color: "#b10026", accessibleColor: "#00204d" },
      ],
    },
    persistenceStructural: {
      title: "Chronically hot areas",
      subtitle: "Places that rank among the city's areas with the highest surface temperature in many years",
      description:
        "Shows how many times each point ranked within the **top 5% of areas with the highest surface temperature** in Riga. Here 'chronic' means a repeated critical condition in urban space, year after year.",
      explanation:
        "Use it to identify places that often have the highest surface temperature in the city, even when they are not anomalous compared with their own history.",
      details: [
        "The number can reach 14 because the display covers 14 summers, from 2013 to 2026.",
        "Compare it with 'Chronic heat and anomalous heat' to understand whether a critical condition is stable, recurring or both.",
      ],
      moreInfo: [
        "To understand why an area is chronic, move to View 3 and look at vegetation and how reflective the surfaces are: little greenery and dark or absorbent surfaces often help explain the pattern.",
      ],
      followUps: [
        { label: "Go to Vegetation presence", view: "v3", stateKey: "view3Layer", layer: "ndvi" },
        { label: "Go to Reflective surfaces", view: "v3", stateKey: "view3Layer", layer: "albedo" },
      ],
      inspectNote: "",
      legendTitle: "Structural persistence",
      legend: ["0 years", "1 year", "2-4 years", "5-8 years", "9-12 years", "13-14 years"],
      numericLegend: ["0", "1", "2-4", "5-8", "9-12", "13-14 years"],
      legendStops: [
        { label: "0 years", color: "#fffdf0", accessibleColor: "#f7fcf0" },
        { label: "1 year", color: "#fee391", accessibleColor: "#ccebc5" },
        { label: "2-4 years", color: "#fec44f", accessibleColor: "#7bccc4" },
        { label: "5-8 years", color: "#fc4e2a", accessibleColor: "#43a2ca" },
        { label: "9-12 years", color: "#bd0026", accessibleColor: "#0868ac" },
        { label: "13-14 years", color: "#800026", accessibleColor: "#00204d" },
      ],
    },
    chronicVsAnomalous2025: {
      title: "Chronic heat and 2026 anomalies",
      subtitle: "Separates long-term critical areas from those that emerged in 2026",
      description:
        "Crosses the top 5% of surface temperatures in 2026 with anomalies in the same year. It helps distinguish long-standing critical areas from those that emerged in the latest available year.",
      explanation:
        "Orange indicates chronic heat; purple indicates a 2026 anomaly; the darker colour indicates both conditions in the same location.",
      details: [
        "Chronic means that the point falls within the **top 5% of areas with the highest surface temperature** of the selected year (2026).",
        "Anomalous 2026 means that in 2026 the point was **anomalous compared with its own history**.",
        "The both class marks places that were already critical and in 2026 also behaved outside the norm.",
      ],
      inspectNote: "This class combines two readings: structural heat compared with the city and the 2026 anomaly compared with the point's own history.",
      legendTitle: "4 classes",
      legend: ["no critical pattern", "chronic", "2026 anomaly", "chronic and anomalous"],
    },
    structuralVsTemporal: {
      title: "Chronic heat and anomalous heat",
      subtitle: "Separates places that are always hot from those often anomalous",
      description:
        "Crosses, for the full 2013-2026 period, how many times an area ranked in the **top 5% of areas with the highest surface temperature** and how many times it was **anomalous compared with its own history**.",
      explanation:
        "",
      details: [
        "Orange increases with the years of chronic heat.",
        "Purple increases with the years of anomalous heat.",
        "Where the two conditions coexist, the colour is mixed: it signals both structural criticality and recurring anomalies.",
        "Chronic reaches 14 years because the series covers 14 summers. Anomalous reaches 5 years because that is the maximum currently present in the anomaly persistence dataset.",
      ],
      moreInfo: [
        "Low anomaly does not necessarily mean low temperatures. It can also indicate a place that is always hot and stable, such as some parts of the historic centre.",
        "If you see a lot of orange and little purple, the issue is mainly structural. If you see a lot of purple, the behaviour changes more often relative to local history.",
        "To understand the physical causes, explore View 3: vegetation, reflective surfaces and materials help explain why an area holds or accumulates heat.",
      ],
      followUps: [
        { label: "Go to Vegetation presence", view: "v3", stateKey: "view3Layer", layer: "ndvi" },
        { label: "Go to Reflective surfaces", view: "v3", stateKey: "view3Layer", layer: "albedo" },
      ],
      inspectNote: "",
      legendTitle: "Chronic/anomalous intensity",
      legend: ["chronic: 1-14 years", "anomalous: 1-5 years", "both: mixed colours"],
    },
  },
  view3Layers: {
    uhei: {
      title: "Overall heat exposure",
      subtitle: "Where high surface temperature, little vegetation and dark surfaces show up together",
      description:
        "Shows where three conditions overlap in the same place: higher surface temperatures, limited vegetation and surfaces that reflect little sunlight. When all three meet, overall heat exposure is higher — not because any single cause is enough on its own, but because they reinforce each other.",
      explanation:
        "It is the guiding layer in View 3. Use it to identify where interventions should be integrated: not only trees, not only materials, but a combination of factors.",
      details: [
        "Higher values indicate greater overall exposure to high surface temperatures.",
        "It is not a health or social measure: it describes physical conditions observed by satellite.",
        "Read it together with the vegetation and albedo layers to understand which factor weighs more.",
      ],
      valueInfo:
        "This value is a **synthetic index, not a temperature in °C**. The number combines surface temperature, limited vegetation and poorly reflective surfaces: higher values indicate physical conditions that are more exposed to heat.",
      legendTitle: "Heat exposure",
      legend: ["very favorable", "favorable", "intermediate", "exposed", "very exposed"],
    },
    ndvi: {
      title: "Vegetation presence",
      subtitle: "Helps identify where greenery can contribute more to heat mitigation",
      description:
        "Shows where vegetation is more present. In practical terms it helps identify parks, tree lines, agricultural areas and places where greenery can help mitigate heat.",
      explanation:
        "Beige means little observable vegetation, dark green means denser and healthier vegetation.",
      details: [
        "This is a satellite index: it separates vegetated surfaces from mineral or built surfaces.",
      ],
      valueInfo:
        "This is a **vegetation index**, not a percentage and not a temperature. In this reading it ranges from 0 to 1: close to 0 means little observable greenery, close to 1 means more present and healthier vegetation.",
      legendTitle: "Vegetation",
      legend: ["little vegetation", "intermediate vegetation", "dense vegetation"],
    },
    albedo: {
      title: "More reflective and more absorbent surfaces",
      subtitle: "Useful for separating more reflective surfaces from those that absorb more heat",
      description:
        "Indicates how much surfaces reflect sunlight instead of absorbing it as heat. Dark surfaces tend to accumulate more heat; more reflective surfaces can help reduce it.",
      explanation:
        "The colour scale highlights differences in reflectance: small differences can help read roofs, paved areas and urban materials. Values outside the legend limits keep the colour of the corresponding endpoint.",
      details: [
        "Lower values indicate more absorbent surfaces; higher values more reflective surfaces.",
        "High albedo alone is not enough to solve heat: vegetation, ventilation, shade and materials all matter.",
      ],
      valueInfo:
        "Albedo is the **share of sunlight reflected** by the surface, not a temperature. A value of 0.20 means roughly 20% of light is reflected: lower values indicate more absorbent surfaces.",
      legend: ["absorbent", "intermediate", "reflective"],
    },
    hvi: {
      title: "Surface temperature and lack of vegetation",
      subtitle: "Helps show where additional greenery could make a bigger difference",
      description:
        "A deeper-reading layer: it combines surface temperature and lack of greenery. It is useful when you want to see where vegetation could have the greatest impact.",
      explanation:
        "Red means high temperature with little vegetation; blue means lower temperature and greener. It does not replace the overall heat exposure index: it explains one of its components.",
      details: [
        "Use it to read the relationship between surface temperature and vegetation.",
        "It is more useful for reasoning about mitigation priorities than for describing a temperature.",
      ],
      valueInfo:
        "This is a **comparative index**, not a measure in °C. Positive values indicate situations where high surface temperature and limited vegetation weigh more; negative values indicate conditions with lower temperatures or more vegetation.",
      legendTitle: "Temperature and vegetation",
      legend: ["low and green", "intermediate", "high and low vegetation"],
    },
    hri: {
      title: "Surface temperature and poorly reflective surfaces",
      subtitle: "Helps read the weight of roofs, pavements and materials that absorb heat",
      description:
        "A deeper-reading layer: it combines surface temperature and poorly reflective surfaces. It helps show where materials, roofs and pavements may contribute to heat.",
      explanation:
        "Red means high temperature with dark or absorbent surfaces; blue means lower temperature and more reflective. It does not replace the overall heat exposure index: it explains one of its components.",
      details: [
        "Use it to read the relationship between surface temperature and absorbent materials.",
        "It supports reasoning about pavements, roofs, paved areas and mineral surfaces.",
      ],
      valueInfo:
        "This is a **comparative index**, not a temperature. Positive values indicate high temperature associated with poorly reflective surfaces; negative values indicate lower temperatures or more reflective surfaces.",
      legendTitle: "Temperature and surfaces",
      legend: ["low temp., reflective", "intermediate", "high temp., absorbent"],
    },
  },
  deltaLayer: {
    title: "Difference between day and night",
    subtitle: "Where the surface temperature drops a lot at night and where it tends to stay high",
    description:
      "Shows how much temperature changes between day and night on the observed surface. A high value means the surface is much hotter by day than at night; a low value means it changes less.",
    explanation:
      "This map does not simply say where it is hottest. It helps read the daily behaviour of surfaces. The centre can cool around the average at night, but during the day it can absorb a lot of heat because it has many absorbent surfaces. Hills can show a lower difference because their temperature is already lower and they accumulate less heat to lose.",
    details: [
      "Provisional 2026 data: the MODIS composite starting on 29 August is not included.",
      "The grid is coarser than the Landsat layers: each cell represents a broad area of about 1 km.",
      "A low value should not automatically be read as a problem: it can indicate a place that stays warm, but also a place that does not heat up much during the day.",
    ],
    moreInfo: [
      "To read it well you need to keep two questions together: how much the area heats up during the day and how much it changes overnight.",
      "That is why this view should be read alongside the daytime heat maps and the physical drivers: vegetation, albedo and materials help explain why different areas behave differently.",
    ],
    inspectNote: ".",
    legendTitle: "Cooling",
    legend: ["little cooling", "medium", "strong cooling"],
    noDataLabel: "No data",
    noDataDescription:
      "There is no valid day-night difference value at this point, so the cell is shown as no data.",
  },
  districtMetrics: {
    uhei: {
      label: "Heat exposure",
      description: "Summary of overall heat exposure.",
      valueInfo:
        "It is the **mean synthetic index of the selected area**, not a temperature and not a direct measure of health risk. It summarizes three physical conditions: **surface temperature**, **vegetation presence** and **the ability of surfaces to reflect light**. The number has no unit: it is mainly used to compare selected areas with one another. Higher values indicate a less favorable combination; lower values do not mean there is no heat, only that average conditions are less critical.",
    },
    lst: {
      label: "Surface temperature",
      description: "Mean surface temperature.",
      valueInfo:
        "It is the **mean surface temperature** of the selected area, expressed in °C. It describes how much roofs, roads, paved areas and vegetation observed by satellite heat up.",
    },
    anomaly: {
      label: "Departure from normal",
      description: "How much 2026 differs from the area's usual behaviour.",
      valueInfo:
        "It is the **mean 2026 departure** from the usual behaviour of the same selected area. It is measured in °C because it compares two surface temperatures. A positive value means the area's temperature was above its usual pattern in 2026; a negative value means it was below the usual pattern. It does not say whether the area is hot in absolute terms: it says how much 2026 diverged from its own history.",
    },
    hotspotPercent: {
      label: "Surface with thermal anomaly",
      description: "Percentage of the area's surface with a thermal anomaly in the analysed year compared with the historical average.",
      valueInfo:
        "It is the **percentage of the selected area's surface** with a thermal anomaly in the analysed year compared with the historical average. It is not a temperature and it does not say how many people are exposed: it measures how much surface is involved. A high value means the phenomenon is widespread; a low value can indicate more localized anomalies.",
    },
  },
  rasterOverlays: {
    temporalHotspot: {
      title: "Exceptionally hot areas",
    },
  },
};

const englishTitlePatterns = {
  highlight: /^(Riga|surface|normal|changed|time|heat|city|districts|statistical|areas|summer)$/i,
  split: /(Riga|surface|normal|changed|time|heat|city|districts|statistical|areas|summer)/gi,
};

const latvianViews = [
  { id: "v1", title: "Kur virsma sakarst", subtitle: "Novērotais karstums" },
  { id: "v2", title: "Parastais un mainīgais", subtitle: "2013-2026 vēsture" },
  { id: "v3", title: "Kāpēc šeit sakarst", subtitle: "Fiziskie faktori" },
  { id: "v4", title: "Diena un nakts", subtitle: "Atdzišana" },
  { id: "v5", title: "Apkaimju tuvplāns", subtitle: "Teritoriju kopsavilkumi" },
];

const latvianViewCopy = {
  v1: {
    kicker: "Skats 1",
    title: "Kur Rīgas virsma vasarā sakarst visvairāk.",
    note: "Šīs kartes rāda satelīta novērotas virsmas vasaras mēnešos: ceļus, jumtus, bruģētas teritorijas un veģetāciju. Tās neatspoguļo gaisa temperatūru.",
  },
  v2: {
    kicker: "Skats 2",
    title: "Kas ir ierasts un kas laika gaitā ir mainījies.",
    note: "Šī sadaļa nošķir ierastos apstākļus, anomālijas un karstuma noturību 2013-2026 periodā.",
  },
  v3: {
    kicker: "Skats 3",
    title: "Kāpēc dažās vietās uzkrājas vairāk karstuma.",
    note: "Šī sadaļa skaidro karstuma uzkrāšanos ar fiziskiem faktoriem: apzaļumojumu, materiāliem un virsmu spēju atstarot gaismu.",
  },
  v4: {
    kicker: "Skats 4",
    title: "Kur pilsēta atdziest un kur tā saglabā karstumu.",
    note: "Dienas-nakts datu kopa aprēķināta 2026. gadam ar 1 km izšķirtspēju: tā ir piemērota pilsētas zonu, nevis atsevišķu ēku lasīšanai.",
  },
  v5: {
    kicker: "Skats 5",
    title: "Kopsavilkums Rīgas apkaimēm.",
    note: "Šis skats apkopo galvenos 2026. gada datus, lai salīdzinātu Rīgas apkaimes.",
  },
};

const latvianLayerOverrides = {
  view1Layers: {
    lst: {
      title: "Kur virsma sakarst visvairāk",
      subtitle: "Virsmas temperatūra izvēlētajā gadā",
      description:
        "Rāda izvēlētajā gadā novēroto virsmas temperatūru. Tā ir tieša nolasīšana: tā parāda, cik karsti vasaras satelītnovērojumos izskatās ceļi, jumti, bruģētas teritorijas un veģetācija.",
      explanation:
        "Izmantojiet šo slāni, lai saprastu, kur virsmas temperatūra absolūtā izteiksmē ir visaugstākā. Ceļš vai jumts var būt daudz karstāks nekā gaiss, ko cilvēki elpo.",
      details: [
        "Zilā un zaļā krāsa norāda vēsākas virsmas; oranžā un sarkanā - ļoti karstas virsmas.",
        "Ar salīdzināšanas slīdni šo karti var salīdzināt starp gadiem.",
        "Šeit tiek lasīta pati temperatūras vērtība, nevis attiecība pret pilsētas gada vidējo rādītāju.",
      ],
      legendTitle: "Virsmas temperatūra",
      legend: ["starp vēsākajām", "vēsāka", "vidēja", "karsta", "ļoti karsta", "starp karstākajām"],
      noDataLabel: "Nav datu",
      noDataDescription:
        "Šajā vietā satelīts izvēlētajā gadā nav ieguvis derīgus vasaras novērojumus, tāpēc karte nerāda vērtību.",
      method: "Vasaras mediānas LST, Landsat 8/9, 30 m izšķirtspēja.",
    },
    zspat: {
      title: "Teritorijas, kas atšķiras no pilsētas vidējā",
      subtitle: "Cik ļoti vieta atšķiras no pilsētas vidējā tajā pašā gadā",
      description:
        "Šī karte rāda, par cik punkta temperatūra ir virs vai zem Rīgas vidējās vērtības **tajā pašā gadā**. Tā nerāda absolūto virsmas temperatūras vērtību.",
      explanation:
        "Izmantojiet to, lai lasītu iekšējās atšķirības pilsētā: zilā krāsa ir zem pilsētas gada vidējā, balta tuvu vidējam, sarkana virs vidējā.",
      details: [
        "Dažādi gadi šeit netiek tieši salīdzināti: katrs gads ir pārrēķināts pret savu pilsētas vidējo rādītāju.",
        "Teritorija var būt sarkana arī neekstrēmā gadā, ja tā ir karstāka nekā pārējā pilsēta tajā gadā.",
        "Slīpsvītrotās zonas nozīmē, ka datu nav.",
      ],
      valueInfo:
        "Ieslēdzot vērtības, skaitlis nav temperatūra. Tas ir **standartizēts novirzes rādītājs**: 0 nozīmē tuvu pilsētas gada vidējam, pozitīvas vērtības - virs vidējā, negatīvas - zem vidējā.",
      legendTitle: "Salīdzinājumā ar pilsētu",
      legend: ["krietni zem vidējā", "zem vidējā", "vidēji", "virs vidējā", "krietni virs vidējā"],
      noDataLabel: "Nav datu",
      noDataDescription:
        "Šajā vietā satelīts izvēlētajā gadā nav ieguvis derīgus vasaras novērojumus, tāpēc karte nerāda vērtību.",
      method: "Telpiskais z-score katram gadam.",
    },
  },
  view2Layers: {
    anomaly: {
      title: "Cik ļoti 2026. gads atšķiras no ierastās temperatūras",
      subtitle: "Cik ļoti 2026. gads atšķiras no šīs vietas ierastās temperatūras",
      description:
        "Rāda, kur 2026. gads atšķīrās no 2013-2026 perioda ierastā modeļa. Tas neatbild uz jautājumu “kur ir karstākais?”, bet gan “kur 2026. gads bija **anomāls attiecībā pret pašas vietas vēsturi**?”.",
      explanation:
        "Zilā krāsa norāda vietas, kas ir vēsākas nekā ierasts, baltā - tuvu ierastajam, sarkanā - virs ierastā. Katrs punkts tiek salīdzināts ar savu vēsturi, nevis ar pārējo pilsētu.",
      details: [
        "Vieta, kas parasti ir karsta, var būt balta, ja 2026. gadā tā uzvedās ierasti.",
        "Vieta, kas absolūtā izteiksmē nav īpaši karsta, var kļūt sarkana, ja 2026. gadā tā pārsniedza savu vēsturi.",
      ],
      inspectNote: "Šeit vērtība norāda starpību starp 2026. gadu un tās pašas vietas ierasto uzvedību.",
      legendTitle: "Novirze no normas",
      legend: ["zem ierastā", "nedaudz zem", "normā", "nedaudz virs", "virs ierastā", "krietni virs"],
    },
    climatology: {
      title: "Ierastā temperatūra",
      subtitle: "Vēsturiskais vidējais 2013-2026: atsauce pārējo slāņu lasīšanai",
      description:
        "Rāda **vēsturisko vidējo** virsmas temperatūru 2013-2026 vasarās. Tā ir 2. skata atsauces karte, kas palīdz redzēt, kur vidējā virsmas temperatūra parasti ir augsta vai zema.",
      explanation:
        "Lasiet to kā virsmas ierasto uzvedību. Industriāla zona, liels stāvlaukums vai vēsturiskais centrs var būt karsts arī bez anomālijas.",
      details: [
        "Atšķirībā no 1. skata šeit nav viena izvēlēta gada, bet 14 vasaru vidējais.",
        "Tā palīdz nošķirt ierasto karstumu no anomāla karstuma.",
      ],
      legendTitle: "Vēsturiskais vidējais 2013-2026",
      legend: ["vēsturiski zemākā", "zema", "vidēja", "augsta", "ļoti augsta", "vēsturiski starp augstākajām"],
    },
    persistenceTemporal: {
      title: "Bieži anomālas teritorijas",
      subtitle: "Vietas, kas vairākus gadus sakarsa vairāk nekā ierasts",
      description:
        "Šī karte rāda, cik reižu teritorija bija **anomāla attiecībā pret savu vēsturi**. Tā nemeklē vietas, kas vienmēr ir karstas, bet vietas, kas atsevišķos gados kļūst karstākas nekā parasti.",
      explanation:
        "Teritorija var būt ļoti karsta un tomēr rādīt maz anomāliju, ja tā gandrīz katru gadu ir karsta līdzīgā veidā.",
      details: [
        "Skaitlis norāda, cik vasarās šis punkts bija anomāls salīdzinājumā ar sevi.",
        "Maz anomāliju automātiski nenozīmē zemu temperatūru; tas var nozīmēt stabilu, pastāvīgi augstu temperatūru.",
      ],
      legendTitle: "Anomāliju noturība",
      legend: ["0 gadi", "1 gads", "2 gadi", "3 gadi", "4 gadi", "5 gadi"],
      numericLegend: ["0", "1", "2", "3", "4", "5 gadi"],
    },
    persistenceStructural: {
      title: "Hroniski karstas teritorijas",
      subtitle: "Vietas, kas daudzos gados ierindojas starp pilsētas karstākajām virsmām",
      description:
        "Rāda, cik reižu katrs punkts ierindojās Rīgas **karstāko virsmas temperatūru augšējos 5 %**. “Hronisks” šeit nozīmē atkārtotu kritisku stāvokli pilsētvidē.",
      explanation:
        "Izmantojiet to, lai identificētu vietas, kurām bieži ir pilsētas augstākā virsmas temperatūra, pat ja tās nav anomālas attiecībā pret savu vēsturi.",
      details: [
        "Skaitlis var sasniegt 14, jo sērija aptver 14 vasaras no 2013. līdz 2026. gadam.",
        "Salīdziniet ar “Hronisks karstums un anomāls karstums”, lai saprastu, vai kritiskais stāvoklis ir stabils, atkārtots vai abi.",
      ],
      followUps: [
        { label: "Pāriet uz Veģetācijas klātbūtni", view: "v3", stateKey: "view3Layer", layer: "ndvi" },
        { label: "Pāriet uz Atstarojošām virsmām", view: "v3", stateKey: "view3Layer", layer: "albedo" },
      ],
      legendTitle: "Strukturālā noturība",
      legend: ["0 gadi", "1 gads", "2-4 gadi", "5-8 gadi", "9-12 gadi", "13-14 gadi"],
      numericLegend: ["0", "1", "2-4", "5-8", "9-12", "13-14 gadi"],
    },
    chronicVsAnomalous2025: {
      title: "Hronisks karstums un 2026. gada anomālijas",
      subtitle: "Nošķir ilgtermiņa kritiskās vietas no tām, kas izcēlās 2026. gadā",
      description:
        "Krusto vairāku gadu hronisko karstumu ar 2026. gada anomāliju. Tas palīdz nošķirt senas kritiskas teritorijas no jaunām parādībām pēdējā pieejamajā gadā.",
      explanation:
        "Oranžā krāsa norāda hronisku karstumu; violetā - 2026. gada anomāliju; tumšākā krāsa norāda abas situācijas vienā vietā.",
      legendTitle: "4 klases",
      legend: ["nav kritiska modeļa", "hronisks", "2026. gada anomālija", "hronisks un anomāls"],
    },
    structuralVsTemporal: {
      title: "Hronisks karstums un anomāls karstums",
      subtitle: "Nošķir vietas, kas vienmēr ir karstas, no tām, kas bieži ir anomālas",
      description:
        "Visam 2013-2026 periodam salīdzina, cik reižu teritorija bija **karstāko 5 % virsmu** grupā un cik reižu tā bija **anomāla attiecībā pret savu vēsturi**.",
      details: [
        "Oranžā krāsa pieaug līdz ar hroniskā karstuma gadiem.",
        "Violetā krāsa pieaug līdz ar anomālā karstuma gadiem.",
        "Kur abas situācijas sakrīt, krāsa ir jaukta un rāda gan strukturālu kritiskumu, gan atkārtotas anomālijas.",
      ],
      followUps: [
        { label: "Pāriet uz Veģetācijas klātbūtni", view: "v3", stateKey: "view3Layer", layer: "ndvi" },
        { label: "Pāriet uz Atstarojošām virsmām", view: "v3", stateKey: "view3Layer", layer: "albedo" },
      ],
      legendTitle: "Hroniska/anomāla intensitāte",
      legend: ["hronisks: 1-14 gadi", "anomāls: 1-5 gadi", "abi: jauktas krāsas"],
    },
  },
  view3Layers: {
    uhei: {
      title: "Kopējā karstuma ekspozīcija",
      subtitle: "Kur augsta virsmas temperatūra, maz veģetācijas un tumšas virsmas sakrīt",
      description:
        "Rāda, kur vienā vietā pārklājas trīs apstākļi: augstāka virsmas temperatūra, ierobežota veģetācija un virsmas, kas maz atstaro saules gaismu.",
      explanation:
        "Tas ir 3. skata vadošais slānis. Tas palīdz noteikt, kur vajadzīgas kombinētas intervences: ne tikai koki vai materiāli, bet vairāki faktori kopā.",
      legendTitle: "Karstuma ekspozīcija",
      legend: ["ļoti labvēlīga", "labvēlīga", "vidēja", "pakļauta", "ļoti pakļauta"],
    },
    ndvi: {
      title: "Veģetācijas klātbūtne",
      subtitle: "Palīdz redzēt, kur apzaļumošana var vairāk mazināt karstumu",
      description:
        "Rāda, kur veģetācija ir vairāk klātesoša: parkus, koku rindas, lauksaimniecības teritorijas un vietas, kur zaļums var palīdzēt mazināt karstumu.",
      explanation: "Bēša krāsa nozīmē maz novērojamas veģetācijas, tumši zaļa - blīvāku un veselīgāku veģetāciju.",
      legendTitle: "Veģetācija",
      legend: ["maz veģetācijas", "vidēja veģetācija", "blīva veģetācija"],
    },
    albedo: {
      title: "Atstarojošākas un absorbējošākas virsmas",
      subtitle: "Noder virsmu atstarošanas un siltuma absorbcijas atšķiršanai",
      description:
        "Norāda, cik lielā mērā virsmas atstaro saules gaismu, nevis absorbē to kā siltumu. Tumšas virsmas uzkrāj vairāk karstuma; atstarojošākas virsmas var to mazināt.",
      explanation:
        "Skala izmanto kvantiles, jo Rīgā albedo mainās salīdzinoši maz: nelielas atšķirības joprojām palīdz lasīt jumtus, segumus un pilsētas materiālus.",
      legend: ["absorbējoša", "vidēja", "atstarojoša"],
    },
    hvi: {
      title: "Virsmas temperatūra un veģetācijas trūkums",
      subtitle: "Rāda, kur papildu apzaļumošana varētu dot lielāku efektu",
      description:
        "Dziļākas lasīšanas slānis, kas apvieno virsmas temperatūru un veģetācijas trūkumu.",
      explanation:
        "Sarkans nozīmē augstu temperatūru ar maz veģetācijas; zils nozīmē zemāku temperatūru un vairāk zaļuma.",
      legendTitle: "Temperatūra un veģetācija",
      legend: ["zema un zaļa", "vidēja", "augsta un maz veģetācijas"],
    },
    hri: {
      title: "Virsmas temperatūra un vāji atstarojošas virsmas",
      subtitle: "Palīdz lasīt jumtu, segumu un materiālu ietekmi uz karstumu",
      description:
        "Dziļākas lasīšanas slānis, kas apvieno virsmas temperatūru un vāji atstarojošas virsmas.",
      explanation:
        "Sarkans nozīmē augstu temperatūru ar tumšām vai absorbējošām virsmām; zils - zemāku temperatūru un atstarojošākas virsmas.",
      legendTitle: "Temperatūra un virsmas",
      legend: ["zema temp., atstarojoša", "vidēja", "augsta temp., absorbējoša"],
    },
  },
  deltaLayer: {
    title: "Atšķirība starp dienu un nakti",
    subtitle: "Kur virsmas temperatūra naktī daudz krītas un kur tā saglabājas augsta",
    description:
      "Rāda, cik daudz temperatūra mainās starp dienu un nakti uz novērotās virsmas. Augsta vērtība nozīmē, ka virsma dienā ir daudz karstāka nekā naktī; zema vērtība nozīmē mazākas svārstības.",
    explanation:
      "Šī karte ne tikai parāda, kur ir karstākais. Tā palīdz lasīt virsmu diennakts uzvedību.",
    legendTitle: "Atdzišana",
    legend: ["maza atdzišana", "vidēja", "spēcīga atdzišana"],
    noDataLabel: "Nav datu",
    noDataDescription: "Šajā punktā nav derīgas dienas-nakts starpības vērtības.",
  },
  districtMetrics: {
    uhei: {
      label: "Karstuma ekspozīcija",
      description: "Kopējās karstuma ekspozīcijas kopsavilkums.",
    },
    lst: {
      label: "Virsmas temperatūra",
      description: "Vidējā virsmas temperatūra.",
    },
    anomaly: {
      label: "Novirze no normas",
      description: "Cik ļoti 2026. gads atšķiras no teritorijas ierastās uzvedības.",
    },
    hotspotPercent: {
      label: "Virsma ar termisku anomāliju",
      description: "Teritorijas virsmas procentuālā daļa ar termisku anomāliju analizētajā gadā salīdzinājumā ar vēsturisko vidējo.",
    },
  },
  rasterOverlays: {
    temporalHotspot: {
      title: "Īpaši karstas teritorijas",
    },
  },
};

const latvianTitlePatterns = {
  highlight: /^(Rīga|Rīgas|virsma|parastais|mainīgais|karstums|pilsēta|apkaimes|vasara)$/i,
  split: /(Rīga|Rīgas|virsma|parastais|mainīgais|karstums|pilsēta|apkaimes|vasara)/gi,
};

const localizedData = {
  lv: {
    views: latvianViews,
    viewCopy: latvianViewCopy,
    titlePatterns: latvianTitlePatterns,
    view2LayersWithoutValuesToggle,
    years,
    yearlyStats,
    view1Layers: localizeCollection(localizeCollection(italianView1Layers, englishLayerOverrides.view1Layers), latvianLayerOverrides.view1Layers),
    view2Layers: localizeCollection(localizeCollection(italianView2Layers, englishLayerOverrides.view2Layers), latvianLayerOverrides.view2Layers),
    view3Layers: localizeCollection(localizeCollection(italianView3Layers, englishLayerOverrides.view3Layers), latvianLayerOverrides.view3Layers),
    deltaLayer: mergeLocalized(mergeLocalized(italianDeltaLayer, englishLayerOverrides.deltaLayer), latvianLayerOverrides.deltaLayer),
    districtMetrics: localizeCollection(localizeCollection(italianDistrictMetrics, englishLayerOverrides.districtMetrics), latvianLayerOverrides.districtMetrics),
    districts,
    dataAvailability,
    rasterOverlays: localizeCollection(localizeCollection(italianRasterOverlays, englishLayerOverrides.rasterOverlays), latvianLayerOverrides.rasterOverlays),
  },
  it: {
    views: italianViews,
    viewCopy: italianViewCopy,
    titlePatterns: {
      highlight: italianTitleHighlightPattern,
      split: italianTitleSplitPattern,
    },
    view2LayersWithoutValuesToggle,
    years,
    yearlyStats,
    view1Layers: italianView1Layers,
    view2Layers: italianView2Layers,
    view3Layers: italianView3Layers,
    deltaLayer: italianDeltaLayer,
    districtMetrics: italianDistrictMetrics,
    districts,
    dataAvailability,
    rasterOverlays: italianRasterOverlays,
  },
  en: {
    views: englishViews,
    viewCopy: englishViewCopy,
    titlePatterns: englishTitlePatterns,
    view2LayersWithoutValuesToggle,
    years,
    yearlyStats,
    view1Layers: localizeCollection(italianView1Layers, englishLayerOverrides.view1Layers),
    view2Layers: localizeCollection(italianView2Layers, englishLayerOverrides.view2Layers),
    view3Layers: localizeCollection(italianView3Layers, englishLayerOverrides.view3Layers),
    deltaLayer: mergeLocalized(italianDeltaLayer, englishLayerOverrides.deltaLayer),
    districtMetrics: localizeCollection(italianDistrictMetrics, englishLayerOverrides.districtMetrics),
    districts,
    dataAvailability,
    rasterOverlays: localizeCollection(italianRasterOverlays, englishLayerOverrides.rasterOverlays),
  },
};

export function getLocalizedData(language) {
  return localizedData[normalizeLanguage(language)];
}
