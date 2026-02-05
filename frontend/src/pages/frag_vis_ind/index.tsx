import {
  ancestries_noAll,
  chrms_all
} from "@/assets/sharedOptions";
import ChromosomeComponent from "@/pages/frag_vis_ind/components/ChromosomeComponent";
import SideFilter from "@/pages/frag_vis_ind/components/SideFilter";
import { DataPoint } from "@/pages/frag_vis_ind/static/fviStatic";
import PlotDownloadButton from "@/shared/PlotDownloadButton/PlotDownloadButton";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import { Grid } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";

interface FilterState {
  tree_lin: string[];
  chrms: string[];
  ancs: string[];
  mpp: number;
  chrms_limits: [number, number];
  min_length: number;
  color: string;
}
const API_BASE = import.meta.env.VITE_API_BASE_URL;


const defaultChrms = chrms_all.options; // Assuming chrms_all.options contains all chromosomes
const defaultAncs = ancestries_noAll.options; // Assuming ancestries_noAll.options contains all ancestries
const defaultColor = "Ancestry";
const defaultTreeLin = [
  "HGDP00535_unphased",
  "HGDP00536_unphased",
  "HGDP01149_unphased",
];

export const FragVisInd: React.FC = () => {
  const { isSidebarVisible } = useSidebar();
  const [filters, setFilters] = useState<FilterState>({
    tree_lin: defaultTreeLin,
    chrms: defaultChrms,
    ancs: defaultAncs,
    mpp: 0.5,
    chrms_limits: [0, 250000],
    min_length: 50,
    color: defaultColor,
  });
  const [data, setData] = useState<DataPoint[]>([]); // For holding the fetched data
  const [isFiltersApplied, setIsFiltersApplied] = useState(false); // To check if filters are applied
  const [loading, setLoading] = useState(false); // To handle loading state
  const plotRef = useRef<HTMLDivElement | null>(null);
  const applyFilters = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/fragvisind-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ind_list: filters.tree_lin
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch filtered data.");
      }

      const fetchedData = await response.json(); // JSON array directly
      setData(fetchedData); // Set directly since the structure is correct
      setIsFiltersApplied(true); // Allow rendering of components
    } catch (error) {
      console.error("Error:", error);
      setIsFiltersApplied(false); // Disable rendering on error
    } finally {
      setLoading(false); // Reset loading state
    }
    console.log("Filters applied:", data);
  };

  useEffect(() => {
    applyFilters(); // Fetch data when the component first renders
  }, []);

  return (
    <Grid container spacing={2} style={{ height: "100vh", overflow: "hidden" }}>
      {isSidebarVisible && (
        <Grid
          item
          xs={12}
          sm={4}
          md={3}
          lg={3}
          style={{
            height: "90vh",
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          <SideFilter
            filters={filters} // Pass the full filters object here
            setFilters={setFilters} // Pass the setFilters function
            applyFilters={applyFilters}
          />
        </Grid>
      )}

      <Grid
        item
        xs={12}
        sm={isSidebarVisible ? 8 : 12}
        md={isSidebarVisible ? 9 : 12}
        lg={isSidebarVisible ? 9 : 12}
        style={{ height: "100%", padding: "10px", display: "flex" }}
      >
        {loading && <div>Loading...</div>} {/* Show a loading indicator */}
        {!loading && isFiltersApplied && data.length > 0 && (
          <Grid
            item
            xs={12}
            className="plot-container"
            ref={plotRef}
            style={{
              width: "100%",
              height: "100%",
              flexGrow: 1,
              position: "relative",
            }} // Ensure the container is relatively positioned
          >
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
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                width: "10%",
              }}
            >
              <PlotDownloadButton plotRef={plotRef} fileName="plot" />
            </div>
          </Grid>
        )}
        {!loading && !isFiltersApplied && <div>No data to display yet.</div>}
      </Grid>
    </Grid>
  );
};
