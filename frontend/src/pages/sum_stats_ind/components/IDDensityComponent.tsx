import { buildColorScale } from "@/pages/sum_stats_ind/domain/colorScale";
import {
  applyAdaptiveXAxisTickRotation,
  getAdaptiveLinearAxisTickCount,
} from "@/pages/sum_stats_ind/domain/axis";
import { toLongValue, toShortCol } from "@/pages/sum_stats_ind/domain/columns";
import { extentWithBuffer, keyFromCols } from "@/pages/sum_stats_ind/domain/data";
import { buildFacetGroups } from "@/pages/sum_stats_ind/domain/faceting";
import { applyCommonDataFilters } from "@/pages/sum_stats_ind/domain/filtering";
import { usePlotContainerSize } from "@/pages/sum_stats_ind/hooks/usePlotContainerSize";
import { kernelDensityEstimator, kernelEpanechnikov } from "@/pages/sum_stats_ind/static/densityUtils";
import { DataPoint } from "@/types/sum_stat_ind_datapoint";
import * as d3 from "d3";
import React, { useCallback, useEffect, useRef } from "react";




type IDDensityPlotProps = {
  data: DataPoint[];
  phases: string[];
  tree_lin: string[];
  var_1: string;
  ancs: string[];
  chroms: string[];
  regs: string[];
  col: string[];
  fac_x: string[];
  fac_y: string[];
  mea_med_1: boolean;
  bandwidth_divisor: number;
  x_axis: string;
  min_x_axis: number;
  max_x_axis: number;
  y_axis: string;
  min_y_axis: number;
  max_y_axis: number;
  isSidebarVisible: boolean;
};

const createColorScale = (
  data: DataPoint[],
  col: string[],
  var_1: string
): {
  getColor: (d: DataPoint) => string;
  getColorFromKey: (key: string) => string;
  legendData: { label: string; color: string; extent?: [number, number] }[];
  discreteOrContinuous: string;
  globalColorOrder: string[];
} => {
  return buildColorScale({
    rows: data,
    colorColumns: col,
    sortMetricColumn: var_1,
    emptyGroupKey: "__all__",
    defaultOrderValue: "__all__",
  });
};



