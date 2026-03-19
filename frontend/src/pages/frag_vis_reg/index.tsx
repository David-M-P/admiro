import { PageWithSidebar } from "@/layout/PageWithSidebar";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import { Box, Typography } from "@mui/material";

export function FragVisReg() {
  const { isSidebarVisible } = useSidebar();

  return (
    <PageWithSidebar
      showSidebar={isSidebarVisible}
      sidebarClassName="side-filter-panel"
      sidebar={
        <Box>
          <Typography variant="h6" gutterBottom>
            Region Filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Placeholder for region-level fragment filter controls.
          </Typography>
        </Box>
      }
    >
      <Box
        className="page-panel"
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Typography variant="h5">Region Fragment Viewer</Typography>
        <Typography variant="body1" color="text.secondary">
          Not implemented yet on the new data.
        </Typography>
      </Box>
    </PageWithSidebar>
  );
}
