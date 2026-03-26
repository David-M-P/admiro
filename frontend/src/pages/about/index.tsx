import { PageWithSidebar } from "@/layout/PageWithSidebar";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import { Box, Typography } from "@mui/material";

export function AboutPage() {
  const { isSidebarVisible } = useSidebar();

  return (
    <PageWithSidebar
      showSidebar={isSidebarVisible}
      sidebarClassName="side-filter-panel"
      sidebar={
        <Box>
          <Typography variant="h6" gutterBottom>
            About
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This section will include project context, data notes, and usage guidance.
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
        <Typography variant="h4">About This App</Typography>
        <Typography variant="body1" color="text.secondary">
          Page under construction. The layout now follows the same shell and spacing rules
          as the data pages.
        </Typography>
      </Box>
    </PageWithSidebar>
  );
}
