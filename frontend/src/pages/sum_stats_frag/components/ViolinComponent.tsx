import { drawEmptySvgState } from "@/pages/sum_stats_frag/components/plotUtils";
import { buildColorScale } from "@/pages/sum_stats_frag/domain/colorScale";
import { toLongCol, toShortCol } from "@/pages/sum_stats_frag/domain/columns";
import { asNum, keyFromCols } from "@/pages/sum_stats_frag/domain/data";
import { buildFacetGroups } from "@/pages/sum_stats_frag/domain/faceting";
import { applyCommonDataFilters } from "@/pages/sum_stats_frag/domain/filtering";
import type { FragmentDataPoint as DataPoint } from "@/pages/sum_stats_frag/domain/types";
import { usePlotContainerSize } from "@/pages/sum_stats_frag/hooks/usePlotContainerSize";
import {
  kernelDensityEstimator,
  kernelEpanechnikov,
} from "@/pages/sum_stats_frag/static/densityUtils";
import * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";

type ViolinPlotProps = {
  data: DataPoint[];
  phases: string[];
  tree_lin: string[];
  var_1: string;
  ancs: string[];
  chroms: string[];
  regs: string[];
  col: string[];
  fac_x: string[];
  mea_med_1: boolean;
  bandwidth_divisor: number;
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
  legendData: { label: string; color: string; extent?: [number, number] }[];
  discreteOrContinuous: string;
  globalColorOrder: string[];
} => {
  return buildColorScale({
    rows: data,
    colorColumns: col,
    sortMetricColumn: var_1,
    emptyGroupKey: "__all__",
    defaultOrderValue: "__default__",
  });
};

