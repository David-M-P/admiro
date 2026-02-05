import DownloadIcon from "@mui/icons-material/Download";
import { Button, Menu, MenuItem, useTheme } from "@mui/material";
import { saveAs } from "file-saver";
import React, { useState } from "react";

// Define props for the component
interface PlotDownloadButtonProps {
  plotRef: React.RefObject<HTMLDivElement>; // A reference to the plot container
  fileName?: string; // Optional file name for the download
}

const PlotDownloadButton: React.FC<PlotDownloadButtonProps> = ({
  plotRef,
  fileName = "plot",
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme(); // Access the theme

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (background: "transparent" | "white") => {
    setAnchorEl(null);
    handleDownloadPlot(background); // Pass the selected background option
  };

  const handleDownloadPlot = (background: "transparent" | "white") => {
    const svgElement = plotRef.current?.querySelector("svg"); // Get the SVG element
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement); // Serialize SVG to string
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob); // Create URL from the SVG blob

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgElement.clientWidth;
      canvas.height = svgElement.clientHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Add background color if white is chosen
        if (background === "white") {
          ctx.fillStyle = "#FFFFFF"; // Set background to white
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0); // Draw the SVG image onto the canvas

        canvas.toBlob((blob) => {
          if (blob) {
            saveAs(blob, `${fileName}.png`); // Save as PNG using file-saver
          }
          URL.revokeObjectURL(url); // Clean up the URL object
        });
      }
    };

    img.src = url; // Set image source to the URL
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Button
        aria-controls="simple-menu"
        aria-haspopup="true"
        onClick={handleClick}
        variant="contained"
        color="primary"
        style={{
          width: "35px",
          height: "35px",
          minWidth: "35px",
          borderRadius: "8px",
          padding: 0,
          backgroundColor: theme.palette.primary.main, // Use theme color
        }}
      >
        <DownloadIcon style={{ color: "#FFFFFF" }} />
      </Button>
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleClose("transparent")}>
          Transparent Background
        </MenuItem>
        <MenuItem onClick={() => handleClose("white")}>
          White Background
        </MenuItem>
      </Menu>
    </div>
  );
};

export default PlotDownloadButton;
