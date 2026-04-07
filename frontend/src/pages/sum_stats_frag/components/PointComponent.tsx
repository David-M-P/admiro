import { buildColorScale } from "@/pages/sum_stats_frag/domain/colorScale";
import { getAdaptiveLinearAxisTickCount } from "@/pages/sum_stats_frag/domain/axis";
import { toShortCol } from "@/pages/sum_stats_frag/domain/columns";
import { extentWithBuffer, getNumericValue } from "@/pages/sum_stats_frag/domain/data";
import { buildFacetGroups } from "@/pages/sum_stats_frag/domain/faceting";
import { applyCommonDataFilters } from "@/pages/sum_stats_frag/domain/filtering";
import { usePlotContainerSize } from "@/pages/sum_stats_frag/hooks/usePlotContainerSize";
import type { FragmentDataPoint as DataPoint } from "@/pages/sum_stats_frag/domain/types";
import * as d3 from "d3";
import * as jStat from "jstat";
import { useCallback, useEffect, useRef } from "react";

type PointPlotProps = {
  data: DataPoint[];
  tree_lin: string[];
  var_x: string;
  var_y: string;
  col: string[];
  ancs: string[];
  chroms: string[];
  regs: string[];
  fac_x: string[];
  fac_y: string[];
  mea_med_x: boolean;
  mea_med_y: boolean;
  x_axis: string;
  min_x_axis: number;
  max_x_axis: number;
  y_axis: string;
  min_y_axis: number;
  max_y_axis: number;
  isSidebarVisible: boolean;
};

type LegendItem = { label: string; color: string; extent?: [number, number] };

const createColorScale = (rows: DataPoint[], colorColumns: string[], sortMetricColumn: string) =>
  buildColorScale({
    rows,
    colorColumns,
    sortMetricColumn,
    allowContinuous: true,
    emptyGroupKey: "Mean / Median",
    defaultOrderValue: "__all__",
  });

const drawEmptyState = (
  svgElement: SVGSVGElement,
  width: number,
  height: number,
  message: string,
) => {
  d3.select(svgElement)
    .attr("width", width)
    .attr("height", height)
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "#4c5c70")
    .style("font-size", "14px")
    .text(message);
};

const drawLegend = (
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  legendData: LegendItem[],
  discreteOrContinuous: "default" | "continuous" | "discrete",
  height: number,
  marginLeft: number,
  rowPadding: number,
) => {
  const legend = svg.append("g").attr(
    "transform",
    `translate(${marginLeft}, ${height - rowPadding / 1.5})`,
  );

  if (discreteOrContinuous === "continuous") {
    const extent = legendData.find((item) => Array.isArray(item.extent))?.extent;
    if (!extent) return;

    const legendWidth = 280;
    const legendHeight = 18;
    const gradientId = "point-color-gradient";
    const gradientScale = d3.scaleSequential(d3.interpolateViridis).domain(extent);

    const gradient = legend
      .append("defs")
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    const stops = 12;
    for (let index = 0; index <= stops; index += 1) {
      const t = index / stops;
      gradient
        .append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", gradientScale(extent[0] + t * (extent[1] - extent[0])));
    }

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 16)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", `url(#${gradientId})`);

    legend
      .append("text")
      .attr("x", 0)
      .attr("y", 10)
      .text(`Min: ${extent[0].toFixed(2)}`)
      .style("font-size", "12px");

    legend
      .append("text")
      .attr("x", legendWidth)
      .attr("y", 10)
      .attr("text-anchor", "end")
      .text(`Max: ${extent[1].toFixed(2)}`)
      .style("font-size", "12px");

    return;
  }

  let cumulativeWidth = 0;
  const padding = 30;
  legendData.forEach((item) => {
    legend
      .append("rect")
      .attr("x", cumulativeWidth)
      .attr("y", 0)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", item.color);

    const text = legend
      .append("text")
      .attr("x", cumulativeWidth + 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .text(item.label);

    const textNode = text.node();
    if (!textNode) return;
    cumulativeWidth += 18 + textNode.getBBox().width + padding;
  });
};

const setAxisDomain = (
  scale: d3.ScaleLinear<number, number>,
  axisMode: string,
  sharedDomain: [number, number] | null,
  defineMin: number,
  defineMax: number,
  rows: DataPoint[],
  keyShort: string,
) => {
  if (axisMode === "Define Range") {
    scale.domain([defineMin, defineMax]);
    return;
  }
  if (axisMode === "Shared Axis" && sharedDomain) {
    scale.domain(sharedDomain);
    return;
  }
  scale.domain(extentWithBuffer(rows, keyShort, 0.1));
};

