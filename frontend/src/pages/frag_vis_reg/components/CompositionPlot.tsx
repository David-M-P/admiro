import {
  COMPOSITION_MULTI_POP_COLOR,
  COMPOSITION_POPULATION_COLORS,
  COMPOSITION_POPULATION_ORDER,
  CompositionRow,
} from "@/pages/frag_vis_reg/static/fvrStatic";
import * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";

type CompositionPlotProps = {
  rows: CompositionRow[];
  isSidebarVisible: boolean;
};

type GridCell = {
  indexKey: string;
  population: string;
  color: string;
};

const hasPositiveSize = (width: number, height: number) =>
  Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

const sanitizePopulation = (value: string) => value.trim().toUpperCase();

const toPopulationSet = (row: CompositionRow) =>
  new Set(row.pop_combination.map((value) => sanitizePopulation(String(value))));

const toBarColor = (row: CompositionRow) => {
  if (row.pop_combination.length !== 1) return COMPOSITION_MULTI_POP_COLOR;
  const population = sanitizePopulation(String(row.pop_combination[0]));
  return COMPOSITION_POPULATION_COLORS[population as keyof typeof COMPOSITION_POPULATION_COLORS] ??
    COMPOSITION_MULTI_POP_COLOR;
};

const getTickValues = (domain: string[], maxTicks: number) => {
  if (domain.length <= maxTicks) return domain;
  const stride = Math.ceil(domain.length / maxTicks);
  return domain.filter((_, index) => index % stride === 0);
};

const drawPlot = (svgElement: SVGSVGElement, rows: CompositionRow[]) => {
  d3.select(svgElement).selectAll("*").remove();
  const container = svgElement.parentElement;
  if (!container) return;

  d3.select(container).selectAll(".tooltip").remove();
  const tooltip = d3.select(container).append("div").attr("class", "tooltip");

  if (rows.length === 0) return;

  const margin = { top: 16, right: 18, bottom: 54, left: 82 };
  const width = container.clientWidth - margin.left - margin.right;
  const height = container.clientHeight - margin.top - margin.bottom;
  if (!hasPositiveSize(width, height)) return;

  const panelGap = 22;
  const topHeight = Math.max(120, Math.floor((height - panelGap) * 0.7));
  const bottomHeight = Math.max(72, height - panelGap - topHeight);
  if (!hasPositiveSize(width, topHeight) || !hasPositiveSize(width, bottomHeight)) return;

  const indexDomain = rows.map((row) => String(row.index));
  const xScale = d3
    .scaleBand<string>()
    .domain(indexDomain)
    .range([0, width])
    .paddingInner(0.08)
    .paddingOuter(0.04);

  const yMax = d3.max(rows, (row) => row.total_sequence) ?? 0;
  const yScale = d3.scaleLinear().domain([0, Math.max(1, yMax)]).nice().range([topHeight, 0]);
  const yGridScale = d3
    .scaleBand<string>()
    .domain([...COMPOSITION_POPULATION_ORDER])
    .range([0, bottomHeight])
    .paddingInner(0.15)
    .paddingOuter(0.1);

  const root = d3
    .select(svgElement)
    .attr("width", container.clientWidth)
    .attr("height", container.clientHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const topGroup = root.append("g");
  const bottomGroup = root.append("g").attr("transform", `translate(0,${topHeight + panelGap})`);

  const showTooltip = (event: MouseEvent, html: string) => {
    const [mouseX, mouseY] = d3.pointer(event, container);
    tooltip
      .style("opacity", 0.96)
      .html(html)
      .style("left", `${mouseX + 10}px`)
      .style("top", `${mouseY - 28}px`);
  };

  const moveTooltip = (event: MouseEvent) => {
    const [mouseX, mouseY] = d3.pointer(event, container);
    tooltip.style("left", `${mouseX + 10}px`).style("top", `${mouseY - 28}px`);
  };

  const hideTooltip = () => {
    tooltip.style("opacity", 0);
  };

  topGroup
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", topHeight)
    .attr("fill", "white")
    .attr("stroke", "#d9dfec");

  topGroup
    .append("g")
    .call(d3.axisLeft(yScale).ticks(Math.min(6, Math.max(2, Math.floor(topHeight / 36)))))
    .selectAll("text")
    .style("font-size", "11px");

  topGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -topHeight / 2)
    .attr("y", -56)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Total sequence");

  topGroup
    .selectAll("rect.bar")
    .data(rows)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (row) => xScale(String(row.index)) ?? 0)
    .attr("y", (row) => yScale(row.total_sequence))
    .attr("width", Math.max(1, xScale.bandwidth()))
    .attr("height", (row) => Math.max(0, topHeight - yScale(row.total_sequence)))
    .attr("fill", (row) => toBarColor(row))
    .attr("stroke", "#00000020")
    .on("mouseover", (event, row) =>
      showTooltip(
        event,
        [
          `<strong>Index: ${row.index}</strong>`,
          `Total sequence: ${row.total_sequence}`,
          `Pop combination: ${row.pop_combination.length > 0 ? row.pop_combination.join(", ") : "N/A"
          }`,
        ].join("<br/>")
      )
    )
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  bottomGroup
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", bottomHeight)
    .attr("fill", "white")
    .attr("stroke", "#d9dfec");

  bottomGroup
    .append("g")
    .call(d3.axisLeft(yGridScale).tickSize(0))
    .call((group) => group.select(".domain").remove())
    .selectAll("text")
    .style("font-size", "11px");

  const gridCells: GridCell[] = [];
  for (const row of rows) {
    const populationSet = toPopulationSet(row);
    for (const population of COMPOSITION_POPULATION_ORDER) {
      if (!populationSet.has(population)) continue;
      gridCells.push({
        indexKey: String(row.index),
        population,
        color: COMPOSITION_POPULATION_COLORS[population],
      });
    }
  }

  bottomGroup
    .selectAll("rect.grid-cell")
    .data(gridCells)
    .join("rect")
    .attr("class", "grid-cell")
    .attr("x", (cell) => xScale(cell.indexKey) ?? 0)
    .attr("y", (cell) => yGridScale(cell.population) ?? 0)
    .attr("width", Math.max(1, xScale.bandwidth()))
    .attr("height", Math.max(1, yGridScale.bandwidth()))
    .attr("fill", (cell) => cell.color)
    .attr("stroke", "#00000030")
    .on("mouseover", (event, cell) =>
      showTooltip(event, [`<strong>Index: ${cell.indexKey}</strong>`, `Population: ${cell.population}`].join("<br/>"))
    )
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  const xAxisTickValues = getTickValues(indexDomain, 12);
  bottomGroup
    .append("g")
    .attr("transform", `translate(0,${bottomHeight})`)
    .call(d3.axisBottom(xScale).tickValues(xAxisTickValues))
    .selectAll("text")
    .style("font-size", "11px");

  root
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Index");
};

const CompositionPlot = ({ rows, isSidebarVisible }: CompositionPlotProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const redraw = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (!hasPositiveSize(width, height)) {
      d3.select(svgRef.current).selectAll("*").remove();
      d3.select(containerRef.current).selectAll(".tooltip").remove();
      return;
    }
    drawPlot(svgRef.current, rows);
  }, [rows]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [isSidebarVisible, redraw]);

  return (
    <div
      id="composition-plot-container"
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <svg id="composition-plot" ref={svgRef} />
    </div>
  );
};

export default CompositionPlot;
