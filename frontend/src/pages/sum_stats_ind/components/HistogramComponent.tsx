import { buildColorScale } from "@/pages/sum_stats_ind/domain/colorScale";
import {
  applyAdaptiveXAxisTickRotation,
  getAdaptiveLinearAxisTickCount,
} from "@/pages/sum_stats_ind/domain/axis";
import {
  isContinuousColumn,
  isDiscreteColumn,
  toLongValue,
  toShortCol,
} from "@/pages/sum_stats_ind/domain/columns";
import { asNum, extentWithBuffer } from "@/pages/sum_stats_ind/domain/data";
import { buildFacetGroups } from "@/pages/sum_stats_ind/domain/faceting";
import { applyCommonDataFilters } from "@/pages/sum_stats_ind/domain/filtering";
import { usePlotContainerSize } from "@/pages/sum_stats_ind/hooks/usePlotContainerSize";
import { DataPoint } from "@/types/sum_stat_ind_datapoint";
import * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";


type HistogramPlotProps = {
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
  n_bins: number;
  y_axis: string;
  min_y_axis: number;
  max_y_axis: number;
  x_axis: string;
  min_x_axis: number;
  max_x_axis: number;
  isSidebarVisible: boolean;
};

const createColorScale = (
  data: DataPoint[],
  col: string[],
  var_1: string
): {
  getColor: (d: DataPoint) => string;
  legendData: { label: string; color: string; extent?: [number, number] }[];
  discreteOrContinuous: string;
  globalColorOrder: string[];
  colorKey: (d: DataPoint) => string;
  continuousColorFieldShort: string | null;
} => {
  return buildColorScale({
    rows: data,
    colorColumns: col,
    sortMetricColumn: var_1,
    allowContinuous: true,
    emptyGroupKey: "__default__",
    defaultOrderValue: "__default__",
  });
};


// -------------------- drawHistogram --------------------