const applyAdaptiveXAxisTickRotation = (
  axisGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  plotWidth: number,
) => {
  const tickTexts = axisGroup.selectAll<SVGTextElement, unknown>("text");
  const tickNodes = tickTexts.nodes();
  if (tickNodes.length <= 1) return false;

  const widestTick = tickNodes.reduce((maxWidth, node) => {
    const width = node.getBBox().width;
    return Math.max(maxWidth, width);
  }, 0);

  const spacing = plotWidth / Math.max(1, tickNodes.length - 1);
  const shouldRotate = widestTick > spacing * 0.9;

  if (shouldRotate) {
    tickTexts
      .style("text-anchor", "end")
      .attr("dx", "-0.6em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-35)");
    return true;
  }

  tickTexts
    .style("text-anchor", "middle")
    .attr("dx", "0")
    .attr("dy", "0.71em")
    .attr("transform", null);
  return false;
};

const attachMeanMedianLines = (
  facetGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  facetData: DataPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  varXShort: string,
  varYShort: string,
  showMeanMedianX: boolean,
  showMeanMedianY: boolean,
  colorKey: (row: DataPoint) => string,
  getColorFromKey: (key: string) => string,
  legendData: LegendItem[],
) => {
  if (!showMeanMedianX && !showMeanMedianY) return;

  const container = d3.select("#plot-container");
  const tooltip = container.append("div").attr("class", "tooltip");
  const grouped = d3.group(facetData, (row) => colorKey(row));

  grouped.forEach((rows, groupKey) => {
    const color = getColorFromKey(groupKey);
    const legendLabel = legendData.find((item) => item.color === color)?.label ?? groupKey;

    const xValues = rows
      .map((row) => getNumericValue(row, varXShort))
      .filter(Number.isFinite);
    const yValues = rows
      .map((row) => getNumericValue(row, varYShort))
      .filter(Number.isFinite);

    const showTooltip = (event: MouseEvent, html: string) => {
      const [mouseX, mouseY] = d3.pointer(event, container.node());
      tooltip.transition().duration(100).style("opacity", 1);
      tooltip.html(html).style("left", `${mouseX + 10}px`).style("top", `${mouseY - 28}px`);
    };

    const hideTooltip = () => {
      tooltip.transition().duration(100).style("opacity", 0);
    };

    if (showMeanMedianX && xValues.length > 0) {
      const meanX = d3.mean(xValues);
      const medianX = d3.median(xValues);
      if (meanX !== undefined && medianX !== undefined) {
        facetGroup
          .append("line")
          .attr("x1", xScale(meanX))
          .attr("x2", xScale(meanX))
          .attr("y1", yScale.range()[0])
          .attr("y2", yScale.range()[1])
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,4")
          .on("mouseenter", (event) =>
            showTooltip(event, `<strong>Group:</strong> ${legendLabel}<br/><strong>Mean X:</strong> ${meanX.toFixed(2)}`),
          )
          .on("mousemove", (event) =>
            showTooltip(event, `<strong>Group:</strong> ${legendLabel}<br/><strong>Mean X:</strong> ${meanX.toFixed(2)}`),
          )
          .on("mouseleave", hideTooltip);

        facetGroup
          .append("line")
          .attr("x1", xScale(medianX))
          .attr("x2", xScale(medianX))
          .attr("y1", yScale.range()[0])
          .attr("y2", yScale.range()[1])
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "2,4")
          .on("mouseenter", (event) =>
            showTooltip(
              event,
              `<strong>Group:</strong> ${legendLabel}<br/><strong>Median X:</strong> ${medianX.toFixed(2)}`,
            ),
          )
          .on("mousemove", (event) =>
            showTooltip(
              event,
              `<strong>Group:</strong> ${legendLabel}<br/><strong>Median X:</strong> ${medianX.toFixed(2)}`,
            ),
          )
          .on("mouseleave", hideTooltip);
      }
    }

    if (showMeanMedianY && yValues.length > 0) {
      const meanY = d3.mean(yValues);
      const medianY = d3.median(yValues);
      if (meanY !== undefined && medianY !== undefined) {
        facetGroup
          .append("line")
          .attr("x1", xScale.range()[0])
          .attr("x2", xScale.range()[1])
          .attr("y1", yScale(meanY))
          .attr("y2", yScale(meanY))
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,4")
          .on("mouseenter", (event) =>
            showTooltip(event, `<strong>Group:</strong> ${legendLabel}<br/><strong>Mean Y:</strong> ${meanY.toFixed(2)}`),
          )
          .on("mousemove", (event) =>
            showTooltip(event, `<strong>Group:</strong> ${legendLabel}<br/><strong>Mean Y:</strong> ${meanY.toFixed(2)}`),
          )
          .on("mouseleave", hideTooltip);

        facetGroup
          .append("line")
          .attr("x1", xScale.range()[0])
          .attr("x2", xScale.range()[1])
          .attr("y1", yScale(medianY))
          .attr("y2", yScale(medianY))
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "2,4")
          .on("mouseenter", (event) =>
            showTooltip(
              event,
              `<strong>Group:</strong> ${legendLabel}<br/><strong>Median Y:</strong> ${medianY.toFixed(2)}`,
            ),
          )
          .on("mousemove", (event) =>
            showTooltip(
              event,
              `<strong>Group:</strong> ${legendLabel}<br/><strong>Median Y:</strong> ${medianY.toFixed(2)}`,
            ),
          )
          .on("mouseleave", hideTooltip);
      }
    }
  });
};