const drawIDDensity = (
  facetGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: DataPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  y_axis: string,
  min_y_axis: number,
  max_y_axis: number,
  bandwidth_divisor: number,
  plotHeight: number,
  plotWidth: number,
  var_1: string,
  col: string[],
  getColor: (d: DataPoint) => string,
  getColorFromKey: (key: string) => string,
  discreteOrContinuous: string,
  globalColorOrder: string[],
  showMeanMedian: boolean,
  title: string,
  x_label: string,
  containerSel: d3.Selection<HTMLElement, unknown, null, undefined>,
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
  meaMedTooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
  colorLabel?: (key: string) => string
) => {

  const varXShort = toShortCol(var_1);
  const labelOf = colorLabel ?? ((k: string) => k);
  const colShort = col.map(toShortCol);
  const colorKey = keyFromCols(colShort);

  const colorGroups = d3.group(data, (d) => (colorKey(d) || "__missing__"));

  // Decide the domain for the x-scale externally (already set).
  // We'll sample across that domain for the density function:
  const sampleX = xScale.ticks(100); // number of points along x

  // For setting yScale, we need to compute all densities and find the max
  let maxDensity = 0;
  const densitiesPerGroup: Map<string, [number, number][]> = new Map();
  // 1) Compute extent of your variable
  const extent = d3.extent(data, (d) => d[varXShort as keyof DataPoint] as number);
  // extent is [number | undefined, number | undefined]

  if (extent[0] == null || extent[1] == null) {
    console.log(`Skipping drawIDDensity for facet "${title}", no valid extent found.`);
    return; // <-- just return here instead of throwing
  }

  let orderedKeys: string[] = [];
  if (discreteOrContinuous === "discrete" && globalColorOrder.length) {
    const present = new Set(colorGroups.keys());
    orderedKeys = globalColorOrder.filter((k) => present.has(k));
    // append unexpected keys at the end
    for (const k of colorGroups.keys()) if (!globalColorOrder.includes(k)) orderedKeys.push(k);
  } else {
    orderedKeys = Array.from(colorGroups.keys());
  }

  const [minValue, maxValue] = extent;

  const bandwidth = (maxValue - minValue) / bandwidth_divisor;
  colorGroups.forEach((groupData, colorKey) => {
    const values = groupData.map((d) => d[varXShort as keyof DataPoint] as number);
    const estimator = kernelDensityEstimator(kernelEpanechnikov(bandwidth), sampleX);
    const density = estimator(values).map(d => [d[0], d[1]] as [number, number]);
    densitiesPerGroup.set(colorKey, density);
    const localMax = d3.max(density, (d) => d[1]) || 0;
    if (localMax > maxDensity) maxDensity = localMax;
  });
  // Now set yScale domain according to y-axis rules
  if (y_axis === "Define Range") {
    yScale.domain([min_y_axis, max_y_axis]).range([plotHeight, 0]);
  } else if (y_axis === "Free Axis") {
    yScale.domain([0, maxDensity * 1.05]).range([plotHeight, 0]);
  } else {
    throw new Error("Only 'Define Range' or 'Free Axis' are shown here for density.");
  }
  // Draw axes
  const xAxisGroup = facetGroup
    .append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(xScale));
  const xTicksRotated = applyAdaptiveXAxisTickRotation(xAxisGroup, plotWidth);
  const yTickCount = getAdaptiveLinearAxisTickCount(plotHeight);
  facetGroup
    .append("g")
    .call(d3.axisLeft(yScale).ticks(yTickCount).tickFormat(d3.format(".1e")));

  // X label
  facetGroup
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + (xTicksRotated ? 56 : 35))
    .attr("text-anchor", "middle")
    .text(x_label);

  // Y label
  facetGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Density");

  // Plot title
  facetGroup
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .text(title);

  // Render one density curve per color group, overlaid
  densitiesPerGroup.forEach((density, colorKey) => {
    // Create the area under the density curvegetColorFromKey: (key: string) => string

    const areaGenerator = d3
      .area<[number, number]>()
      .x((d) => xScale(d[0]))
      .y0(yScale(0)) // Base of the area (y=0)
      .y1((d) => yScale(d[1])); // Top of the area (density)


    const fill = getColorFromKey(colorKey);
    const fillWithOpacity =
      d3.color(fill)?.copy({ opacity: 0.1 }).toString() ?? "rgba(0,0,255,0.1)";

    facetGroup
      .append("path")
      .datum(density)
      .attr("fill", fillWithOpacity)
      .attr("d", areaGenerator);

    facetGroup
      .append("path")
      .datum(density)
      .attr("fill", "none")
      .attr("stroke", fill)
      .attr("stroke-width", 2)
      .attr(
        "d",
        d3
          .line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(d[1]))
      );
  });

  // Mean/Median lines if desired
  if (showMeanMedian) {
    colorGroups.forEach((groupData, groupKey) => {
      const container = d3.select("#plot-container");
      const tooltip = container.append("div").attr("class", "tooltip");

      const mean =
        d3.mean(groupData, (d) => d[varXShort as keyof DataPoint] as number) ?? 0;

      const median =
        d3.median(groupData, (d) => d[varXShort as keyof DataPoint] as number) ?? 0;

      const densityForGroup = densitiesPerGroup.get(groupKey);
      if (!densityForGroup) return;

      const getDensityAtValue = (
        density: [number, number][],
        xValue: number
      ): number => {
        const closest = density.reduce((prev, curr) =>
          Math.abs(curr[0] - xValue) < Math.abs(prev[0] - xValue) ? curr : prev
        );
        return closest[1];
      };

      const densityAtMean = getDensityAtValue(densityForGroup, mean);
      const densityAtMedian = getDensityAtValue(densityForGroup, median);

      const strokeColor =
        d3.color(getColorFromKey(groupKey))?.darker(0.7).formatHex() ?? "#000";

      // Mean line
      facetGroup
        .append("line")
        .attr("x1", xScale(mean))
        .attr("x2", xScale(mean))
        .attr("y1", yScale(0))
        .attr("y2", yScale(densityAtMean))
        .attr("stroke", strokeColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4")
        .on("mouseenter", () => {
          tooltip.style("opacity", 1);
          tooltip.html(
            `<strong>Group:</strong> ${labelOf(groupKey)}<br/><strong>Mean:</strong> ${mean.toFixed(2)}`
          );
        })
        .on("mousemove", (event) => {
          const [mouseX, mouseY] = d3.pointer(event, container.node() as HTMLElement);
          tooltip.style("left", `${mouseX + 10}px`).style("top", `${mouseY - 28}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));

      // Median line
      facetGroup
        .append("line")
        .attr("x1", xScale(median))
        .attr("x2", xScale(median))
        .attr("y1", yScale(0))
        .attr("y2", yScale(densityAtMedian))
        .attr("stroke", strokeColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "2,4")
        .on("mouseenter", () => {
          tooltip.style("opacity", 1);
          tooltip.html(
            `<strong>Group:</strong> ${labelOf(groupKey)}<br/><strong>Median:</strong> ${median.toFixed(2)}`
          );
        })
        .on("mousemove", (event) => {
          const [mouseX, mouseY] = d3.pointer(event, container.node() as HTMLElement);
          tooltip.style("left", `${mouseX + 10}px`).style("top", `${mouseY - 28}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));
    });
  }
};

const fullDensity = (
  svgElement: SVGSVGElement,
  data: DataPoint[],
  phases: string[],
  tree_lin: string[],
  var_1: string,
  ancs: string[],
  chroms: string[],
  regs: string[],
  col: string[],
  fac_x: string[],
  fac_y: string[],
  mea_med_1: boolean,
  bandwidth_divisor: number,
  x_axis: string,
  min_x_axis: number,
  max_x_axis: number,
  y_axis: string,
  min_y_axis: number,
  max_y_axis: number,
) => {
  const containerSel = d3.select(svgElement.parentElement as HTMLElement);

  containerSel.selectAll("div.tooltip").remove();
  const tooltip = containerSel.append("div").attr("class", "tooltip");
  const meaMedTooltip = containerSel.append("div").attr("class", "tooltip");

  data = applyCommonDataFilters({
    rows: data,
    treeLin: tree_lin,
    ancestries: ancs,
    regions: regs,
    chromosomes: chroms,
    ancestryRequiredColumns: [var_1, ...col],
    finiteColumns: [var_1],
  });
  const var1Short = toShortCol(var_1);

  d3.select(svgElement).selectAll("*").remove();
  const container = svgElement.parentElement;

  const margin = { top: 50, right: 30, bottom: 80, left: 75 };
  const width = container ? container.clientWidth : 960;
  const height = container ? container.clientHeight : 600;

  const { getColor, getColorFromKey, legendData, discreteOrContinuous, globalColorOrder } =
    createColorScale(data, col, var_1);

  const facetsX = buildFacetGroups(data, fac_x);
  const facetsY = buildFacetGroups(data, fac_y);

  const facetingRequiredX = facetsX.length > 1;
  const facetingRequiredY = facetsY.length > 1;
  const numCols = facetingRequiredX ? facetsX.length : 1;
  const numRows = facetingRequiredY ? facetsY.length : 1;


  const colPadding = 60;
  const rowPadding = 70;

  const plotWidth =
    numCols === 1
      ? width - margin.right - margin.left - colPadding
      : (width - margin.right - margin.left) / numCols - colPadding;
  const plotHeight =
    numRows === 1
      ? height - margin.bottom - margin.top - rowPadding
      : (height - margin.bottom - margin.top) / numRows - rowPadding;

  const globalXDomain: [number, number] | null =
    x_axis === "Define Range"
      ? [min_x_axis, max_x_axis]
      : x_axis === "Shared Axis"
        ? extentWithBuffer(data, var1Short, 0.05)
        : null; // Free Axis -> per facet

  const svg = d3
    .select(svgElement)
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(0,0)`);

  const xScale = d3.scaleLinear().range([0, plotWidth]);

  const yScale = d3.scaleLinear().range([plotHeight, 0]);

  // Discrete legend
  const padding = 30;
  let cumulativeWidth = 0;
  const legend = svg.append("g").attr(
    "transform",
    `translate(${margin.left + colPadding / 2}, ${height - rowPadding / 1.5})` // Start legend at the leftmost point of the container
  );

  // Create legend items dynamically
  legendData.forEach((d) => {
    // Append rectangle for the color box
    legend
      .append("rect")
      .attr("x", cumulativeWidth)
      .attr("y", 0)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", d.color);

    // Append text label
    const text = legend
      .append("text")
      .attr("x", cumulativeWidth + 24) // Position text next to the rectangle
      .attr("y", 9) // Center text vertically with the rectangle
      .attr("dy", ".35em")
      .text(d.label);

    const textNode = text.node();
    if (textNode) {
      const textWidth = textNode.getBBox().width;
      cumulativeWidth += 18 + textWidth + padding; // Update cumulative width with rectangle, text, and padding
    }
  });
  if (facetingRequiredX && facetingRequiredY) {
    // Apply faceting on both fac_x and fac_y
    facetsX.forEach((gx, i) => {
      const setX = new Set(gx.points);
      facetsY.forEach((gy, j) => {
        const facetData = gy.points.filter((d) => setX.has(d));
        const facetGroup = svg
          .append("g")
          .attr(
            "transform",
            `translate(${margin.left +
            (i * plotWidth +
              i * (colPadding / 2) +
              (i + 1) * (colPadding / 2))
            },${margin.top +
            j * plotHeight +
            j * (rowPadding / 2) +
            (j + 1) * (rowPadding / 2)
            })`
          );
        const title = `${gx.title} / ${gy.title}`;
        const x_label = var_1

        if (x_axis === "Define Range") {
          xScale.domain([min_x_axis, max_x_axis]).range([0, plotWidth]);
        } else if (x_axis === "Shared Axis") {
          const domain =
            globalXDomain ?? extentWithBuffer(data, var1Short, 0.05);
          xScale.domain(domain).range([0, plotWidth]);
        } else if (x_axis === "Free Axis") {
          const domain = extentWithBuffer(facetData, var1Short, 0.05)
          xScale.domain(domain).range([0, plotWidth]);
        }
        const colShort = col.map(toShortCol);
        const colorLabel =
          colShort.length === 1 ? (k: string) => toLongValue(colShort[0], k) : (k: string) => k;

        drawIDDensity(
          facetGroup,
          facetData,
          xScale,
          yScale,
          y_axis,
          min_y_axis,
          max_y_axis,
          bandwidth_divisor,
          plotHeight,
          plotWidth,
          var_1,
          col,
          getColor,
          getColorFromKey,
          discreteOrContinuous,
          globalColorOrder,
          mea_med_1,
          title,
          x_label,
          containerSel,
          tooltip,
          meaMedTooltip,
          colorLabel
        );
      });
    });
  } else if (facetingRequiredX) {
    // Apply faceting on fac_x only
    facetsX.forEach((gx, i) => {
      const facetData = gx.points;
      const j = 0;

      // Append a group for each facet
      const facetGroup = svg
        .append("g")
        .attr(
          "transform",
          `translate(${margin.left +
          (i * plotWidth +
            i * (colPadding / 2) +
            (i + 1) * (colPadding / 2))
          },${margin.top +
          j * plotHeight +
          j * (rowPadding / 2) +
          (j + 1) * (rowPadding / 2)
          })`
        );
      const title = `${gx.title}`;
      const x_label = var_1
      if (x_axis === "Define Range") {
        xScale.domain([min_x_axis, max_x_axis]).range([0, plotWidth]);
      } else if (x_axis === "Shared Axis") {
        const domain =
          globalXDomain ?? extentWithBuffer(data, var1Short, 0.05);
        xScale.domain(domain).range([0, plotWidth]);
      } else if (x_axis === "Free Axis") {
        const domain = extentWithBuffer(facetData, var1Short, 0.05)
        xScale.domain(domain).range([0, plotWidth]);
      }
      const colShort = col.map(toShortCol);
      const colorLabel =
        colShort.length === 1 ? (k: string) => toLongValue(colShort[0], k) : (k: string) => k;

      drawIDDensity(
        facetGroup,
        facetData,
        xScale,
        yScale,
        y_axis,
        min_y_axis,
        max_y_axis,
        bandwidth_divisor,
        plotHeight,
        plotWidth,
        var_1,
        col,
        getColor,
        getColorFromKey,
        discreteOrContinuous,
        globalColorOrder,
        mea_med_1,
        title,
        x_label,
        containerSel,
        tooltip,
        meaMedTooltip,
        colorLabel
      );
    });
  }
  else if (facetingRequiredY) {
    // Apply faceting on fac_y only
    facetsY.forEach((gy, j) => {
      const facetData = gy.points;
      const i = 0;

      // Append a group for each facet
      const facetGroup = svg
        .append("g")
        .attr(
          "transform",
          `translate(${margin.left +
          (i * plotWidth +
            i * (colPadding / 2) +
            (i + 1) * (colPadding / 2))
          },${margin.top +
          j * plotHeight +
          j * (rowPadding / 2) +
          (j + 1) * (rowPadding / 2)
          })`
        );

      const title = `${gy.title}`;
      const x_label = var_1
      if (x_axis === "Define Range") {
        xScale.domain([min_x_axis, max_x_axis]).range([0, plotWidth]);
      } else if (x_axis === "Shared Axis") {
        const domain =
          globalXDomain ?? extentWithBuffer(data, var1Short, 0.05);
        xScale.domain(domain).range([0, plotWidth]);
      } else if (x_axis === "Free Axis") {
        const domain = extentWithBuffer(facetData, var1Short, 0.05)
        xScale.domain(domain).range([0, plotWidth]);
      }
      const colShort = col.map(toShortCol);
      const colorLabel =
        colShort.length === 1 ? (k: string) => toLongValue(colShort[0], k) : (k: string) => k;
      drawIDDensity(
        facetGroup,
        facetData,
        xScale,
        yScale,
        y_axis,
        min_y_axis,
        max_y_axis,
        bandwidth_divisor,
        plotHeight,
        plotWidth,
        var_1,
        col,
        getColor,
        getColorFromKey,
        discreteOrContinuous,
        globalColorOrder,
        mea_med_1,
        title,
        x_label,
        containerSel,
        tooltip,
        meaMedTooltip,
        colorLabel
      );
    });
  }
  else {
    const i = 0;
    const j = 0;

    // Append a group for each facet
    const facetGroup = svg
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left +
        (i * plotWidth +
          i * (colPadding / 2) +
          (i + 1) * (colPadding / 2))
        },${margin.top +
        j * plotHeight +
        j * (rowPadding / 2) +
        (j + 1) * (rowPadding / 2)
        })`
      );
    const title = ``;
    const x_label = var_1
    if (x_axis === "Define Range") {
      xScale.domain([min_x_axis, max_x_axis]).range([0, plotWidth]);
    } else if (x_axis === "Shared Axis") {
      const domain =
        globalXDomain ?? extentWithBuffer(data, var1Short, 0.05);
      xScale.domain(domain).range([0, plotWidth]);
    } else if (x_axis === "Free Axis") {
      const domain = extentWithBuffer(data, var1Short, 0.05)
      xScale.domain(domain).range([0, plotWidth]);
    }
    const colShort = col.map(toShortCol);
    const colorLabel =
      colShort.length === 1 ? (k: string) => toLongValue(colShort[0], k) : (k: string) => k;

    drawIDDensity(
      facetGroup,
      data,
      xScale,
      yScale,
      y_axis,
      min_y_axis,
      max_y_axis,
      bandwidth_divisor,
      plotHeight,
      plotWidth,
      var_1,
      col,
      getColor,
      getColorFromKey,
      discreteOrContinuous,
      globalColorOrder,
      mea_med_1,
      title,
      x_label,
      containerSel,
      tooltip,
      meaMedTooltip,
      colorLabel
    );
  }
};



