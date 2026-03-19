import { ancestries_noAll, chrms_all } from "@/assets/sharedOptions";
import { PageWithSidebar } from "@/layout/PageWithSidebar";
import ChromosomeComponent from "@/pages/frag_vis_ind/components/ChromosomeComponent";
import SideFilter from "@/pages/frag_vis_ind/components/SideFilter";
import { DataPoint } from "@/pages/frag_vis_ind/static/fviStatic";
import PlotDownloadButton from "@/shared/PlotDownloadButton/PlotDownloadButton";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import { FragVisFilterState } from "@/types/filter-state";
import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const defaultChrms = chrms_all.options;
const defaultAncs = ancestries_noAll.options;
const defaultColor = "Ancestry";
const defaultTreeLin = [
  "HGDP00535_unphased",
  "HGDP00536_unphased",
  "HGDP01149_unphased",
];

export function FragVisInd() {
  const { isSidebarVisible } = useSidebar();
  const [filters, setFilters] = useState<FragVisFilterState>({
    tree_lin: defaultTreeLin,
    chrms: defaultChrms,
    ancs: defaultAncs,
    mpp: 0.5,
    chrms_limits: [0, 250000],
    min_length: 50,
    color: defaultColor,
  });
  const [data, setData] = useState<DataPoint[]>([]);
  const [isFiltersApplied, setIsFiltersApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const plotRef = useRef<HTMLDivElement | null>(null);

  const applyFilters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/fragvisind-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ind_list: filters.tree_lin,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch filtered data.");
      }

      const fetchedData = await response.json();
      setData(fetchedData);
      setIsFiltersApplied(true);
    } catch (error) {
      console.error("Error:", error);
      setIsFiltersApplied(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, []);

  return (
    <PageWithSidebar
      showSidebar={isSidebarVisible}
      sidebarClassName="side-filter-panel"
      sidebar={
        <SideFilter
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
        {!loading && isFiltersApplied && data.length > 0 && (
          <Box className="plot-panel" ref={plotRef}>
            <ChromosomeComponent
              data={data}
              isSidebarVisible={isSidebarVisible}
              lin={filters.tree_lin}
              chrms={filters.chrms}
              ancs={filters.ancs}
              mpp={filters.mpp}
              chrms_limits={filters.chrms_limits}
              min_length={filters.min_length}
              color={filters.color}
            />
            <div className="plot-action-bar">
              <PlotDownloadButton plotRef={plotRef} fileName="plot" />
            </div>
          </Box>
        )}
        {!loading && !isFiltersApplied && <div>No data to display yet.</div>}
      </Box>
    </PageWithSidebar>
  );
}
