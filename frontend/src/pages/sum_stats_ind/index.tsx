import { PageWithSidebar } from "@/layout/PageWithSidebar";
import HistogramComponent from "@/pages/sum_stats_ind/components/HistogramComponent";
import IDDensityComponent from "@/pages/sum_stats_ind/components/IDDensityComponent";
import MemoizedMapComponent from "@/pages/sum_stats_ind/components/MapComponent";
import PointComponent from "@/pages/sum_stats_ind/components/PointComponent";
import SideFilter from "@/pages/sum_stats_ind/components/SideFilter";
import TDDensityComponent from "@/pages/sum_stats_ind/components/TDDensityComponent";
import ViolinComponent from "@/pages/sum_stats_ind/components/ViolinComponent";
import { INITIAL_SUMM_FILTERS } from "@/pages/sum_stats_ind/config/defaultFilters";
import { createSummStatGridColumns } from "@/pages/sum_stats_ind/config/gridColumns";
import { mapping } from "@/pages/sum_stats_ind/static/mapping";
import { mappingToLong } from "@/pages/sum_stats_ind/static/ssiStatic";
import PlotDownloadButton from "@/shared/PlotDownloadButton/PlotDownloadButton";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import { SummStatFilterState } from "@/types/filter-state";
import { DataPoint } from "@/types/sum_stat_ind_datapoint";
import DownloadIcon from "@mui/icons-material/Download";
import ImageIcon from "@mui/icons-material/Image";
import TocIcon from "@mui/icons-material/Toc";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { Box, Button, Checkbox, ListItemText, Menu, MenuItem } from "@mui/material";
import {
  AllCommunityModule,
  ClientSideRowModelModule,
  ColDef,
  ColGroupDef,
  GridApi,
  GridReadyEvent,
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
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const apiUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
};

const collectLeafColumns = (defs: (ColDef | ColGroupDef)[]): ColDef[] => {
  const result: ColDef[] = [];

  const visit = (def: ColDef | ColGroupDef) => {
    const group = def as ColGroupDef;
    if (Array.isArray(group.children)) {
      group.children.forEach((child) => visit(child as ColDef | ColGroupDef));
      return;
    }
    result.push(def as ColDef);
  };

  defs.forEach(visit);
  return result;
};

