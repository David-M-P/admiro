import { paths } from "@/paths";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import TuneIcon from "@mui/icons-material/Tune";
import { AppBar, Box, Button, IconButton, Toolbar, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Home", path: paths.home },
  { label: "Individual Summary Stats", path: paths.summary_stats.per_ind },
  { label: "Fragment Summary Stats", path: paths.summary_stats.per_frag },
  { label: "Individual Fragment Viewer", path: paths.fragment.vis_per_ind },
  { label: "Region Fragment Viewer", path: paths.fragment.vis_per_reg },
  { label: "About", path: paths.others.about },
];

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarVisible, toggleSidebar } = useSidebar();

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: "primary.main",
        height: "var(--app-nav-height)",
        justifyContent: "center",
      }}
    >
      <Toolbar
        sx={{
          minHeight: "var(--app-nav-height) !important",
          gap: 2,
          px: 2,
        }}
      >
        <Typography
          sx={{
            color: "primary.contrastText",
            fontWeight: "bold",
            fontSize: "1.1rem",
            whiteSpace: "nowrap",
          }}
        >
          Generation Interval
        </Typography>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            overflowX: "auto",
            overflowY: "hidden",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                variant={isActive ? "contained" : "text"}
                size="small"
                sx={{
                  whiteSpace: "nowrap",
                  textTransform: "none",
                  minWidth: "fit-content",
                  color: "primary.contrastText",
                  backgroundColor: isActive ? "rgba(255, 255, 255, 0.22)" : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.18)",
                  },
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>

        <IconButton
          onClick={toggleSidebar}
          aria-label="toggle filters sidebar"
          sx={{
            color: "primary.contrastText",
            backgroundColor: isSidebarVisible
              ? "rgba(255, 255, 255, 0.2)"
              : "transparent",
            borderRadius: 1,
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.28)",
            },
          }}
        >
          <TuneIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
