import { chrlen } from "@/assets/StaticData";
import {
  getVisibleNonCodingIntervals,
  NonCodingMask,
  toPixelMergedIntervals,
  useNonCodingMask,
} from "@/assets/nonCodingMask";
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
  smoothingWindowKbp: number;
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

const toRoundedUpAxisMax = (maxFrequency: number) => {
  if (!Number.isFinite(maxFrequency) || maxFrequency <= 0) return 1;

  const step = d3.tickStep(0, maxFrequency, 2);
  if (!Number.isFinite(step) || step <= 0) return maxFrequency;

  const rounded = Math.ceil(maxFrequency / step) * step;
  const normalized = Number(rounded.toPrecision(12));
  return normalized > 0 ? normalized : 1;
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

const toWindowMaxSmoothedRows = (
  chromosome: string,
  rows: FrequencyRow[],
  minBp: number,
  maxBp: number,
  smoothingWindowBp: number
): FrequencyRow[] => {
  if (smoothingWindowBp <= 0) {
    return rows
      .map((row) => ({
        ...row,
        start: Math.max(minBp, row.start),
        end: Math.min(maxBp, row.end),
      }))
      .filter((row) => row.end > row.start);
  }

  const windowBp = Math.max(1, Math.floor(smoothingWindowBp));
  const clampedMinBp = Math.max(0, Math.floor(minBp));
  const clampedMaxBp = Math.max(clampedMinBp + 1, Math.ceil(maxBp));
  const minBin = Math.floor(clampedMinBp / windowBp);
  const maxBin = Math.floor((clampedMaxBp - 1) / windowBp);
  const binCount = maxBin - minBin + 1;
  if (binCount <= 0) return [];

  const binMaxFrequency = Array.from({ length: binCount }, () => 0);
  const binNWithArchaic = Array.from({ length: binCount }, () => 0);
  const binNTotal = Array.from({ length: binCount }, () => 0);

  for (const row of rows) {
    if (row.frequency <= 0) continue;

    const start = Math.max(clampedMinBp, row.start);
    const end = Math.min(clampedMaxBp, row.end);
    if (end <= start) continue;

    const firstBin = Math.max(minBin, Math.floor(start / windowBp));
    const lastBin = Math.min(maxBin, Math.floor((end - 1) / windowBp));

    for (let bin = firstBin; bin <= lastBin; bin += 1) {
      const binIndex = bin - minBin;
      if (row.frequency > binMaxFrequency[binIndex]) {
        binMaxFrequency[binIndex] = row.frequency;
        binNWithArchaic[binIndex] = row.n_with_archaic;
        binNTotal[binIndex] = row.n_total;
      }
    }
  }

  const smoothedRows: FrequencyRow[] = [];
  for (let bin = minBin; bin <= maxBin; bin += 1) {
    const binIndex = bin - minBin;
    const binStart = Math.max(clampedMinBp, bin * windowBp);
    const binEnd = Math.min(clampedMaxBp, (bin + 1) * windowBp);
    if (binEnd <= binStart) continue;

    smoothedRows.push({
      chromosome,
      start: binStart,
      end: binEnd,
      n_with_archaic: binNWithArchaic[binIndex],
      n_total: binNTotal[binIndex],
      frequency: binMaxFrequency[binIndex],
    });
  }

  return smoothedRows;
};

const toFrequencyPoints = (rows: FrequencyRow[], minBp: number, maxBp: number) =>
  rows
    .map((row) => ({
      ...row,
      midpoint: (row.start + row.end) / 2,
    }))
    .filter((row) => row.midpoint >= minBp && row.midpoint <= maxBp)
    .sort((a, b) => a.midpoint - b.midpoint);

const toPositiveFrequencyPoints = (points: FrequencyPoint[]) =>
  points.filter((point) => point.frequency > 0);

const toLineSeries = (points: FrequencyPoint[]): FrequencySeriesPoint[] => {
  if (points.length === 0) return [];

  const series: FrequencySeriesPoint[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const previous = index > 0 ? points[index - 1] : null;
    if (previous && point.start > previous.end) {
      series.push({ position: Number.NaN, frequency: Number.NaN });
    }
    series.push({ position: point.midpoint, frequency: point.frequency });
  }
  return series;
};

const drawPlot = (
  svgElement: SVGSVGElement,
  lines: FrequencyLineState[],
  chromosomes: string[],
  chrmsLimits: [number, number],
  smoothingWindowKbp: number,
  nonCodingMask: NonCodingMask | null
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
  const smoothingWindowBp = Math.round(smoothingWindowKbp * 1000);
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

    const nonCodingOverlayRectangles = toPixelMergedIntervals(
      getVisibleNonCodingIntervals(
        nonCodingMask,
        chromosome,
        chromosomeVisibleStart,
        chromosomeVisibleEnd
      ),
      (positionBp) => xScale(positionBp)
    )
      .map((interval) => {
        const left = Math.max(0, interval.x);
        const right = Math.min(chromosomeWidth, interval.x + interval.width);
        return {
          x: left,
          width: Math.max(0, right - left),
        };
      })
      .filter((interval) => interval.width > 0);

    if (nonCodingOverlayRectangles.length > 0) {
      svg
        .append("g")
        .selectAll("rect.noncoding-mask")
        .data(nonCodingOverlayRectangles)
        .join("rect")
        .attr("class", "noncoding-mask")
        .attr("x", (interval) => interval.x)
        .attr("y", yPos)
        .attr("width", (interval) => interval.width)
        .attr("height", chrHeight)
        .attr("fill", "#64748b")
        .attr("fill-opacity", 0.22);
    }

    svg
      .append("text")
      .attr("x", -88)
      .attr("y", yPos + chrHeight / 2)
      .attr("dy", "0.35em")
      .style("text-anchor", "start")
      .style("font-size", "12px")
      .text(chromosome);

    const pointsByLine = activeLines.map((line) => {
      const chromosomeRows = getRowsForChromosome(
        line.rows,
        chromosome,
        chromosomeVisibleStart,
        chromosomeVisibleEnd
      );
      const rows = toWindowMaxSmoothedRows(
        chromosome,
        chromosomeRows,
        chromosomeVisibleStart,
        chromosomeVisibleEnd,
        smoothingWindowBp
      );
      const points = toFrequencyPoints(rows, chromosomeVisibleStart, chromosomeVisibleEnd);
      return {
        line,
        points,
        markerPoints: toPositiveFrequencyPoints(points),
        seriesPoints: toLineSeries(points),
      };
    });
    const allPoints = pointsByLine.flatMap((entry) => entry.points);
    const maxFrequency = d3.max(allPoints, (point) => point.frequency) ?? 0;
    const yMax = toRoundedUpAxisMax(maxFrequency);

    const yScale = d3.scaleLinear().domain([0, yMax]).range([yPos + chrHeight, yPos]);
    svg
      .append("g")
      .attr("transform", "translate(0,0)")
      .call(
        d3
          .axisLeft(yScale)
          .tickValues([0, yMax])
          .tickSizeOuter(0)
          .tickFormat((value) => formatFrequencyTick(value))
      )
      .selectAll("text")
      .style("font-size", "10px");

    const lineGenerator = d3
      .line<FrequencySeriesPoint>()
      .defined((point) => Number.isFinite(point.position) && Number.isFinite(point.frequency))
      .x((point) => xScale(point.position))
      .y((point) => yScale(point.frequency));

    pointsByLine.forEach(({ line, markerPoints, seriesPoints }) => {
      if (seriesPoints.length === 0) return;
      const color = getFrequencyLineColor(line.lineId);

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
        .data(markerPoints)
        .join("circle")
        .attr("cx", (point) => xScale(point.midpoint))
        .attr("cy", (point) => yScale(point.frequency))
        .attr("r", 6)
        .attr("fill", "transparent")
        .attr("stroke", "none")
        .style("pointer-events", "all")
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
  smoothingWindowKbp,
  isSidebarVisible,
}: FrequencyChromosomePlotProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nonCodingMask = useNonCodingMask();

  const redraw = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (!hasPositiveSize(width, height)) {
      d3.select(svgRef.current).selectAll("*").remove();
      d3.select(containerRef.current).selectAll(".tooltip").remove();
      return;
    }
    drawPlot(svgRef.current, lines, chrms, chrmsLimits, smoothingWindowKbp, nonCodingMask);
  }, [chrms, chrmsLimits, lines, nonCodingMask, smoothingWindowKbp]);

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
