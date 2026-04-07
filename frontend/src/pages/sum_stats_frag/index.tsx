import { PageWithSidebar } from "@/layout/PageWithSidebar";
import { apiUrl } from "@/lib/api-url";
import { decodeObjectRowsPayload } from "@/lib/compact-table";
import {
  buildSessionCacheKey,
  formatTransferMetrics,
  getFetchTransferMetrics,
  setSessionCacheValue,
} from "@/lib/request-observability";
import HistogramComponent from "@/pages/sum_stats_frag/components/HistogramComponent";
import IDDensityComponent from "@/pages/sum_stats_frag/components/IDDensityComponent";
import PointComponent from "@/pages/sum_stats_frag/components/PointComponent";
import SideFilter from "@/pages/sum_stats_frag/components/SideFilter";
import TDDensityComponent from "@/pages/sum_stats_frag/components/TDDensityComponent";
import ViolinComponent from "@/pages/sum_stats_frag/components/ViolinComponent";
import { INITIAL_SUMM_FRAG_FILTERS } from "@/pages/sum_stats_frag/config/defaultFilters";
import { createSummStatFragGridColumns } from "@/pages/sum_stats_frag/config/gridColumns";
import { applyBrowserDataFilters } from "@/pages/sum_stats_frag/domain/filtering";
import { normalizeFragmentRows, toDisplayRow } from "@/pages/sum_stats_frag/domain/data";
import type { FragmentDataPoint } from "@/pages/sum_stats_frag/domain/types";
import { mappingToLong } from "@/pages/sum_stats_frag/static/ssiStatic";
import PlotDownloadButton from "@/shared/PlotDownloadButton/PlotDownloadButton";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import type { SummStatFragFilterState } from "@/types/filter-state";
import DownloadIcon from "@mui/icons-material/Download";
import ImageIcon from "@mui/icons-material/Image";
import TocIcon from "@mui/icons-material/Toc";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { Box, Button, Checkbox, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import {
  AllCommunityModule,
  ClientSideRowModelModule,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  ModuleRegistry,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import {
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

ModuleRegistry.registerModules([AllCommunityModule]);

const FRAG_STATS_ENDPOINT = "/api/fragvisind-data";
const FRAG_STATS_SESSION_CACHE_MAX_ENTRIES = 40;
const FRAG_STATS_SESSION_CACHE = new Map<string, FragmentDataPoint[]>();

const normalizeSelectedIndividuals = (values: string[]) => Array.from(new Set(values)).sort();

const areSelectionsEqual = (left: string[], right: string[]) => {
  const leftNormalized = normalizeSelectedIndividuals(left);
  const rightNormalized = normalizeSelectedIndividuals(right);
  return leftNormalized.length === rightNormalized.length && leftNormalized.every((value, index) => value === rightNormalized[index]);
};

const collectLeafColumns = (defs: ColDef[]): ColDef[] => defs.filter((def) => typeof def.field === "string");

export function SummStatFrag() {
  const { isSidebarVisible } = useSidebar();
  const [viewTabValue, setViewTabValue] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState<SummStatFragFilterState>(INITIAL_SUMM_FRAG_FILTERS);
  const [fetchedRows, setFetchedRows] = useState<FragmentDataPoint[]>([]);
  const [lastAppliedIndividuals, setLastAppliedIndividuals] = useState<string[]>([]);
  const [isFiltersApplied, setIsFiltersApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  const plotRef = useRef<HTMLDivElement | null>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);

  const fetchIndividuals = useCallback(async (selectedIndividuals: string[]) => {
    const normalizedIndividuals = normalizeSelectedIndividuals(selectedIndividuals);

    setLoading(true);
    const t0 = performance.now();

    try {
      if (normalizedIndividuals.length === 0) {
        setFetchedRows([]);
        setLastAppliedIndividuals([]);
        setIsFiltersApplied(true);
        return;
      }

      const payload = { ind_list: normalizedIndividuals };
      const cacheKey = buildSessionCacheKey(FRAG_STATS_ENDPOINT, payload);
      const cachedRows = FRAG_STATS_SESSION_CACHE.get(cacheKey);
      if (cachedRows) {
        FRAG_STATS_SESSION_CACHE.delete(cacheKey);
        FRAG_STATS_SESSION_CACHE.set(cacheKey, cachedRows);
        const t1 = performance.now();
        console.log(
          `frag-stats fetch: 0.0 ms | json: 0.0 ms | total: ${(t1 - t0).toFixed(1)} ms | cache: HIT | transfer: skipped`,
        );
        setFetchedRows(cachedRows);
        setLastAppliedIndividuals(normalizedIndividuals);
        setIsFiltersApplied(true);
        return;
      }

      const requestUrl = apiUrl(FRAG_STATS_ENDPOINT);
      const tFetch0 = performance.now();
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const tFetch1 = performance.now();

      if (!response.ok) throw new Error("Failed to fetch filtered data.");

      const tJson0 = performance.now();
      const fetchedData = await response.json();
      const tJson1 = performance.now();

      const decodedRows = decodeObjectRowsPayload<Record<string, unknown>>(fetchedData);
      const rows = normalizeFragmentRows(decodedRows);
      const t1 = performance.now();
      const transferMetrics = getFetchTransferMetrics(response.url || requestUrl, tFetch0, tFetch1);

      console.log(
        `frag-stats fetch: ${(tFetch1 - tFetch0).toFixed(1)} ms | json: ${(tJson1 - tJson0).toFixed(1)} ms | total: ${(t1 - t0).toFixed(1)} ms | cache: MISS | ${formatTransferMetrics(transferMetrics)}`,
      );

      setSessionCacheValue(
        FRAG_STATS_SESSION_CACHE,
        cacheKey,
        rows,
        FRAG_STATS_SESSION_CACHE_MAX_ENTRIES,
      );

      setFetchedRows(rows);
      setLastAppliedIndividuals(normalizedIndividuals);
      setIsFiltersApplied(true);
    } catch (error) {
      console.error("Error:", error);
      setIsFiltersApplied(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(async () => {
    await fetchIndividuals(filters.tree_lin);
  }, [fetchIndividuals, filters.tree_lin]);

  useEffect(() => {
    void fetchIndividuals(INITIAL_SUMM_FRAG_FILTERS.tree_lin);
  }, [fetchIndividuals]);

  const browserFilteredRows = useMemo(
    () =>
      applyBrowserDataFilters({
        rows: fetchedRows,
        minimumPosteriorProbability: filters.mpp,
        ancestries: filters.ancs,
        chromosomes: filters.chrms,
      }),
    [fetchedRows, filters.ancs, filters.chrms, filters.mpp],
  );

  const csvRows = useMemo(() => browserFilteredRows.map(toDisplayRow), [browserFilteredRows]);

  const isApplyDirty = useMemo(
    () => !areSelectionsEqual(filters.tree_lin, lastAppliedIndividuals),
    [filters.tree_lin, lastAppliedIndividuals],
  );

  const handleDownloadCSV = () => {
    const csv = Papa.unparse(csvRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "fragment_summary_stats.csv");
  };

  const columns = useMemo(() => createSummStatFragGridColumns(mappingToLong as Record<string, string>), []);
  const selectableColumns = useMemo(() => collectLeafColumns(columns), [columns]);

  const syncColumnVisibility = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return;

    setColumnVisibility((previous) => {
      const next: Record<string, boolean> = {};
      let changed = false;

      for (const def of selectableColumns) {
        const colId = def.field;
        if (typeof colId !== "string") continue;
        const visible = api.getColumn(colId)?.isVisible() ?? false;
        next[colId] = visible;
        if (previous[colId] !== visible) changed = true;
      }

      if (Object.keys(previous).length !== Object.keys(next).length) changed = true;
      return changed ? next : previous;
    });
  }, [selectableColumns]);

  const openColMenu = (event: ReactMouseEvent<HTMLElement>) => {
    syncColumnVisibility();
    setColMenuAnchor(event.currentTarget);
  };
  const closeColMenu = () => setColMenuAnchor(null);

  const toggleColumn = (colId: string) => {
    const api = gridApiRef.current;
    if (!api) return;

    const col = api.getColumn(colId);
    const currentlyVisible = col?.isVisible() ?? false;
    api.setColumnsVisible([colId], !currentlyVisible);
    setColumnVisibility((previous) => ({
      ...previous,
      [colId]: !currentlyVisible,
    }));
  };

  const isColumnVisible = (colId: string) =>
    columnVisibility[colId] ?? (gridApiRef.current?.getColumn(colId)?.isVisible() ?? false);

  type PlotKey = Exclude<SummStatFragFilterState["plot"], "">;
  const plotRenderers: Record<PlotKey, JSX.Element> = {
    Histogram: (
      <HistogramComponent
        data={browserFilteredRows}
        phases={[]}
        tree_lin={lastAppliedIndividuals}
        var_1={filters.var_1}
        ancs={filters.ancs}
        chroms={filters.chrms}
        regs={[]}
        col={filters.col}
        fac_x={filters.fac_x}
        fac_y={filters.fac_y}
        mea_med_1={filters.mea_med_1}
        n_bins={filters.n_bins}
        y_axis={filters.y_axis}
        min_y_axis={filters.min_y_axis}
        max_y_axis={filters.max_y_axis}
        x_axis={filters.x_axis}
        min_x_axis={filters.min_x_axis}
        max_x_axis={filters.max_x_axis}
        isSidebarVisible={isSidebarVisible}
      />
    ),
    Violin: (
      <ViolinComponent
        data={browserFilteredRows}
        phases={[]}
        tree_lin={lastAppliedIndividuals}
        var_1={filters.var_1}
        ancs={filters.ancs}
        chroms={filters.chrms}
        regs={[]}
        col={filters.col}
        fac_x={filters.fac_x}
        mea_med_1={filters.mea_med_1}
        bandwidth_divisor={filters.bandwidth_divisor}
        y_axis={filters.y_axis}
        min_y_axis={filters.min_y_axis}
        max_y_axis={filters.max_y_axis}
        isSidebarVisible={isSidebarVisible}
      />
    ),
    Density: (
      <IDDensityComponent
        data={browserFilteredRows}
        phases={[]}
        tree_lin={lastAppliedIndividuals}
        var_1={filters.var_1}
        ancs={filters.ancs}
        chroms={filters.chrms}
        regs={[]}
        col={filters.col}
        fac_x={filters.fac_x}
        fac_y={filters.fac_y}
        mea_med_1={filters.mea_med_1}
        bandwidth_divisor={filters.bandwidth_divisor}
        x_axis={filters.x_axis}
        min_x_axis={filters.min_x_axis}
        max_x_axis={filters.max_x_axis}
        y_axis={filters.y_axis}
        min_y_axis={filters.min_y_axis}
        max_y_axis={filters.max_y_axis}
        isSidebarVisible={isSidebarVisible}
      />
    ),
    Points: (
      <PointComponent
        data={browserFilteredRows}
        tree_lin={lastAppliedIndividuals}
        var_x={filters.var_2_1}
        var_y={filters.var_2_2}
        col={filters.col}
        ancs={filters.ancs}
        chroms={filters.chrms}
        regs={[]}
        fac_x={filters.fac_x}
        fac_y={filters.fac_y}
        mea_med_x={filters.mea_med_x}
        mea_med_y={filters.mea_med_y}
        x_axis={filters.x_axis}
        min_x_axis={filters.min_x_axis}
        max_x_axis={filters.max_x_axis}
        y_axis={filters.y_axis}
        min_y_axis={filters.min_y_axis}
        max_y_axis={filters.max_y_axis}
        isSidebarVisible={isSidebarVisible}
      />
    ),
    "2D Density": (
      <TDDensityComponent
        data={browserFilteredRows}
        phases={[]}
        tree_lin={lastAppliedIndividuals}
        var_x={filters.var_2_1}
        var_y={filters.var_2_2}
        col={filters.col}
        ancs={filters.ancs}
        chroms={filters.chrms}
        regs={[]}
        fac_x={filters.fac_x}
        fac_y={filters.fac_y}
        mea_med_x={filters.mea_med_x}
        mea_med_y={filters.mea_med_y}
        bandwidth_divisor={filters.bandwidth_divisor}
        x_axis={filters.x_axis}
        min_x_axis={filters.min_x_axis}
        max_x_axis={filters.max_x_axis}
        y_axis={filters.y_axis}
        min_y_axis={filters.min_y_axis}
        max_y_axis={filters.max_y_axis}
        isSidebarVisible={isSidebarVisible}
        thresholds={filters.thresholds}
      />
    ),
  };

  const plotContent = filters.plot
    ? plotRenderers[filters.plot as PlotKey]
    : <Typography>Select a plot type to begin.</Typography>;

  const plotEmptyMessage =
    lastAppliedIndividuals.length === 0
      ? "Select at least one individual and click Apply Filters."
      : browserFilteredRows.length === 0
        ? "No data to display for the selected browser filters."
        : null;

  return (
    <PageWithSidebar
      showSidebar={isSidebarVisible}
      sidebarClassName="side-filter-panel"
      sidebar={
        <SideFilter
          tabValue={tabValue}
          setTabValue={setTabValue}
          filters={filters}
          setFilters={setFilters}
          applyFilters={applyFilters}
          isApplyDirty={isApplyDirty}
          loading={loading}
        />
      }
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        {loading && <div>Loading...</div>}
        {!loading && !isFiltersApplied && <div>No data to display yet.</div>}

        {viewTabValue === 0 && !loading && isFiltersApplied && (
          <Box className="plot-panel" ref={plotRef}>
            {plotEmptyMessage ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "text.secondary",
                  textAlign: "center",
                  px: 3,
                }}
              >
                <Typography>{plotEmptyMessage}</Typography>
              </Box>
            ) : (
              plotContent
            )}

            <div className="plot-action-bar">
              <PlotDownloadButton plotRef={plotRef} fileName="fragment_summary_stats_plot" />
              <Button
                onClick={() => setViewTabValue(1)}
                variant="contained"
                color="primary"
                sx={{
                  width: "35px",
                  height: "35px",
                  minWidth: "35px",
                  borderRadius: "8px",
                  padding: 0,
                }}
              >
                <TocIcon sx={{ color: "#FFFFFF" }} />
              </Button>
            </div>
          </Box>
        )}

        {viewTabValue === 1 && !loading && isFiltersApplied && (
          <Box className="plot-panel">
            <div className="ag-theme-alpine" style={{ width: "100%", height: "100%" }}>
              <AgGridReact
                onGridReady={(params: GridReadyEvent) => {
                  gridApiRef.current = params.api;
                  syncColumnVisibility();
                }}
                onColumnVisible={syncColumnVisibility}
                pagination={true}
                paginationAutoPageSize={true}
                columnDefs={columns}
                rowData={browserFilteredRows}
                modules={[ClientSideRowModelModule]}
                paginationPageSizeSelector={false}
              />
            </div>

            <div className="plot-action-bar">
              <Button
                onClick={handleDownloadCSV}
                variant="contained"
                color="primary"
                sx={{
                  width: "35px",
                  height: "35px",
                  minWidth: "35px",
                  borderRadius: "8px",
                  padding: 0,
                }}
              >
                <DownloadIcon sx={{ color: "#FFFFFF" }} />
              </Button>
              <Button
                onClick={() => setViewTabValue(0)}
                variant="contained"
                color="primary"
                sx={{
                  width: "35px",
                  height: "35px",
                  minWidth: "35px",
                  borderRadius: "8px",
                  padding: 0,
                }}
              >
                <ImageIcon sx={{ color: "#FFFFFF" }} />
              </Button>
              <Button
                onClick={openColMenu}
                variant="contained"
                color="primary"
                sx={{
                  width: "35px",
                  height: "35px",
                  minWidth: "35px",
                  borderRadius: "8px",
                  padding: 0,
                }}
              >
                <ViewColumnIcon sx={{ color: "#FFFFFF" }} />
              </Button>

              <Menu
                anchorEl={colMenuAnchor}
                open={Boolean(colMenuAnchor)}
                onClose={closeColMenu}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "bottom", horizontal: "right" }}
              >
                {selectableColumns.map((def) => {
                  const id = def.field;
                  if (typeof id !== "string") return null;
                  return (
                    <MenuItem key={id} onClick={() => toggleColumn(id)}>
                      <Checkbox checked={isColumnVisible(id)} />
                      <ListItemText primary={def.headerName ?? id} />
                    </MenuItem>
                  );
                })}
              </Menu>
            </div>
          </Box>
        )}
      </Box>
    </PageWithSidebar>
  );
}
