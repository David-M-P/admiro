import { chrlen } from "@/assets/StaticData";
import {
  FrequencyLineState,
  FrequencyRow,
  getFrequencyLineColor,
  getFrequencyLineLabel,
  sortChromosomes,
} from "@/pages/frag_vis_reg/static/fvrStatic";
import * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";

type FrequencyChromosomePlotProps = {
  lines: FrequencyLineState[];
  chrms: string[];
  chrmsLimits: [number, number];
  isSidebarVisible: boolean;
};

type FrequencyPoint = FrequencyRow & {
  midpoint: number;
};

const hasPositiveSize = (width: number, height: number) =>
  Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

const formatFrequencyTick = (value: d3.NumberValue) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  if (number === 0) return "0";
  if (number < 0.01) return number.toExponential(1);
  if (number < 1) return number.toFixed(2);
  return number.toFixed(0);
};

const getPointsForChromosome = (
  rows: FrequencyRow[],
  chromosome: string,
  minBp: number,
  maxBp: number
) =>
  rows
    .filter((row) => row.chromosome === chromosome && row.end >= minBp && row.start <= maxBp)
    .map((row) => ({
      ...row,
      midpoint: (row.start + row.end) / 2,
    }))
    .filter((row) => row.midpoint >= minBp && row.midpoint <= maxBp)
    .sort((a, b) => a.midpoint - b.midpoint);

const drawPlot = (
  svgElement: SVGSVGElement,
  lines: FrequencyLineState[],
  chromosomes: string[],
  chrmsLimits: [number, number]
) => {
  d3.select(svgElement).selectAll("*").remove();
  const container = svgElement.parentElement;
  if (!container) return;

  d3.select(container).selectAll(".tooltip").remove();
  const tooltip = d3.select(container).append("div").attr("class", "tooltip");

  const orderedChromosomes = sortChromosomes(chromosomes).filter((chromosome) =>
    Object.prototype.hasOwnProperty.call(chrlen, chromosome)
  );
  if (orderedChromosomes.length === 0) return;

  const margin = { top: 18, right: 20, bottom: 56, left: 120 };
  const width = container.clientWidth - margin.left - margin.right;
  const height = container.clientHeight - margin.top - margin.bottom;
  if (!hasPositiveSize(width, height)) return;

  const chrPadding = 12;
  const chrHeight =
    (height - (orderedChromosomes.length - 1) * chrPadding) / orderedChromosomes.length;
  if (!Number.isFinite(chrHeight) || chrHeight <= 0) return;

  const limitStartBp = Math.max(0, Math.min(chrmsLimits[0], chrmsLimits[1]) * 1000);
  const limitEndBp = Math.max(limitStartBp + 1, Math.max(chrmsLimits[0], chrmsLimits[1]) * 1000);
  const xScale = d3.scaleLinear().domain([limitStartBp, limitEndBp]).range([0, width]);

  const activeLines = lines.filter((line) => line.visible);
  const svg = d3
    .select(svgElement)
    .attr("width", container.clientWidth)
    .attr("height", container.clientHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const showTooltip = (event: MouseEvent, point: FrequencyPoint, line: FrequencyLineState) => {
    const [mouseX, mouseY] = d3.pointer(event, container);
    tooltip
      .style("opacity", 0.96)
      .html(
        [
          `<strong>${getFrequencyLineLabel(line.lineId, line.filters)}</strong>`,
          `Chromosome: ${point.chromosome}`,
          `Start: ${point.start}`,
          `End: ${point.end}`,
          `N archaic: ${point.n_with_archaic}`,
          `N total: ${point.n_total}`,
          `Frequency: ${point.frequency.toPrecision(4)}`,
        ].join("<br/>")
      )
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

  orderedChromosomes.forEach((chromosome, chromosomeIndex) => {
    const yPos = chromosomeIndex * (chrHeight + chrPadding);
    const chromosomeLength = chrlen[chromosome];
    const chromosomeVisibleStart = Math.max(limitStartBp, 0);
    const chromosomeVisibleEnd = Math.min(chromosomeLength, limitEndBp);
    const chromosomeWidth =
      chromosomeVisibleEnd > chromosomeVisibleStart
        ? xScale(chromosomeVisibleEnd) - xScale(chromosomeVisibleStart)
        : 0;

    svg
      .append("rect")
      .attr("x", 0)
      .attr("y", yPos)
      .attr("width", chromosomeWidth)
      .attr("height", chrHeight)
      .attr("fill", "white")
      .attr("stroke", "black");

    svg
      .append("text")
      .attr("x", -88)
      .attr("y", yPos + chrHeight / 2)
      .attr("dy", "0.35em")
      .style("text-anchor", "start")
      .style("font-size", "12px")
      .text(chromosome);

    const pointsByLine = activeLines.map((line) => ({
      line,
      points: getPointsForChromosome(line.rows, chromosome, limitStartBp, limitEndBp),
    }));
    const allPoints = pointsByLine.flatMap((entry) => entry.points);
    const maxFrequency = d3.max(allPoints, (point) => point.frequency) ?? 0;
    const yMax = maxFrequency > 0 ? maxFrequency * 1.1 : 1;

    const yScale = d3.scaleLinear().domain([0, yMax]).range([yPos + chrHeight, yPos]).nice();
    svg
      .append("g")
      .attr("transform", "translate(0,0)")
      .call(
        d3
          .axisLeft(yScale)
          .ticks(3)
          .tickSizeOuter(0)
          .tickFormat((value) => formatFrequencyTick(value))
      )
      .selectAll("text")
      .style("font-size", "10px");

    const lineGenerator = d3
      .line<FrequencyPoint>()
      .x((point) => xScale(point.midpoint))
      .y((point) => yScale(point.frequency));

    pointsByLine.forEach(({ line, points }) => {
      if (points.length === 0) return;
      const color = getFrequencyLineColor(line.filters);

      svg
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", lineGenerator);

      svg
        .append("g")
        .selectAll("circle")
        .data(points)
        .join("circle")
        .attr("cx", (point) => xScale(point.midpoint))
        .attr("cy", (point) => yScale(point.frequency))
        .attr("r", 2)
        .attr("fill", color)
        .on("mouseover", (event, point) => showTooltip(event, point, line))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
    });
  });

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(Math.max(2, Math.floor(width / 100)))
        .tickFormat((value) => String(Math.round(Number(value) / 1000)))
    )
    .selectAll("text")
    .style("font-size", "11px");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 42)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Chromosome position (kbp)");
};

const FrequencyChromosomePlot = ({
  lines,
  chrms,
  chrmsLimits,
  isSidebarVisible,
}: FrequencyChromosomePlotProps) => {
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
    drawPlot(svgRef.current, lines, chrms, chrmsLimits);
  }, [chrms, chrmsLimits, lines]);

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
      id="frequency-chromosome-container"
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <svg id="frequency-chromplot" ref={svgRef} />
    </div>
  );
};

export default FrequencyChromosomePlot;
