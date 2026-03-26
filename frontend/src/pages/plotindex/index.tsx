import { PageWithSidebar } from "@/layout/PageWithSidebar";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import { Box, Typography } from "@mui/material";

export function PlotIndex() {
  const { isSidebarVisible } = useSidebar();

  return (
    <PageWithSidebar
      showSidebar={isSidebarVisible}
      sidebarClassName="side-filter-panel"
      sidebar={
        <Box>
          <Typography variant="h6" gutterBottom>
            Plot Index Filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This page can host global plot index controls in a future iteration.
          </Typography>
        </Box>
      }
    >
      <Box className="page-panel">
        <Typography variant="h5">Plot Index</Typography>
      </Box>
    </PageWithSidebar>
  );
}