export function SummStatInd() {
  const [viewTabValue, setViewTabValue] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const { isSidebarVisible } = useSidebar();

  const [filters, setFilters] = useState<SummStatFilterState>(INITIAL_SUMM_FILTERS);


  const mapArray = (vals: string[], map: Record<string, string>) =>
    vals.map((v) => map[v] ?? v);
  function columnsToRows(cols: Record<string, unknown>) {
    // only use array-valued keys
    const keys = Object.keys(cols).filter((k) => Array.isArray(cols[k]));
    const n = keys.length ? (cols[keys[0]] as unknown[]).length : 0;

    return Array.from({ length: n }, (_, i) => {
      const row: Record<string, unknown> = {};
      for (const k of keys) {
        row[k] = (cols[k] as unknown[])[i];
      }
      return row;
    });
  }
  const [data, setData] = useState<DataPoint[]>([]); // For holding the fetched data
  const [isFiltersApplied, setIsFiltersApplied] = useState(false); // To check if filters are applied
  const [loading, setLoading] = useState(false); // To handle loading state
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  useEffect(() => {
    if (filters.plot) {
      applyFilters();
    }
  }, [filters.plot]);
  const applyFilters = async () => {
    setLoading(true);

    const t0 = performance.now();

    try {
      // ✅ only map OUTGOING values to short
      const payload = {
        phases: mapArray(filters.phases, mapping.values.phase_state.toShort),
        mpp: Math.round(filters.mpp_1 * 100),

        // When you use these in the request, map them too:
        // reg_1: mapArray(filters.reg_1, mapping.values.reg.toShort),
        // ancs_1: mapArray(filters.ancs_1, mapping.values.anc.toShort),
        // chrms_1: mapArray(filters.chrms_1, mapping.values.chrom.toShort),
      };

      const tFetch0 = performance.now();
      const response = await fetch(apiUrl("/api/summ-stats-ind-data"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const tFetch1 = performance.now();

      if (!response.ok) throw new Error("Failed to fetch filtered data.");

      const tJson0 = performance.now();
      const fetchedData = await response.json();
      const tJson1 = performance.now();

      // ✅ response stays short. handle both row-array and columnar-object formats
      const rows = Array.isArray(fetchedData)
        ? fetchedData
        : columnsToRows(fetchedData);

      const t1 = performance.now();

      console.log(
        `summ-stats fetch: ${(tFetch1 - tFetch0).toFixed(1)} ms | json: ${(tJson1 - tJson0).toFixed(1)} ms | total: ${(t1 - t0).toFixed(1)} ms`
      );

      // ✅ store short-keyed rows
      setData(rows as DataPoint[]); // or better: define a SummStatsRow type
      setIsFiltersApplied(true);
    } catch (error) {
      console.error("Error:", error);
      setIsFiltersApplied(false);
    } finally {
      setMapRefreshKey((k) => k + 1);
      setLoading(false);
    }
  };


  // Function to download data as CSV
  const handleDownloadCSV = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "data.csv");
  };

  // Inside your component
  const plotRef = useRef<HTMLDivElement | null>(null);
  const handleOpenDataOverview = () => {
    setViewTabValue(1); // Set tab to Data Overview view
  };
  const handleOpenPlot = () => {
    setViewTabValue(0); // Set tab to Visualization view
  };

  const columns = useMemo(
    () =>
      createSummStatGridColumns(mappingToLong as Record<string, string>) as (
        | ColDef
        | ColGroupDef
      )[],
    [],
  );
  const selectableColumns = useMemo(
    () =>
      collectLeafColumns(columns).filter(
        (def): def is ColDef & { field: string } => typeof def.field === "string",
      ),
    [columns],
  );
  // keep a ref to the grid API
  const gridApiRef = useRef<GridApi | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  // for controlling the columns‑menu popover
  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);

  const syncColumnVisibility = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return;

    setColumnVisibility((previous) => {
      const next: Record<string, boolean> = {};
      let changed = false;

      for (const def of selectableColumns) {
        const colId = def.field;
        const visible = api.getColumn(colId)?.isVisible() ?? false;
        next[colId] = visible;
        if (previous[colId] !== visible) changed = true;
      }

      if (Object.keys(previous).length !== Object.keys(next).length) changed = true;
      return changed ? next : previous;
    });
  }, [selectableColumns]);

  // open/close handlers
  const openColMenu = (e: ReactMouseEvent<HTMLElement>) => {
    syncColumnVisibility();
    setColMenuAnchor(e.currentTarget);
  };
  const closeColMenu = () => setColMenuAnchor(null);

  // toggle visibility helper
  const toggleColumn = (colId: string) => {
    const api = gridApiRef.current;
    if (!api) return;

    // get the Column object
    const col = api.getColumn(colId);
    const currentlyVisible = col?.isVisible() ?? false;

    // flip it
    api.setColumnsVisible([colId], !currentlyVisible);
    setColumnVisibility((previous) => ({
      ...previous,
      [colId]: !currentlyVisible,
    }));
  };

  const isColumnVisible = (colId: string) =>
    columnVisibility[colId] ?? (gridApiRef.current?.getColumn(colId)?.isVisible() ?? false);

  type PlotKey = Exclude<SummStatFilterState["plot"], "">;
  const plotRenderers: Record<PlotKey, JSX.Element> = {
    Histogram: (
      <HistogramComponent
        data={data}
        phases={filters.phases}
        tree_lin={filters.tree_lin}
        var_1={filters.var_1}
        ancs={filters.ancs_1}
        chroms={filters.chrms_1}
        regs={filters.reg_1}
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
        data={data}
        phases={filters.phases}
        tree_lin={filters.tree_lin}
        var_1={filters.var_1}
        ancs={filters.ancs_1}
        chroms={filters.chrms_1}
        regs={filters.reg_1}
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
    Points: (
      <PointComponent
        data={data}
        tree_lin={filters.tree_lin}
        var_x={filters.var_2_1}
        var_y={filters.var_2_2}
        col={filters.col}
        ancs={filters.ancs_1}
        chroms={filters.chrms_1}
        regs={filters.reg_1}
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
        data={data}
        phases={filters.phases}
        tree_lin={filters.tree_lin}
        var_x={filters.var_2_1}
        var_y={filters.var_2_2}
        col={filters.col}
        ancs={filters.ancs_1}
        chroms={filters.chrms_1}
        regs={filters.reg_1}
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
    Density: (
      <IDDensityComponent
        data={data}
        phases={filters.phases}
        tree_lin={filters.tree_lin}
        var_1={filters.var_1}
        ancs={filters.ancs_1}
        chroms={filters.chrms_1}
        regs={filters.reg_1}
        col={filters.col}
        fac_x={filters.fac_x}
        fac_y={filters.fac_y}
        mea_med_1={filters.mea_med_1}
        y_axis={filters.y_axis}
        min_y_axis={filters.min_y_axis}
        max_y_axis={filters.max_y_axis}
        x_axis={filters.x_axis}
        min_x_axis={filters.min_x_axis}
        max_x_axis={filters.max_x_axis}
        isSidebarVisible={isSidebarVisible}
        bandwidth_divisor={filters.bandwidth_divisor}
      />
    ),
    Map: (
      <div className="map-container" style={{ zIndex: 0 }}>
        <MemoizedMapComponent
          key={mapRefreshKey}
          data={data}
          tree_lin={filters.tree_lin}
          var_1={filters.var_1}
          ancs={filters.ancs_1}
          chroms={filters.chrms_1}
          regs={filters.reg_1}
          map_data={filters.map_data}
          map_data_rad={filters.map_data_rad}
          map_reg={filters.map_reg}
          map_reg_rad={filters.map_reg_rad}
          map_pop={filters.map_pop}
          map_pop_rad={filters.map_pop_rad}
          map_ind_rad={filters.map_ind_rad}
          map_lat_jit={filters.map_lat_jit}
          map_lon_jit={filters.map_lon_jit}
        />
      </div>
    ),
  };

  const plotContent = filters.plot
    ? plotRenderers[filters.plot as PlotKey]
    : <div>No plot type selected</div>;

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
        {viewTabValue === 0 && !loading && isFiltersApplied && (
          <Box className="plot-panel" ref={plotRef}>
            {plotContent}

            <div className="plot-action-bar">
              <PlotDownloadButton plotRef={plotRef} fileName="plot" />
              <Button
                onClick={handleOpenDataOverview}
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
                rowData={data}
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
                onClick={handleOpenPlot}
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

                  return (
                    <MenuItem key={id} dense onClick={() => toggleColumn(id)}>
                      <Checkbox checked={isColumnVisible(id)} size="small" />
                      <ListItemText primary={def.headerName} />
                    </MenuItem>
                  );
                })}
              </Menu>
            </div>
          </Box>
        )}
        {!loading && !isFiltersApplied && <div>No data to display yet.</div>}
      </Box>
    </PageWithSidebar>
  );
}
