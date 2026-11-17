import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../../i18n/useI18n.js";
import { buildPaginationItems } from "../../utils/pagination.js";

const APKAIME_PAGE_SIZE = 10;

// Sortable ranking table used in View 5. Riga has 58 apkaimes — paginated.

export function DistrictTable({ sorted, metricKey, selectedId, aggregation, onSelect }) {
  const { data, language } = useI18n();
  const metric = data.districtMetrics[metricKey];
  const showHotspotColumn = metricKey !== "hotspotPercent";
  const [pageIndex, setPageIndex] = useState(0);

  const pageSize = APKAIME_PAGE_SIZE;
  const pageCount = Math.ceil(sorted.length / pageSize);
  // Guard against the page index pointing past the new last page after the data shrinks.
  const safePageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const pageStart = safePageIndex * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, sorted.length);
  const visibleRows = sorted.slice(pageStart, pageEnd);
  const paginationItems = buildPaginationItems(safePageIndex, pageCount);
  const copy = language !== "it"
    ? {
      kicker: "Ranking",
      apkaimeComparison: "Apkaime comparison",
      showing: `Showing ${pageStart + 1}-${pageEnd} of ${sorted.length} apkaimes`,
      apkaime: "Apkaime",
      hotspot: "Surface with thermal anomaly",
      paginationAria: "Apkaime pagination",
      previousPage: "Previous page",
      nextPage: "Next page",
      page: (index) => `Page ${index + 1}`,
    }
    : {
      kicker: "Ranking",
      apkaimeComparison: "Confronto apkaimes",
      showing: `Mostrate ${pageStart + 1}-${pageEnd} di ${sorted.length} apkaimes`,
      apkaime: "Apkaime",
      hotspot: "Superficie con anomalia termica",
      paginationAria: "Paginazione apkaimes",
      previousPage: "Pagina precedente",
      nextPage: "Pagina successiva",
      page: (index) => `Pagina ${index + 1}`,
    };

  // Reset to page 1 when the metric changes: the previous row order no longer reflects the new ranking.
  useEffect(() => {
    setPageIndex(0);
  }, [metricKey]);

  // When the selected entity is on another page (e.g. user picked it on the map), jump to it.
  useEffect(() => {
    if (!selectedId) return;
    const selectedIndex = sorted.findIndex((district) => district.id === selectedId);
    if (selectedIndex >= 0) setPageIndex(Math.floor(selectedIndex / pageSize));
  }, [pageSize, selectedId, sorted]);

  return (
    <section className="table-card">
      <div className="analysis-head">
        <div>
          <span className="section-kicker">{copy.kicker}</span>
          <h2>{copy.apkaimeComparison}</h2>
        </div>
      </div>
      <div className="table-toolbar">
        <span>{copy.showing}</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{copy.apkaime}</th>
              <th>{data.districtMetrics[metricKey].label}</th>
              {showHotspotColumn && <th>{copy.hotspot}</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((district, index) => (
              <tr
                key={district.id}
                className={district.id === selectedId ? "active" : ""}
                onClick={() => onSelect(district.id)}
              >
                <td>{pageStart + index + 1}</td>
                <td>{district.name}</td>
                <td>{district[metricKey]}{metric.unit}</td>
                {showHotspotColumn && <td>{district.hotspotPercent}%</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="table-pagination" aria-label={copy.paginationAria}>
          <button
            type="button"
            className="pagination-arrow"
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            disabled={safePageIndex === 0}
            aria-label={copy.previousPage}
          >
            <ChevronLeft size={16} />
          </button>
          {paginationItems.map((item) =>
            item.type === "ellipsis" ? (
              <span key={item.key} className="pagination-ellipsis">...</span>
            ) : (
              <button
                key={item.index}
                type="button"
                className={item.index === safePageIndex ? "active" : ""}
                aria-current={item.index === safePageIndex ? "page" : undefined}
                aria-label={copy.page(item.index)}
                onClick={() => setPageIndex(item.index)}
              >
                {item.index + 1}
              </button>
            ),
          )}
          <button
            type="button"
            className="pagination-arrow"
            onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
            disabled={safePageIndex >= pageCount - 1}
            aria-label={copy.nextPage}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