const IDDensityComponent = ({
  data,
  phases,
  tree_lin,
  var_1,
  ancs,
  chroms,
  regs,
  col,
  fac_x,
  fac_y,
  mea_med_1,
  y_axis,
  min_y_axis,
  max_y_axis,
  x_axis,
  min_x_axis,
  max_x_axis,
  isSidebarVisible,
  bandwidth_divisor,
}: IDDensityPlotProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && Array.isArray(data) && data.length > 0) {
      fullDensity(
        svgRef.current,
        data,
        phases,
        tree_lin,
        var_1,
        ancs,
        chroms,
        regs,
        col,
        fac_x,
        fac_y,
        mea_med_1,
        bandwidth_divisor,
        x_axis,
        min_x_axis,
        max_x_axis,
        y_axis,
        min_y_axis,
        max_y_axis
      );

    }
  }, [
    phases,
    data,
    tree_lin,
    var_1,
    ancs,
    chroms,
    regs,
    col,
    fac_x,
    fac_y,
    mea_med_1,
    y_axis,
    min_y_axis,
    max_y_axis,
    x_axis,
    min_x_axis,
    max_x_axis,
    isSidebarVisible,
    bandwidth_divisor
  ]);

  const handleResize = useCallback(() => {
    if (containerRef.current && svgRef.current && data) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      svgRef.current.setAttribute("width", String(width));
      svgRef.current.setAttribute("height", String(height));
      fullDensity(
        svgRef.current,
        data,
        phases,
        tree_lin,
        var_1,
        ancs,
        chroms,
        regs,
        col,
        fac_x,
        fac_y,
        mea_med_1,
        bandwidth_divisor,
        x_axis,
        min_x_axis,
        max_x_axis,
        y_axis,
        min_y_axis,
        max_y_axis
      );
    }
  }, [
    phases,
    data,
    tree_lin,
    var_1,
    ancs,
    chroms,
    regs,
    col,
    fac_x,
    fac_y,
    mea_med_1,
    y_axis,
    min_y_axis,
    max_y_axis,
    x_axis,
    min_x_axis,
    max_x_axis,
    isSidebarVisible,
    bandwidth_divisor
  ]);

  usePlotContainerSize({
    containerRef,
    onResize: handleResize,
    deps: [isSidebarVisible],
  });
  return (
    <div
      id="plot-container"
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <svg id="histogram" ref={svgRef} />
    </div>
  );
};
export default IDDensityComponent;
