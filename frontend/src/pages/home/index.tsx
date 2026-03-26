import { PageWithSidebar } from "@/layout/PageWithSidebar";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import { Box, Typography } from "@mui/material";

export function HomePage() {
  const { isSidebarVisible } = useSidebar();

  return (
    <PageWithSidebar
      showSidebar={isSidebarVisible}
      sidebarClassName="side-filter-panel"
      sidebar={
        <Box>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the navigation bar to open a data page with interactive filters.
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
          gap: 2,
        }}
      >
        <Typography variant="h4">Generation Interval</Typography>
        <Typography variant="body1" color="text.secondary">
          Select a visualization page from the top navigation to start exploring.
        </Typography>
      </Box>
    </PageWithSidebar>
  );
}
