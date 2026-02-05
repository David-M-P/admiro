import { paths } from "@/paths";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import {
  AppBar,
  Box,
  Button,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import React, { useRef, useState } from "react";

export const NavBar: React.FC = () => {
  const { isSidebarVisible, toggleSidebar } = useSidebar();
  const handleNavigation = (url: string) => {
    window.location.href = url; // Navigate to the specified URL
  };

  // State variables for menus
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuType, setMenuType] = useState<string>("");

  // Reference to the Popper's Paper component
  const popperRef = useRef<HTMLDivElement>(null);

  // Handlers for opening menus
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    menu: string
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuType(menu);
  };

  const handleMenuClose = (event: React.MouseEvent<HTMLElement>) => {
    if (
      anchorEl &&
      (anchorEl.contains(event.relatedTarget as Node) ||
        (popperRef.current &&
          popperRef.current.contains(event.relatedTarget as Node)))
    ) {
      // The mouse is moving to the anchor or the Popper, don't close
      return;
    }
    setAnchorEl(null);
    setMenuType("");
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: "10dvh",
        minHeight: "70.85px", // Set Box height explicitly
      }}
    >
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "primary.main",
          height: "7dvh", // Explicitly set AppBar height to match Box
          minHeight: "70.85px",
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          <Typography
            sx={{
              color: "primary.contrastText",
              fontWeight: "bold",
              fontSize: "1.2rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginRight: "auto", // Push to the right
            }}
          >
            Generation Interval
          </Typography>

          {/* Middle Stack */}
          <Stack
            direction="row"
            spacing={0}
            sx={{
              position: "absolute",
              flexGrow: 1,
              left: "50%",
              transform: "translateX(-50%)", // Center horizontally
              alignItems: "center",
              width: "50dvw",
              height: "100%",
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexGrow: 1,
                height: '100%',
              }}
            >
              <Box
                sx={{
                  borderLeft: "1px solid white",
                  height: "100%", // Ensure full height for the separator
                  alignSelf: "center", // Vertically center the separator
                }}
              />
              <Button
                sx={{
                  flexGrow: 1,
                  color: 'primary.contrastText',
                  height: '100%',
                  lineHeight: 'normal',
                  textTransform: 'none', fontSize: "1.05rem",
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
                onClick={() => handleNavigation(paths.summary_stats.per_ind)}
              >
                Individual Summary Stats
              </Button>


              <Box
                sx={{
                  borderLeft: "1px solid white",
                  height: "100%", // Ensure full height for the separator
                  alignSelf: "center", // Vertically center the separator
                }}
              />
              <Button
                sx={{
                  flexGrow: 1,
                  color: 'primary.contrastText',
                  height: '100%',
                  lineHeight: 'normal',
                  textTransform: 'none', fontSize: "1.05rem",
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
                onClick={() => handleNavigation(paths.summary_stats.per_frag)}
              >
                Fragment Summary Stats
              </Button>
              <Box
                sx={{
                  borderLeft: "1px solid white",
                  height: "100%", // Ensure full height for the separator
                  alignSelf: "center", // Vertically center the separator
                }}
              />
              <Button
                sx={{
                  flexGrow: 1,
                  color: 'primary.contrastText',
                  height: '100%',
                  lineHeight: 'normal',
                  textTransform: 'none', fontSize: "1.05rem",
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
                onClick={() => handleNavigation(paths.fragment.vis_per_ind)}
              >
                Individual Fragment Viewer
              </Button>
              <Box
                sx={{
                  borderLeft: "1px solid white",
                  height: "100%", // Ensure full height for the separator
                  alignSelf: "center", // Vertically center the separator
                }}
              />
              <Button
                sx={{
                  flexGrow: 1,
                  color: 'primary.contrastText',
                  height: '100%',
                  lineHeight: 'normal',
                  textTransform: 'none', fontSize: "1.05rem",
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
                onClick={() => handleNavigation(paths.fragment.vis_per_reg)}
              >
                Region Fragment Viewer
              </Button>
            </Box>

            {/* Separator */}
            <Box
              sx={{
                borderLeft: "1px solid white",
                height: "100%", // Ensure full height for the separator
                alignSelf: "center", // Vertically center the separator
              }}
            />

          </Stack>


        </Toolbar>
      </AppBar>
    </Box>
  );
};