const attachTrendlines = (
  facetGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  facetData: DataPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  varXShort: string,
  varYShort: string,
  colorKey: (row: DataPoint) => string,
  getColorFromKey: (key: string) => string,
  discreteOrContinuous: "default" | "continuous" | "discrete",
) => {
  const groupedEntries =
    discreteOrContinuous === "continuous"
      ? ([["__all__", facetData]] as Array<[string, DataPoint[]]>)
      : Array.from(d3.group(facetData, (row) => colorKey(row)).entries());

  groupedEntries.forEach(([groupKey, rows]) => {
    const points = rows
      .map((row) => ({
        x: getNumericValue(row, varXShort),
        y: getNumericValue(row, varYShort),
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    const n = points.length;
    if (n < 3) return;

    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    const meanX = d3.mean(xValues);
    const meanY = d3.mean(yValues);
    if (meanX === undefined || meanY === undefined) return;

    const ssXX = d3.sum(xValues, (x) => (x - meanX) ** 2);
    if (!Number.isFinite(ssXX) || ssXX <= 0) return;

    const ssXY = d3.sum(points, (point) => (point.x - meanX) * (point.y - meanY));
    const slope = ssXY / ssXX;
    const intercept = meanY - slope * meanX;

    const residuals = points.map((point) => point.y - (slope * point.x + intercept));
    const degreesOfFreedom = n - 2;
    if (degreesOfFreedom <= 0) return;

    const residualSumOfSquares = d3.sum(residuals, (value) => value * value);
    const variance = residualSumOfSquares / degreesOfFreedom;
    if (!Number.isFinite(variance) || variance <= 0) return;
    const standardError = Math.sqrt(variance);

    const rawTValue = jStat.studentt.inv(0.975, degreesOfFreedom);
    const tValue = Number.isFinite(rawTValue) ? rawTValue : 1.96;

    const [xMin, xMax] = d3.extent(xValues) as [number, number];
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin === xMax) return;

    const steps = 100;
    const stepSize = (xMax - xMin) / steps;
    const xRange =
      stepSize > 0
        ? d3.range(xMin, xMax + stepSize / 2, stepSize)
        : [xMin, xMax];

    const regressionData = xRange.map((x) => {
      const prediction = slope * x + intercept;
      const confidenceError =
        tValue * standardError * Math.sqrt(1 / n + ((x - meanX) ** 2) / ssXX);

      return {
        x,
        y: prediction,
        upper: prediction + confidenceError,
        lower: prediction - confidenceError,
      };
    });

    const trendlineColor =
      discreteOrContinuous === "continuous" ? "#003d73" : getColorFromKey(groupKey);
    const strokeColor = d3.color(trendlineColor)?.darker(0.7).formatHex() ?? trendlineColor;

    const areaGenerator = d3
      .area<{ x: number; upper: number; lower: number }>()
      .x((point) => xScale(point.x))
      .y0((point) => yScale(point.lower))
      .y1((point) => yScale(point.upper));

    const lineGenerator = d3
      .line<{ x: number; y: number }>()
      .x((point) => xScale(point.x))
      .y((point) => yScale(point.y));

    facetGroup
      .append("path")
      .datum(regressionData)
      .attr("fill", trendlineColor)
      .attr("opacity", 0.18)
      .attr("d", areaGenerator);

    facetGroup
      .append("path")
      .datum(regressionData)
      .attr("stroke", strokeColor)
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .attr("d", lineGenerator);
  });
};

const drawFacet = (
  facetGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  facetData: DataPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  plotHeight: number,
  plotWidth: number,
  varXShort: string,
  varYShort: string,
  getColor: (row: DataPoint) => string,
  title: string,
  xLabel: string,
  yLabel: string,
  showMeanMedianX: boolean,
  showMeanMedianY: boolean,
  colorKey: (row: DataPoint) => string,
  getColorFromKey: (key: string) => string,
  discreteOrContinuous: "default" | "continuous" | "discrete",
  legendData: LegendItem[],
) => {
  const xAxisGroup = facetGroup
    .append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format(".1e")));
  const xTicksRotated = applyAdaptiveXAxisTickRotation(xAxisGroup, plotWidth);

  const yTickCount = getAdaptiveLinearAxisTickCount(plotHeight);
  facetGroup
    .append("g")
    .call(d3.axisLeft(yScale).ticks(yTickCount).tickFormat(d3.format(".1e")));

  facetGroup
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + (xTicksRotated ? 56 : 35))
    .attr("text-anchor", "middle")
    .text(xLabel);

  facetGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text(yLabel);

  facetGroup
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .text(title);

  facetGroup
    .append("g")
    .selectAll("circle")
    .data(facetData)
    .enter()
    .append("circle")
    .attr("cx", (row) => xScale(getNumericValue(row, varXShort)))
    .attr("cy", (row) => yScale(getNumericValue(row, varYShort)))
    .attr("r", 3)
    .attr("fill", (row) => getColor(row))
    .attr("opacity", 0.8);

  attachMeanMedianLines(
    facetGroup,
    facetData,
    xScale,
    yScale,
    varXShort,
    varYShort,
    showMeanMedianX,
    showMeanMedianY,
    colorKey,
    getColorFromKey,
    legendData,
  );

  attachTrendlines(
    facetGroup,
    facetData,
    xScale,
    yScale,
    varXShort,
    varYShort,
    colorKey,
    getColorFromKey,
    discreteOrContinuous,
  );
};