const drawHistogram = (
  facetGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: DataPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  y_axis: string,
  min_y_axis: number,
  max_y_axis: number,
  plotHeight: number,
  plotWidth: number,
  var_1: string,
  n_bins: number,
  getColor: (d: DataPoint) => string,
  discreteOrContinuous: string,
  globalColorOrder: string[],
  showMeanMedian: boolean,
  title: string,
  x_label: string,
  colorKey: (d: DataPoint) => string,
  continuousColorFieldShort: string | null,
  colorLabel?: (key: string) => string
) => {
  const varXShort = toShortCol(var_1);
  const labelOf = colorLabel ?? ((k: string) => k);

  // ---- Histogram bins ----
  const histogram = d3
    .bin<DataPoint, number>()
    .value((d) => asNum((d as any)[varXShort]))
    .domain(xScale.domain() as [number, number])
    .thresholds(n_bins);

  const bins = histogram(data);

  // ---- Y scale ----
  yScale.range([plotHeight, 0]);

  if (y_axis === "Define Range") {
    yScale.domain([min_y_axis, max_y_axis]);
  } else if (y_axis === "Free Axis") {
    const maxLen = d3.max(bins, (b) => b.length) ?? 0;
    yScale.domain([0, maxLen + 0.05 * maxLen]);
  } else if (y_axis === "Shared Axis") {
    // palceholder alerth thrown in Sidefilter.tsx
    return;
  } else {
    // safe fallback
    const maxLen = d3.max(bins, (b) => b.length) ?? 0;
    yScale.domain([0, maxLen]);
  }

  // ---- Bars ----
  for (const bin of bins) {
    if (bin.length === 0 || bin.x0 == null || bin.x1 == null) continue;

    const x0 = xScale(bin.x0);
    const x1 = xScale(bin.x1);
    const barW = Math.max(0, x1 - x0 - 1);

    // CONTINUOUS color: single bar colored by mean of the color field in the bin
    if (discreteOrContinuous === "continuous" && continuousColorFieldShort) {
      const nums = bin
        .map((d) => asNum((d as any)[continuousColorFieldShort]))
        .filter(Number.isFinite);

      const mean = nums.length ? (d3.mean(nums) as number) : NaN;

      const fill = Number.isFinite(mean)
        ? getColor({ [continuousColorFieldShort]: mean } as any)
        : "steelblue";

      facetGroup
        .append("rect")
        .attr("x", x0 + 0.5)
        .attr("y", yScale(bin.length))
        .attr("width", barW)
        .attr("height", yScale(0) - yScale(bin.length))
        .attr("fill", fill)
        .attr("stroke", "none");

      continue;
    }

    // DISCRETE / DEFAULT: stack by stable colorKey
    const groups = d3.group(bin, (d) => (colorKey(d) || "__missing__"));

    let orderedKeys: string[] = [];
    if (discreteOrContinuous === "default") {
      orderedKeys = ["__default__"];
    } else if (discreteOrContinuous === "discrete" && globalColorOrder.length) {
      const present = new Set(groups.keys());
      orderedKeys = globalColorOrder.filter((k) => present.has(k));
      // append unexpected keys at the end
      for (const k of groups.keys()) if (!globalColorOrder.includes(k)) orderedKeys.push(k);
    } else {
      orderedKeys = Array.from(groups.keys());
    }

    let y0 = 0;
    for (const k of orderedKeys) {
      const g = groups.get(k) ?? [];
      if (g.length === 0) continue;

      const y1 = y0 + g.length;

      const fill =
        discreteOrContinuous === "default" ? "steelblue" : getColor(g[0]);

      facetGroup
        .append("rect")
        .attr("x", x0 + 0.5)
        .attr("y", yScale(y1))
        .attr("width", barW)
        .attr("height", yScale(y0) - yScale(y1))
        .attr("fill", fill)
        .attr("stroke", "none");

      y0 = y1;
    }
  }

  // ---- Axes & titles ----
  const xAxisGroup = facetGroup
    .append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(xScale));
  const xTicksRotated = applyAdaptiveXAxisTickRotation(xAxisGroup, plotWidth);

  facetGroup
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + (xTicksRotated ? 56 : 35))
    .attr("text-anchor", "middle")
    .text(x_label);

  const yTickCount = getAdaptiveLinearAxisTickCount(plotHeight);
  facetGroup.append("g").call(d3.axisLeft(yScale).ticks(yTickCount));

  facetGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .text("Counts");

  facetGroup
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .text(title);

  // ---- Mean/Median lines (optional) ----
  if (!showMeanMedian) return;

  const container = d3.select("#plot-container");
  let tooltip = container.select<HTMLDivElement>("div.tooltip");
  if (tooltip.empty()) {
    tooltip = container
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }

  const showTip = (html: string) => {
    tooltip
      .html(html)            // Selection method
      .interrupt()           // optional: cancel any running transitions
      .transition()
      .duration(150)
      .style("opacity", 1);
  }; const hideTip = () => tooltip.transition().duration(150).style("opacity", 0);

  const moveTip = (event: any) => {
    const node = container.node();
    if (!node) return;
    const [mx, my] = d3.pointer(event, node as any);
    tooltip.style("left", `${mx + 10}px`).style("top", `${my - 28}px`);
  };

  const attachLineTooltip = (
    x: number,
    html: string
  ) => {
    // big invisible hit area
    facetGroup
      .append("line")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", yScale.range()[0])
      .attr("y2", yScale.range()[1])
      .attr("stroke", "transparent")
      .attr("stroke-width", 10)          // <-- buffer (px)
      .style("pointer-events", "stroke") // <-- only the stroke is interactive
      .on("pointerenter", () => showTip(html))
      .on("pointermove", moveTip)
      .on("pointerleave", hideTip);
  };

  // If continuous color, draw ONE mean/median for all data (grouping continuous makes no sense)
  if (discreteOrContinuous === "continuous") {
    const vals = data.map((d) => asNum((d as any)[varXShort])).filter(Number.isFinite);
    if (vals.length === 0) return;

    const mean = d3.mean(vals) as number;
    const median = d3.median(vals) as number;

    const stroke = "#111";

    facetGroup
      .append("line")
      .attr("x1", xScale(mean))
      .attr("x2", xScale(mean))
      .attr("y1", yScale.range()[0])
      .attr("y2", yScale.range()[1])
      .attr("stroke", stroke)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4");

    attachLineTooltip(
      xScale(mean),
      `<strong>Mean:</strong> ${mean.toFixed(2)}`
    );

    facetGroup
      .append("line")
      .attr("x1", xScale(median))
      .attr("x2", xScale(median))
      .attr("y1", yScale.range()[0])
      .attr("y2", yScale.range()[1])
      .attr("stroke", stroke)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "2,4");

    attachLineTooltip(
      xScale(median),
      `<strong>Median:</strong> ${median.toFixed(2)}`
    );
    return;
  }

  // Discrete/default: per stable group key
  const grouped = d3.group(data, (d) => (discreteOrContinuous === "default" ? "__default__" : (colorKey(d) || "__missing__")));

  let orderedKeys: string[] = [];
  if (discreteOrContinuous === "default") {
    orderedKeys = ["__default__"];
  } else if (globalColorOrder.length) {
    const present = new Set(grouped.keys());
    orderedKeys = globalColorOrder.filter((k) => present.has(k));
    for (const k of grouped.keys()) if (!globalColorOrder.includes(k)) orderedKeys.push(k);
  } else {
    orderedKeys = Array.from(grouped.keys());
  }

  for (const k of orderedKeys) {
    const groupData = grouped.get(k) ?? [];
    if (groupData.length === 0) continue;

    const vals = groupData.map((d) => asNum((d as any)[varXShort])).filter(Number.isFinite);
    if (vals.length === 0) continue;

    const mean = d3.mean(vals) as number;
    const median = d3.median(vals) as number;

    const base = discreteOrContinuous === "default" ? "steelblue" : getColor(groupData[0]);
    const stroke = d3.color(base)?.darker(0.7).formatHex() ?? "#111";

    facetGroup
      .append("line")
      .attr("x1", xScale(mean))
      .attr("x2", xScale(mean))
      .attr("y1", yScale.range()[0])
      .attr("y2", yScale.range()[1])
      .attr("data-group", discreteOrContinuous === "default" ? "All" : labelOf(k))
      .attr("stroke", stroke)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4");
    attachLineTooltip(
      xScale(mean),
      `<strong>Mean:</strong> ${mean.toFixed(2)}`
    );

    facetGroup
      .append("line")
      .attr("x1", xScale(median))
      .attr("x2", xScale(median))
      .attr("y1", yScale.range()[0])
      .attr("y2", yScale.range()[1])
      .attr("stroke", stroke)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "2,4");
    attachLineTooltip(
      xScale(median),
      `<strong>Median:</strong> ${median.toFixed(2)}`
    );
  }
};


