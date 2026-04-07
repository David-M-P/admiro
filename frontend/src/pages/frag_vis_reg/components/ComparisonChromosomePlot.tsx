import { chrlen } from "@/assets/StaticData";
import {
  getVisibleNonCodingIntervals,
  NonCodingMask,
  toPixelMergedIntervals,
  useNonCodingMask,
} from "@/assets/nonCodingMask";
import {
  COMPARISON_REGION_CODE_ORDER,
  ComparisonLineState,
  getComparisonLineLabel,
  getFrequencyLineColor,
  sortChromosomes,
} from "@/pages/frag_vis_reg/static/fvrStatic";
import * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";

type ComparisonChromosomePlotProps = {
  lines: ComparisonLineState[];
  chrms: string[];
  chrmsLimits: [number, number];
  isSidebarVisible: boolean;
};

type ComparisonFragmentDatum = {
  line: ComparisonLineState;
  chromosome: string;
  start: number;
  end: number;
  presenceCodes: string[];
};

const hasPositiveSize = (width: number, height: number) =>
  Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

const getRowsForChromosome = (
  line: ComparisonLineState,
  chromosome: string,
  minBp: number,
  maxBp: number
) =>
  line.rows
    .filter(
      (row) =>
        row.chromosome === chromosome &&
        row.end > minBp &&
        row.start < maxBp &&
        row.end > row.start
    )
    .sort((a, b) => (a.start !== b.start ? a.start - b.start : a.end - b.end))
    .map((row) => ({
      line,
      chromosome,
      start: Math.max(minBp, row.start),
      end: Math.min(maxBp, row.end),
      presenceCodes: COMPARISON_REGION_CODE_ORDER.filter((code) => row.presence[code]),
    }))
    .filter((row) => row.end > row.start);

const drawPlot = (
  svgElement: SVGSVGElement,
  lines: ComparisonLineState[],
  chromosomes: string[],
  chrmsLimits: [number, number],
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

  const margin = { top: 18, right: 20, bottom: 56, left: 110 };
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
  const activeLines = lines
    .filter((line) => line.visible)
    .slice()
    .sort((a, b) => a.lineId - b.lineId);
  // console.log("Comparison rows plotted", orderedChromosomes.flatMap((chromosome) =>
  //   activeLines.flatMap((line) => getRowsForChromosome(line, chromosome, limitStartBp, limitEndBp))
  // ));

  const svg = d3
    .select(svgElement)
    .attr("width", container.clientWidth)
    .attr("height", container.clientHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const showTooltip = (event: MouseEvent, fragment: ComparisonFragmentDatum) => {
    const [mouseX, mouseY] = d3.pointer(event, container);
    const fragmentLength = Math.max(0, fragment.end - fragment.start);
    tooltip
      .style("opacity", 0.96)
      .html(
        [
          `<strong>${getComparisonLineLabel(fragment.line.lineId, fragment.line.filters)}</strong>`,
          `Chromosome: ${fragment.chromosome}`,
          `Start: ${fragment.start}`,
          `End: ${fragment.end}`,
          `Length: ${fragmentLength}`,
          `Regions: ${fragment.presenceCodes.length > 0 ? fragment.presenceCodes.join(", ") : "None"}`,
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

    if (activeLines.length === 0 || chromosomeWidth <= 0) return;

    const rowGap = activeLines.length > 1 ? 1 : 0;
    const availableHeight = Math.max(1, chrHeight - rowGap * (activeLines.length - 1));
    const rowHeight = Math.max(1, availableHeight / activeLines.length);

    activeLines.forEach((line, lineIndex) => {
      const rowY = yPos + lineIndex * (rowHeight + rowGap);
      const fragments = getRowsForChromosome(
        line,
        chromosome,
        chromosomeVisibleStart,
        chromosomeVisibleEnd
      );
      const color = getFrequencyLineColor(line.lineId);

      svg
        .append("g")
        .selectAll("rect.fragment")
        .data(fragments)
        .join("rect")
        .attr("class", "fragment")
        .attr("x", (fragment) => xScale(fragment.start))
        .attr("y", rowY + 0.5)
        .attr("width", (fragment) => Math.max(0.8, xScale(fragment.end) - xScale(fragment.start)))
        .attr("height", Math.max(1, rowHeight - 1))
        .attr("fill", color)
        .attr("fill-opacity", 0.88)
        .attr("stroke", "#00000020")
        .attr("stroke-width", 0.4)
        .on("mouseover", (event, fragment) => showTooltip(event, fragment))
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

const ComparisonChromosomePlot = ({
  lines,
  chrms,
  chrmsLimits,
  isSidebarVisible,
}: ComparisonChromosomePlotProps) => {
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
    drawPlot(svgRef.current, lines, chrms, chrmsLimits, nonCodingMask);
  }, [chrms, chrmsLimits, lines, nonCodingMask]);

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
      id="comparison-chromosome-container"
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <svg id="comparison-chromplot" ref={svgRef} />
    </div>
  );
};

export default ComparisonChromosomePlot;