// -------------------- drawViolin --------------------
const drawViolin = (
  facetGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: DataPoint[],
  xScale: d3.ScaleBand<string>,
  yScale: d3.ScaleLinear<number, number>,
  bandwidth_divisor: number,
  plotHeight: number,
  plotWidth: number,
  var_1: string,
  col: string[],
  getColor: (d: DataPoint) => string,
  discreteOrContinuous: string,
  globalColorOrder: string[],
  showMeanMedian: boolean,
  title: string,
  x_label: string,
  y_label: string,
  jitter: number,
  showYAxis: boolean,
  containerSel: d3.Selection<HTMLElement, unknown, null, undefined>,
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
  meaMedTooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
) => {
  // keys (short)
  const var1Short = toShortCol(var_1);
  const colShort = col.map(toShortCol);
  const colorKey = keyFromCols(colShort);

  // container/tooltips
  //const containerSel = d3.select("#plot-container");
  // avoid infinite tooltips on rerender: remove previous ones
  //containerSel.selectAll("div.tooltip").remove();
  //const tooltip = containerSel.append("div").attr("class", "tooltip");
  //const meaMedTooltip = containerSel.append("div").attr("class", "tooltip");
  facetGroup
    .append("line")
    .attr("x1", 0)
    .attr("x2", plotWidth)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", "black");

  facetGroup
    .append("line")
    .attr("x1", plotWidth)
    .attr("x2", plotWidth)
    .attr("y1", -30)
    .attr("y2", plotHeight)
    .attr("stroke", "black");

  // extent on short var key
  const v = (d: DataPoint) => asNum(d[var1Short]);
  const extent = d3.extent(data, v);

  if (extent[0] == null || extent[1] == null || !Number.isFinite(extent[0]) || !Number.isFinite(extent[1])) {
    return;
  }
  const [minValue, maxValue] = extent;

  const bandwidth = (maxValue - minValue) / bandwidth_divisor;
  const samplePoints = d3.range(minValue, maxValue, (maxValue - minValue) / 3000);
  const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), samplePoints);

  // sumstat grouped by category key
  const sumstat = Array.from(
    d3.group(data, (d) => colorKey(d)),
    ([key, value]) => ({
      key,
      value: kde(value.map((g) => v(g))),
    })
  );

  const maxNum = d3.max(sumstat, (d) => d3.max(d.value, (v) => v[1])) || 0;

  const xNum = d3
    .scaleLinear()
    .range([0, xScale.bandwidth()])
    .domain([-maxNum, maxNum]);


  // draw violin shapes
  facetGroup
    .selectAll("g.violin")
    .data(sumstat)
    .enter()
    .append("g")
    .attr("class", "violin")
    .attr("transform", (d) => `translate(${xScale(d.key) ?? 0},0)`)
    .each(function (d) {
      const foundItem = data.find((item) => colorKey(item) === d.key);

      d3.select(this)
        .append("path")
        .datum(d.value as [number, number][])
        .style("fill", () => (foundItem ? getColor(foundItem) : "steelblue"))
        .style("stroke", () => (foundItem ? getColor(foundItem) : "steelblue"))
        .style("fill-opacity", 0.5)
        .style("stroke-opacity", 0)
        .attr(
          "d",
          d3
            .area<[number, number]>()
            .x0((p) => xNum(-p[1]))
            .x1((p) => xNum(p[1]))
            .y((p) => yScale(p[0]))
            .curve(d3.curveCatmullRom)
        );
    });

  // points
  facetGroup
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => {
      const xValue = xScale(colorKey(d));
      return (
        (xValue !== undefined ? xValue : 0) +
        xScale.bandwidth() / 2 +
        (Math.random() - 0.5) * jitter * xScale.bandwidth()
      );
    })
    .attr("cy", (d) => yScale(v(d)))
    .attr("r", 1.2)
    .style("fill", (d) => getColor(d))
    .style("opacity", 0.7)
    .on("mouseenter", function (event, d) {

      tooltip.transition().duration(150).style("opacity", 1);
      tooltip.html(
        `<strong>Individual:</strong> ${d.ind}<br/>
         <strong>Sex:</strong> ${d.sex}<br/>
         <strong>Dataset:</strong> ${d.dat}<br/>
         <strong>Region:</strong> ${d.reg}<br/>
         <strong>Population:</strong> ${d.pop}<br/>
         <strong>Chromosome:</strong> ${d.chrom}<br/>
         <strong>Haplotype:</strong> ${d.hap}<br/>`
      );
    })
    .on("mousemove", function (event) {
      const [mouseX, mouseY] = d3.pointer(event, containerSel.node()); // Ensure the mouse position is relative to the container
      tooltip
        .style("left", `${mouseX + 10}px`)
        .style("top", `${mouseY - 28}px`);
    })
    .on("mouseleave", function () {
      tooltip.transition().duration(150).style("opacity", 0); // Hide tooltip
    });

  facetGroup
    .append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(xScale));

  if (showYAxis) {
    facetGroup.append("g").call(d3.axisLeft(yScale));
    facetGroup
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -plotHeight / 2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .text(y_label);

    facetGroup
      .append("line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", -30)
      .attr("y2", plotHeight)
      .attr("stroke", "black");
  }

  facetGroup
    .append("text")
    .attr("x", plotWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .each(function () {
      const titleText = d3.select(this);
      const lines = title.split("\n");
      lines.forEach((line, i) => {
        titleText
          .append("tspan")
          .attr("x", plotWidth / 2)
          .attr("y", -25 + i * 5)
          .attr("dy", `${i * 1.1}em`)
          .text(line);
      });
    });

  // mean/median lines: group by category key (NOT d.color)
  if (showMeanMedian) {
    const groups = d3.group(data, (d) => colorKey(d));

    groups.forEach((groupData, key) => {
      if (!groupData.length) return;

      const mean = d3.mean(groupData, v);
      const median = d3.median(groupData, v);
      if (mean == null || median == null) return;
      const sumstatForGroup = sumstat.find((s) => s.key === key);

      const getDensityAtValue = (
        ss: { key: string; value: any[][] } | undefined,
        yValue: number
      ) => {
        if (!ss) return 0;
        const closest = ss.value.reduce((prev, curr) =>
          Math.abs(curr[0] - yValue) < Math.abs(prev[0] - yValue) ? curr : prev
        );
        return closest[1];
      };

      const densityForMean = getDensityAtValue(sumstatForGroup, mean);
      const densityForMedian = getDensityAtValue(sumstatForGroup, median);

      const densityScale = d3
        .scaleLinear()
        .domain([0, maxNum])
        .range([0, xScale.bandwidth()]);

      const xPosition = xScale(key);

      if (xPosition === undefined) return;

      const strokeColor = d3.color(getColor(groupData[0]))!.darker(0.7).formatHex();

      // mean line
      facetGroup
        .append("line")
        .attr(
          "x1",
          xPosition +
          xScale.bandwidth() / 2 -
          densityScale(densityForMean) / 2
        )
        .attr(
          "x2",
          xPosition +
          xScale.bandwidth() / 2 +
          densityScale(densityForMean) / 2
        )
        .attr("y1", yScale(mean))
        .attr("y2", yScale(mean))
        .attr("stroke", strokeColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4")
        .on("mouseenter", () => {

          meaMedTooltip.transition().duration(150).style("opacity", 1);
          meaMedTooltip.html(
            `<strong>Group:</strong> ${key}<br/><strong>Mean:</strong> ${mean.toFixed(
              2
            )}`
          );
        })
        .on("mousemove", (event) => {
          const node = containerSel.node() as HTMLElement | null;
          if (!node) return;
          const [mouseX, mouseY] = d3.pointer(event, node);
          meaMedTooltip
            .style("left", `${mouseX + 10}px`)
            .style("top", `${mouseY - 28}px`);
        })
        .on("mouseleave", () => {
          meaMedTooltip.transition().duration(150).style("opacity", 0);
        });

      // median line
      facetGroup
        .append("line")
        .attr(
          "x1",
          xPosition +
          xScale.bandwidth() / 2 -
          densityScale(densityForMedian) / 2
        )
        .attr(
          "x2",
          xPosition +
          xScale.bandwidth() / 2 +
          densityScale(densityForMedian) / 2
        )
        .attr("y1", yScale(median))
        .attr("y2", yScale(median))
        .attr("stroke", strokeColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "2,4")
        .on("mouseenter", () => {

          meaMedTooltip.transition().duration(150).style("opacity", 1);
          meaMedTooltip.html(
            `<strong>Group:</strong> ${key}<br/><strong>Median:</strong> ${median.toFixed(
              2
            )}`
          );
        })
        .on("mousemove", (event) => {
          const node = containerSel.node() as HTMLElement | null;
          if (!node) return;
          const [mouseX, mouseY] = d3.pointer(event, node);
          meaMedTooltip
            .style("left", `${mouseX + 10}px`)
            .style("top", `${mouseY - 28}px`);
        })
        .on("mouseleave", () => {
          meaMedTooltip.transition().duration(150).style("opacity", 0);
        });
    });
  }
};

// -------------------- Component --------------------
const ViolinComponent = ({
  data,
  phases,
  tree_lin,
  var_1,
  ancs,
  chroms,
  regs,
  col,
  fac_x,
  mea_med_1,
  bandwidth_divisor,
  y_axis,
  min_y_axis,
  max_y_axis,
  isSidebarVisible,
}: ViolinPlotProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (svgRef.current) {
      fullViolin(
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
        mea_med_1,
        bandwidth_divisor,
        y_axis,
        min_y_axis,
        max_y_axis,
      );
    }
  }, [
    data,
    phases,
    tree_lin,
    var_1,
    ancs,
    chroms,
    regs,
    col,
    fac_x,
    mea_med_1,
    bandwidth_divisor,
    y_axis,
    min_y_axis,
    max_y_axis,
    isSidebarVisible,
  ]);

  const handleResize = useCallback(() => {
    if (containerRef.current && svgRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      svgRef.current.setAttribute("width", String(width));
      svgRef.current.setAttribute("height", String(height));
      fullViolin(
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
        mea_med_1,
        bandwidth_divisor,
        y_axis,
        min_y_axis,
        max_y_axis,
      );
    }
  }, [
    data,
    phases,
    tree_lin,
    var_1,
    ancs,
    chroms,
    regs,
    col,
    fac_x,
    mea_med_1,
    bandwidth_divisor,
    y_axis,
    min_y_axis,
    max_y_axis,
    isSidebarVisible,
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

export default ViolinComponent;

// -------------------- fullViolin --------------------
const fullViolin = (
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
  mea_med_1: boolean,
  bandwidth_divisor: number,
  y_axis: string,
  min_y_axis: number,
  max_y_axis: number,
) => {
  console.log(data)
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
  console.log(data)

  d3.select(svgElement).selectAll("*").remove();
  const container = svgElement.parentElement;

  const margin = { top: 50, right: 30, bottom: 80, left: 75 };
  const width = container ? container.clientWidth : 960;
  const height = container ? container.clientHeight : 600;

  if (!var_1.trim()) {
    drawEmptySvgState(svgElement, width, height, "Select a variable to render the plot.");
    return;
  }

  if (data.length === 0) {
    drawEmptySvgState(svgElement, width, height, "No data to display for the selected filters.");
    return;
  }

  const { getColor, legendData, discreteOrContinuous, globalColorOrder } =
    createColorScale(data, col, var_1);

  const facets = buildFacetGroups(data, fac_x);
  const facetingRequiredX = facets.length > 1;
  const numCols = facetingRequiredX ? facets.length : 1;
  const basePlotWidth =
    numCols === 1
      ? width - margin.left - margin.right
      : (width - margin.left - margin.right) / numCols;

  // --- Compute xTickWidth based on number of unique x categories in each facet ---
  const facColsShort = (fac_x ?? []).map(toShortCol);
  const colShort = col.map(toShortCol);

  const facetKey = keyFromCols(facColsShort);
  const colorKey = keyFromCols(colShort);

  const groupedByFacet = d3.group(data, (d) => facetKey(d));

  let totalUniqueColors = 0;
  for (const [, points] of groupedByFacet) {
    const set = new Set<string>();
    for (const p of points) {
      const k = colorKey(p);
      if (k !== "") set.add(k);
    }
    totalUniqueColors += set.size;
  }
  if (totalUniqueColors === 0) totalUniqueColors = 1;

  const xTickWidth = (width - margin.left - margin.right) / totalUniqueColors;
  const plotHeight = height - margin.bottom - margin.top;

  const svg = d3
    .select(svgElement)
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(0,0)`);

  const yScale = d3.scaleLinear().range([plotHeight, 0]);

  // legend
  const padding = 30;
  let cumulativeWidth = 0;
  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${margin.left}, ${height - margin.bottom / 1.5})`
    );

  legendData.forEach((d) => {
    legend
      .append("rect")
      .attr("x", cumulativeWidth)
      .attr("y", 0)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", d.color);

    const text = legend
      .append("text")
      .attr("x", cumulativeWidth + 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .text(d.label);

    const textNode = text.node();
    if (textNode) {
      const textWidth = textNode.getBBox().width;
      cumulativeWidth += 18 + textWidth + padding;
    }
  });

  // x-axis title (use mapping, robust to short/long input)
  const x_title = svg.append("g").attr(
    "transform",
    `translate(${width / 2}, ${height - margin.bottom / 1.5})`
  );
  const x_label = col.map((c) => toLongCol(toShortCol(c))).join("-");
  x_title
    .append("text")
    .attr("x", 0)
    .attr("y", 9)
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .text(x_label);

  const y_label = toLongCol(toShortCol(var_1));


  // -------------------- Faceting render --------------------
  if (facetingRequiredX) {
    let accX = margin.left;

    facets.forEach((facet, i) => {
      const facetData = facet.points;


      // x categories present in this facet
      const xAxRange = Array.from(new Set(facetData.map((d) => colorKey(d)))).filter(
        (k) => k !== ""
      );

      const reorderedXAxRange = globalColorOrder.filter((k) => xAxRange.includes(k));

      const plotWidth = Math.max(1, reorderedXAxRange.length) * xTickWidth;

      const xScale = d3
        .scaleBand<string>()
        .range([0, plotWidth])
        .domain(reorderedXAxRange)
        .padding(0.05);

      const var1Short = toShortCol(var_1);

      if (y_axis === "Define Range") {
        yScale.domain([min_y_axis, max_y_axis]).range([plotHeight, 0]);
      } else if (y_axis === "Shared Axis") {
        const v = (d: DataPoint) => asNum(d[var1Short]);

        const minVal = d3.min(data, v);
        const maxVal = d3.max(data, v);

        if (minVal == null || maxVal == null || !Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
          drawEmptySvgState(svgElement, width, height, "No valid data extent for the selected variable.");
          return;
        }

        const buffer = (maxVal - minVal) * 0.05;
        yScale.domain([minVal - buffer, maxVal + buffer]).range([plotHeight, 0]);
      }

      const facetGroup = svg
        .append("g")
        .attr("transform", `translate(${accX},${margin.top})`);

      accX += plotWidth;

      drawViolin(
        facetGroup,
        facetData,
        xScale,
        yScale,
        bandwidth_divisor,
        plotHeight,
        plotWidth,
        var_1,
        col,
        getColor,
        discreteOrContinuous,
        globalColorOrder,
        mea_med_1,
        facet.title, // <- pretty title from buildFacetGroups
        x_label,
        y_label,
        0.5,
        i === 0,
        containerSel,
        tooltip,
        meaMedTooltip
      );
    });
  } else {
    const plotWidth = basePlotWidth;

    const xScale = d3
      .scaleBand<string>()
      .range([0, plotWidth])
      .domain(globalColorOrder)
      .padding(0.05);

    const var1Short = toShortCol(var_1);

    if (y_axis === "Define Range") {
      yScale.domain([min_y_axis, max_y_axis]).range([plotHeight, 0]);
    } else if (y_axis === "Shared Axis") {
      const v = (d: DataPoint) => asNum(d[var1Short]);

      const minVal = d3.min(data, v);
      const maxVal = d3.max(data, v);

      if (minVal == null || maxVal == null || !Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
        drawEmptySvgState(svgElement, width, height, "No valid data extent for the selected variable.");
        return;
      }

      const buffer = (maxVal - minVal) * 0.05;
      yScale.domain([minVal - buffer, maxVal + buffer]).range([plotHeight, 0]);
    }

    const facetGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    drawViolin(
      facetGroup,
      data,
      xScale,
      yScale,
      bandwidth_divisor,
      plotHeight,
      plotWidth,
      var_1,
      col,
      getColor,
      discreteOrContinuous,
      globalColorOrder,
      mea_med_1,
      "",
      x_label,
      y_label,
      0.5,
      true,
      containerSel,
      tooltip,
      meaMedTooltip
    );
  }
};