const drawBarplot = (
  facetGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  facetData: DataPoint[],
  xScale: d3.ScaleBand<string>,
  yScale: d3.ScaleLinear<number, number>,
  y_axis: string,
  min_y_axis: number,
  max_y_axis: number,
  plotHeight: number,
  plotWidth: number,
  var_1: string,
  getColor: (d: DataPoint) => string,
  discreteOrContinuous: string,
  globalColorOrder: string[],
  title: string,
  x_label: string,
  globalCategoryOrder: string[],
  colorKey: (d: DataPoint) => string,                 // NEW
  continuousColorFieldShort: string | null            // NEW
) => {
  const var1Short = toShortCol(var_1);

  // X domain fixed by globalCategoryOrder
  xScale.domain(globalCategoryOrder).range([0, plotWidth]).padding(0.1);

  // Build counts per category (respecting globalCategoryOrder)
  const categoryGroups = d3.group(
    facetData,
    (d) => String((d as any)[var1Short] ?? "")
  );

  const categoryCounts = globalCategoryOrder.map((cat) => {
    const values = categoryGroups.get(cat) || [];
    return { category: cat, values, count: values.length };
  });

  // Y scale
  yScale.range([plotHeight, 0]);
  if (y_axis === "Define Range") {
    yScale.domain([min_y_axis, max_y_axis]);
  } else if (y_axis === "Free Axis") {
    const maxCount = d3.max(categoryCounts, (d) => d.count) ?? 0;
    yScale.domain([0, maxCount + 0.05 * maxCount]);
  } else if (y_axis === "Shared Axis") {
    // assume caller already set yScale.domain(...) globally
  } else {
    // safe fallback
    const maxCount = d3.max(categoryCounts, (d) => d.count) ?? 0;
    yScale.domain([0, maxCount]);
  }

  // Draw bars
  for (const { category, values, count } of categoryCounts) {
    const xPos = xScale(category);
    if (xPos === undefined || count === 0) continue;

    // CONTINUOUS: single bar, colored by mean of the continuous field
    if (discreteOrContinuous === "continuous" && continuousColorFieldShort) {
      const nums = values
        .map((d) => Number((d as any)[continuousColorFieldShort]))
        .filter(Number.isFinite);

      const mean = nums.length ? d3.mean(nums)! : NaN;
      const fill = Number.isFinite(mean)
        ? getColor({ [continuousColorFieldShort]: mean } as any)
        : "steelblue";

      facetGroup
        .append("rect")
        .attr("x", xPos)
        .attr("y", yScale(count))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale(0) - yScale(count))
        .attr("fill", fill)
        .attr("stroke", "none");

      continue;
    }

    // DISCRETE / DEFAULT: stacked segments by colorKey
    const groups = d3.group(values, (d) => colorKey(d) || "__missing__");

    // Decide stack order
    let orderedKeys: string[];
    if (discreteOrContinuous === "default") {
      orderedKeys = ["__default__"];
    } else if (discreteOrContinuous === "discrete" && globalColorOrder.length) {
      const present = new Set(groups.keys());
      orderedKeys = globalColorOrder.filter((k) => present.has(k));
      // append any unexpected keys at the end (should be rare)
      for (const k of groups.keys()) if (!globalColorOrder.includes(k)) orderedKeys.push(k);
    } else {
      orderedKeys = Array.from(groups.keys());
    }

    // Stack in count-units
    let y0 = 0;
    for (const k of orderedKeys) {
      const g = groups.get(k) || [];
      if (g.length === 0) continue;

      const y1 = y0 + g.length;

      const fill =
        discreteOrContinuous === "default"
          ? "steelblue"
          : getColor(g[0]);

      facetGroup
        .append("rect")
        .attr("x", xPos)
        .attr("y", yScale(y1))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale(y0) - yScale(y1))
        .attr("fill", fill)
        .attr("stroke", "none");

      y0 = y1;
    }
  }

  // Axes (tickFormat optional but usually nice if you store short codes)
  facetGroup
    .append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(
      d3.axisBottom(xScale).tickFormat((d) => toLongValue(var1Short, d) as any)
    );

  facetGroup
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + 35)
    .attr("text-anchor", "middle")
    .text(x_label);

  const yTickCount = getAdaptiveLinearAxisTickCount(plotHeight);
  facetGroup.append("g").call(d3.axisLeft(yScale).ticks(yTickCount));

  facetGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .text("Counts");

  facetGroup
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .text(title);
};

