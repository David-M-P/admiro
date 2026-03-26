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

type FrequencySeriesPoint = {
  position: number;
  frequency: number;
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

const getRowsForChromosome = (
  rows: FrequencyRow[],
  chromosome: string,
  minBp: number,
  maxBp: number
) =>
  rows
    .filter(
      (row) =>
        row.chromosome === chromosome &&
        row.end > minBp &&
        row.start < maxBp &&
        row.frequency >= 0
    )
    .sort((a, b) => (a.start !== b.start ? a.start - b.start : a.end - b.end));

const toFrequencyPoints = (rows: FrequencyRow[], minBp: number, maxBp: number) =>
  rows
    .filter((row) => row.frequency > 0)
    .map((row) => ({
      ...row,
      midpoint: (row.start + row.end) / 2,
    }))
    .filter((row) => row.midpoint >= minBp && row.midpoint <= maxBp)
    .sort((a, b) => a.midpoint - b.midpoint);

const compactSeries = (series: FrequencySeriesPoint[]): FrequencySeriesPoint[] => {
  const compacted: FrequencySeriesPoint[] = [];
  for (const point of series) {
    const previous = compacted[compacted.length - 1];
    if (
      previous &&
      previous.position === point.position &&
      previous.frequency === point.frequency
    ) {
      continue;
    }
    compacted.push(point);
  }
  return compacted;
};

const toSeriesWithZeroBaseline = (
  rows: FrequencyRow[],
  minBp: number,
  maxBp: number
): FrequencySeriesPoint[] => {
  if (maxBp <= minBp) return [];

  const series: FrequencySeriesPoint[] = [{ position: minBp, frequency: 0 }];
  let cursor = minBp;
  let currentFrequency = 0;

  for (const row of rows) {
    const start = Math.max(minBp, row.start);
    const end = Math.min(maxBp, row.end);
    const segmentStart = Math.max(start, cursor);

    if (end <= start || segmentStart >= end) continue;

    if (segmentStart > cursor) {
      if (currentFrequency !== 0) {
        series.push({ position: cursor, frequency: 0 });
        currentFrequency = 0;
      }
      series.push({ position: segmentStart, frequency: 0 });
      cursor = segmentStart;
    }

    if (currentFrequency !== row.frequency) {
      series.push({ position: segmentStart, frequency: row.frequency });
      currentFrequency = row.frequency;
    } else if (series[series.length - 1]?.position !== segmentStart) {
      series.push({ position: segmentStart, frequency: currentFrequency });
    }

    series.push({ position: end, frequency: row.frequency });
    cursor = end;
  }

  if (cursor < maxBp) {
    if (currentFrequency !== 0) {
      series.push({ position: cursor, frequency: 0 });
    }
    series.push({ position: maxBp, frequency: 0 });
  } else if (series.length === 1) {
    series.push({ position: maxBp, frequency: 0 });
  }

  return compactSeries(series);
};

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

    const pointsByLine = activeLines.map((line) => {
      const rows = getRowsForChromosome(line.rows, chromosome, limitStartBp, limitEndBp);
      return {
        line,
        points: toFrequencyPoints(rows, limitStartBp, limitEndBp),
        seriesPoints: toSeriesWithZeroBaseline(rows, limitStartBp, limitEndBp),
      };
    });
    const allSeriesPoints = pointsByLine.flatMap((entry) => entry.seriesPoints);
    const maxFrequency = d3.max(allSeriesPoints, (point) => point.frequency) ?? 0;
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
      .line<FrequencySeriesPoint>()
      .x((point) => xScale(point.position))
      .y((point) => yScale(point.frequency));

    pointsByLine.forEach(({ line, points, seriesPoints }) => {
      if (seriesPoints.length === 0) return;
      const color = getFrequencyLineColor(line.filters);

      svg
        .append("path")
        .datum(seriesPoints)
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