const fullPoints = (
  svgElement: SVGSVGElement,
  data: DataPoint[],
  treeLin: string[],
  varX: string,
  varY: string,
  colorColumns: string[],
  ancestries: string[],
  chromosomes: string[],
  regions: string[],
  facetXColumns: string[],
  facetYColumns: string[],
  showMeanMedianX: boolean,
  showMeanMedianY: boolean,
  xAxisMode: string,
  minXAxis: number,
  maxXAxis: number,
  yAxisMode: string,
  minYAxis: number,
  maxYAxis: number,
) => {
  const container = svgElement.parentElement;
  if (!container) return;

  const containerSel = d3.select(container);
  containerSel.selectAll("div.tooltip").remove();
  d3.select(svgElement).selectAll("*").remove();

  const width = container.clientWidth || 960;
  const height = container.clientHeight || 600;

  const varXShort = toShortCol(varX);
  const varYShort = toShortCol(varY);
  if (!varXShort || !varYShort) {
    drawEmptyState(svgElement, width, height, "Select X and Y variables to render the plot.");
    return;
  }

  const filteredRows = applyCommonDataFilters({
    rows: data,
    treeLin,
    ancestries,
    regions,
    chromosomes,
    ancestryRequiredColumns: [varX, varY],
    finiteColumns: [varX, varY],
  });

  if (filteredRows.length === 0) {
    drawEmptyState(svgElement, width, height, "No data to display for the selected filters.");
    return;
  }

  const {
    getColor,
    getColorFromKey,
    legendData,
    discreteOrContinuous,
    colorKey,
  } = createColorScale(filteredRows, colorColumns, varX);

  const facetsX = buildFacetGroups(filteredRows, facetXColumns);
  const facetsY = buildFacetGroups(filteredRows, facetYColumns);
  const facetingRequiredX = facetsX.length > 1;
  const facetingRequiredY = facetsY.length > 1;
  const numCols = facetingRequiredX ? facetsX.length : 1;
  const numRows = facetingRequiredY ? facetsY.length : 1;

  const margin = { top: 50, right: 30, bottom: 80, left: 75 };
  const colPadding = 60;
  const rowPadding = 70;

  const plotWidth = Math.max(
    1,
    numCols === 1
      ? width - margin.right - margin.left - colPadding
      : (width - margin.right - margin.left) / numCols - colPadding,
  );
  const plotHeight = Math.max(
    1,
    numRows === 1
      ? height - margin.bottom - margin.top - rowPadding
      : (height - margin.bottom - margin.top) / numRows - rowPadding,
  );

  const svg = d3
    .select(svgElement)
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(0,0)");

  drawLegend(
    svg,
    legendData,
    discreteOrContinuous,
    height,
    margin.left + colPadding / 2,
    rowPadding,
  );

  const sharedXDomain =
    xAxisMode === "Shared Axis" ? extentWithBuffer(filteredRows, varXShort, 0.1) : null;
  const sharedYDomain =
    yAxisMode === "Shared Axis" ? extentWithBuffer(filteredRows, varYShort, 0.1) : null;

  const drawFacetAt = (facetData: DataPoint[], title: string, i: number, j: number) => {
    if (facetData.length === 0) return;

    const facetGroup = svg
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left + (i * plotWidth + i * (colPadding / 2) + (i + 1) * (colPadding / 2))},${margin.top + (j * plotHeight + j * (rowPadding / 2) + (j + 1) * (rowPadding / 2))})`,
      );

    const xScale = d3.scaleLinear().range([0, plotWidth]);
    const yScale = d3.scaleLinear().range([plotHeight, 0]);
    setAxisDomain(
      xScale,
      xAxisMode,
      sharedXDomain,
      minXAxis,
      maxXAxis,
      facetData,
      varXShort,
    );
    setAxisDomain(
      yScale,
      yAxisMode,
      sharedYDomain,
      minYAxis,
      maxYAxis,
      facetData,
      varYShort,
    );

    drawFacet(
      facetGroup,
      facetData,
      xScale,
      yScale,
      plotHeight,
      plotWidth,
      varXShort,
      varYShort,
      getColor,
      title,
      varX,
      varY,
      showMeanMedianX && discreteOrContinuous !== "continuous",
      showMeanMedianY && discreteOrContinuous !== "continuous",
      colorKey,
      getColorFromKey,
      discreteOrContinuous,
      legendData,
    );
  };

  if (facetingRequiredX && facetingRequiredY) {
    facetsX.forEach((gx, i) => {
      const setX = new Set(gx.points);
      facetsY.forEach((gy, j) => {
        const facetData = gy.points.filter((row) => setX.has(row));
        drawFacetAt(facetData, `${gx.title} / ${gy.title}`, i, j);
      });
    });
    return;
  }

  if (facetingRequiredX) {
    facetsX.forEach((gx, i) => {
      drawFacetAt(gx.points, gx.title, i, 0);
    });
    return;
  }

  if (facetingRequiredY) {
    facetsY.forEach((gy, j) => {
      drawFacetAt(gy.points, gy.title, 0, j);
    });
    return;
  }

  drawFacetAt(filteredRows, "", 0, 0);
};

const PointComponent = ({
  data,
  tree_lin,
  var_x,
  var_y,
  col,
  ancs,
  chroms,
  regs,
  fac_x,
  fac_y,
  mea_med_x,
  mea_med_y,
  x_axis,
  min_x_axis,
  max_x_axis,
  y_axis,
  min_y_axis,
  max_y_axis,
  isSidebarVisible,
}: PointPlotProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const drawPlot = useCallback(() => {
    if (!containerRef.current || !svgRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    svgRef.current.setAttribute("width", String(width));
    svgRef.current.setAttribute("height", String(height));

    fullPoints(
      svgRef.current,
      data,
      tree_lin,
      var_x,
      var_y,
      col,
      ancs,
      chroms,
      regs,
      fac_x,
      fac_y,
      mea_med_x,
      mea_med_y,
      x_axis,
      min_x_axis,
      max_x_axis,
      y_axis,
      min_y_axis,
      max_y_axis,
    );
  }, [
    data,
    tree_lin,
    var_x,
    var_y,
    col,
    ancs,
    chroms,
    regs,
    fac_x,
    fac_y,
    mea_med_x,
    mea_med_y,
    x_axis,
    min_x_axis,
    max_x_axis,
    y_axis,
    min_y_axis,
    max_y_axis,
  ]);

  useEffect(() => {
    drawPlot();
  }, [drawPlot]);

  usePlotContainerSize({
    containerRef,
    onResize: drawPlot,
    deps: [isSidebarVisible],
  });

  return (
    <div
      id="plot-container"
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <svg id="point" ref={svgRef} />
    </div>
  );
};

export default PointComponent;