const HistogramComponent = ({
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
  n_bins,
  y_axis,
  min_y_axis,
  max_y_axis,
  x_axis,
  min_x_axis,
  max_x_axis,
  isSidebarVisible
}: HistogramPlotProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && Array.isArray(data) && data.length > 0) {
      fullHistogram(
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
        y_axis,
        min_y_axis,
        max_y_axis,
        n_bins,
        x_axis,
        min_x_axis,
        max_x_axis
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
    n_bins,
    x_axis,
    min_x_axis,
    max_x_axis,
    isSidebarVisible
  ]);

  const handleResize = useCallback(() => {
    if (containerRef.current && svgRef.current && data) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      svgRef.current.setAttribute("width", String(width));
      svgRef.current.setAttribute("height", String(height));
      fullHistogram(
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
        y_axis,
        min_y_axis,
        max_y_axis,
        n_bins,
        x_axis,
        min_x_axis,
        max_x_axis
      );
    }
  }, [
    containerRef,
    svgRef,
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
    n_bins,
    x_axis,
    min_x_axis,
    max_x_axis,
    isSidebarVisible
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
export default HistogramComponent;

const fullHistogram = (
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
  y_axis: string,
  min_y_axis: number,
  max_y_axis: number,
  n_bins: number,
  x_axis: string,
  min_x_axis: number,
  max_x_axis: number,
) => {
  const containerSel = d3.select(svgElement.parentElement as HTMLElement);

  containerSel.selectAll("div.tooltip").remove();

  data = applyCommonDataFilters({
    rows: data,
    treeLin: tree_lin,
    ancestries: ancs,
    regions: regs,
    chromosomes: chroms,
    ancestryRequiredColumns: [var_1, ...col],
  });

  const var1Short = toShortCol(var_1);

  d3.select(svgElement).selectAll("*").remove();
  const container = svgElement.parentElement;

  const margin = { top: 50, right: 30, bottom: 80, left: 75 };
  const width = container ? container.clientWidth : 960;
  const height = container ? container.clientHeight : 600;

  const { getColor, legendData, discreteOrContinuous, colorKey, globalColorOrder, continuousColorFieldShort } =
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

  if (discreteOrContinuous === "continuous") {
    const legendWidth = 400; // Width of the gradient
    const legendHeight = 20; // Height of the gradient
    const legend = svg.append("g").attr(
      "transform",
      `translate(${margin.left + colPadding / 2}, ${height - rowPadding / 1.5})` // Center horizontally and place at the bottom
    );
    const extent = legendData[0].extent;

    if (extent) {
      // Create a color scale with interpolateViridis
      const colorScale = d3
        .scaleSequential()
        .domain(extent) // Set the domain to the extent values
        .interpolator(d3.interpolateViridis);

      // Define a gradient
      const gradient = legend
        .append("defs")
        .append("linearGradient")
        .attr("id", "color-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

      // Add gradient stops
      const numStops = 10; // Increase this number for smoother gradient
      for (let i = 0; i <= numStops; i++) {
        const t = i / numStops; // Calculate the position (0 to 1)
        gradient
          .append("stop")
          .attr("offset", `${t * 100}%`)
          .attr(
            "stop-color",
            colorScale(extent[0] + t * (extent[1] - extent[0]))
          ); // Interpolated color
      }

      // Draw the gradient rectangle
      legend
        .append("rect")
        .attr("x", 0)
        .attr("y", 20) // Positioning it below the min/max labels
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#color-gradient)");

      // Add min and max labels
      legend
        .append("text")
        .attr("x", 0)
        .attr("y", 15)
        .text(`Min: ${extent[0].toFixed(3)}`)
        .style("font-size", "12px");

      legend
        .append("text")
        .attr("x", legendWidth)
        .attr("y", 15)
        .attr("text-anchor", "end")
        .text(`Max: ${extent[1].toFixed(3)}`)
        .style("font-size", "12px");
    }
  } else {
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
  }
  const isDiscreteVar = isDiscreteColumn(var1Short);
  const isContinuousVar = isContinuousColumn(var1Short);
  function getGlobalCategoryOrder(data: DataPoint[], keyShort: string): string[] {
    const categories = Array.from(
      new Set(
        data
          .map((d) => d[keyShort])
          .filter((v) => v !== null && v !== undefined && v !== "")
          .map(String)
      )
    );

    categories.sort((a, b) => a.localeCompare(b));
    return categories;
  }

  let globalCategoryOrder: string[] = [];

  if (isDiscreteVar) {
    globalCategoryOrder = getGlobalCategoryOrder(data, var1Short);
  }
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
        if (isDiscreteVar) {
          const xScale = d3
            .scaleBand()
            .domain(globalCategoryOrder)
            .range([0, plotWidth])
            .padding(0.1);
          drawBarplot(
            facetGroup,
            facetData,
            xScale,
            yScale,
            y_axis,
            min_y_axis,
            max_y_axis,
            plotHeight,
            plotWidth,
            var_1,
            getColor,
            discreteOrContinuous,
            globalColorOrder,
            title,
            x_label,
            globalCategoryOrder,
            colorKey,
            continuousColorFieldShort
          );
        } else if (isContinuousVar) {
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
          // Since var_1 is continuous, we draw a histogram
          drawHistogram(
            facetGroup,
            facetData,
            xScale,
            yScale,
            y_axis,
            min_y_axis,
            max_y_axis,
            plotHeight,
            plotWidth,
            var_1,
            n_bins,
            getColor,
            discreteOrContinuous,
            globalColorOrder,
            mea_med_1,
            title,
            x_label,
            colorKey,
            continuousColorFieldShort,
            colorLabel
          );
        } else {
          console.warn(
            `Variable ${var_1} not found in discrete or continuous options.`
          );
        }
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
      if (isDiscreteVar) {
        const xScale = d3
          .scaleBand()
          .domain(globalCategoryOrder)
          .range([0, plotWidth])
          .padding(0.1);

        drawBarplot(
          facetGroup,
          facetData,
          xScale,
          yScale,
          y_axis,
          min_y_axis,
          max_y_axis,
          plotHeight,
          plotWidth,
          var_1,
          getColor,
          discreteOrContinuous,
          globalColorOrder,
          title,
          x_label,
          globalCategoryOrder,
          colorKey,
          continuousColorFieldShort
        );
      } else if (isContinuousVar) {
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
        // Since var_1 is continuous, we draw a histogram
        drawHistogram(
          facetGroup,
          facetData,
          xScale,
          yScale,
          y_axis,
          min_y_axis,
          max_y_axis,
          plotHeight,
          plotWidth,
          var_1,
          n_bins,
          getColor,
          discreteOrContinuous,
          globalColorOrder,
          mea_med_1,
          title,
          x_label,
          colorKey,
          continuousColorFieldShort,
          colorLabel
        );
      } else {
        console.warn(
          `Variable ${var_1} not found in discrete or continuous options.`
        );
      }
    });
  } else if (facetingRequiredY) {
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
      if (isDiscreteVar) {
        const xScale = d3
          .scaleBand()
          .domain(globalCategoryOrder)
          .range([0, plotWidth])
          .padding(0.1);

        drawBarplot(
          facetGroup,
          facetData,
          xScale,
          yScale,
          y_axis,
          min_y_axis,
          max_y_axis,
          plotHeight,
          plotWidth,
          var_1,
          getColor,
          discreteOrContinuous,
          globalColorOrder,
          title,
          x_label,
          globalCategoryOrder,
          colorKey,
          continuousColorFieldShort
        );
      } else if (isContinuousVar) {
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
        // Since var_1 is continuous, we draw a histogram
        drawHistogram(
          facetGroup,
          facetData,
          xScale,
          yScale,
          y_axis,
          min_y_axis,
          max_y_axis,
          plotHeight,
          plotWidth,
          var_1,
          n_bins,
          getColor,
          discreteOrContinuous,
          globalColorOrder,
          mea_med_1,
          title,
          x_label,
          colorKey,
          continuousColorFieldShort,
          colorLabel
        );
      } else {
        console.warn(
          `Variable ${var_1} not found in discrete or continuous options.`
        );
      }
    });
  } else {
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
    if (isDiscreteVar) {
      const xScale = d3
        .scaleBand()
        .domain(globalCategoryOrder)
        .range([0, plotWidth])
        .padding(0.1);

      drawBarplot(
        facetGroup,
        data,
        xScale,
        yScale,
        y_axis,
        min_y_axis,
        max_y_axis,
        plotHeight,
        plotWidth,
        var_1,
        getColor,
        discreteOrContinuous,
        globalColorOrder,
        title,
        x_label,
        globalCategoryOrder,
        colorKey,
        continuousColorFieldShort
      );
    } else if (isContinuousVar) {
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
      // Since var_1 is continuous, we draw a histogram
      drawHistogram(
        facetGroup,
        data,
        xScale,
        yScale,
        y_axis,
        min_y_axis,
        max_y_axis,
        plotHeight,
        plotWidth,
        var_1,
        n_bins,
        getColor,
        discreteOrContinuous,
        globalColorOrder,
        mea_med_1,
        title,
        x_label,
        colorKey,
        continuousColorFieldShort,
        colorLabel
      );
    } else {
      console.warn(
        `Variable ${var_1} not found in discrete or continuous options.`
      );
    }
  }
};
