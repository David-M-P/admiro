import DownloadIcon from "@mui/icons-material/Download";
import { Button, Menu, MenuItem, useTheme } from "@mui/material";
import { saveAs } from "file-saver";
import React, { useState } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";
const INSTITUTION_FONT_NAME = "InstitutionFont";
const MIN_EXPORT_SCALE = 2;
let cachedEmbeddedFontDataUrl: string | null | undefined;

// Define props for the component
interface PlotDownloadButtonProps {
  plotRef: React.RefObject<HTMLDivElement | null>;
  fileName?: string; // Optional file name for the download
}

const PlotDownloadButton = ({
  plotRef,
  fileName = "plot",
}: PlotDownloadButtonProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme(); // Access the theme

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (background: "transparent" | "white") => {
    setAnchorEl(null);
    void handleDownloadPlot(background); // Pass the selected background option
  };

  const waitForCustomFont = async () => {
    if (!("fonts" in document)) return;

    try {
      await document.fonts.load(`12px ${INSTITUTION_FONT_NAME}`);
      await document.fonts.ready;
    } catch {
      // If font loading fails, continue with available fonts.
    }
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Failed to convert font blob to data URL."));
      };
      reader.onerror = () => reject(reader.error ?? new Error("FileReader error."));
      reader.readAsDataURL(blob);
    });

  const getEmbeddedFontDataUrl = async () => {
    if (cachedEmbeddedFontDataUrl !== undefined) return cachedEmbeddedFontDataUrl;

    try {
      const response = await fetch("/fonts/au_passata.woff2", { cache: "force-cache" });
      if (!response.ok) {
        cachedEmbeddedFontDataUrl = null;
        return cachedEmbeddedFontDataUrl;
      }

      const fontBlob = await response.blob();
      cachedEmbeddedFontDataUrl = await blobToDataUrl(fontBlob);
      return cachedEmbeddedFontDataUrl;
    } catch {
      cachedEmbeddedFontDataUrl = null;
      return cachedEmbeddedFontDataUrl;
    }
  };

  const createExportSvg = (
    svgElement: SVGSVGElement,
    embeddedFontDataUrl: string | null,
  ) => {
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    const { width, height } = svgElement.getBoundingClientRect();
    const exportWidth = Math.max(1, Math.round(width));
    const exportHeight = Math.max(1, Math.round(height));
    const fontSource = embeddedFontDataUrl
      ? `url('${embeddedFontDataUrl}') format('woff2')`
      : `url('${window.location.origin}/fonts/au_passata.woff2') format('woff2'),
         url('${window.location.origin}/fonts/au_passata.woff') format('woff')`;

    const style = document.createElementNS(SVG_NS, "style");
    style.textContent = `
      @font-face {
        font-family: '${INSTITUTION_FONT_NAME}';
        src: ${fontSource};
        font-weight: normal;
        font-style: normal;
      }
      svg, text, tspan {
        font-family: '${INSTITUTION_FONT_NAME}', sans-serif !important;
      }
    `;

    const defs = document.createElementNS(SVG_NS, "defs");
    defs.appendChild(style);
    clonedSvg.insertBefore(defs, clonedSvg.firstChild);

    clonedSvg.setAttribute("xmlns", SVG_NS);
    clonedSvg.setAttribute("width", String(exportWidth));
    clonedSvg.setAttribute("height", String(exportHeight));

    if (!clonedSvg.getAttribute("viewBox")) {
      clonedSvg.setAttribute("viewBox", `0 0 ${exportWidth} ${exportHeight}`);
    }

    return { clonedSvg, exportWidth, exportHeight };
  };

  const handleDownloadPlot = async (background: "transparent" | "white") => {
    const svgElement = plotRef.current?.querySelector("svg"); // Get the SVG element
    if (!svgElement) return;

    await waitForCustomFont();
    const embeddedFontDataUrl = await getEmbeddedFontDataUrl();

    const { clonedSvg, exportWidth, exportHeight } = createExportSvg(
      svgElement,
      embeddedFontDataUrl,
    );

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg); // Serialize SVG to string
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob); // Create URL from the SVG blob

    const img = new Image();
    img.onload = () => {
      const pixelRatio = Math.max(window.devicePixelRatio || 1, MIN_EXPORT_SCALE);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(exportWidth * pixelRatio);
      canvas.height = Math.round(exportHeight * pixelRatio);
      canvas.style.width = `${exportWidth}px`;
      canvas.style.height = `${exportHeight}px`;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.scale(pixelRatio, pixelRatio);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Add background color if white is chosen
        if (background === "white") {
          ctx.fillStyle = "#FFFFFF"; // Set background to white
          ctx.fillRect(0, 0, exportWidth, exportHeight);
        }

        ctx.drawImage(img, 0, 0); // Draw the SVG image onto the canvas

        canvas.toBlob((blob) => {
          if (blob) {
            saveAs(blob, `${fileName}.png`); // Save as PNG using file-saver
          }
          URL.revokeObjectURL(url); // Clean up the URL object
        }, "image/png");
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
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
