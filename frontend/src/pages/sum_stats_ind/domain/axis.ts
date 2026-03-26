import * as d3 from "d3";

export const applyAdaptiveXAxisTickRotation = (
  axisGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  plotWidth: number,
): boolean => {
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

export const getAdaptiveLinearAxisTickCount = (
  axisLengthPx: number,
  minPixelsPerTick = 15,
  minTicks = 2,
  maxTicks = 8,
): number => {
  if (!Number.isFinite(axisLengthPx) || axisLengthPx <= 0) {
    return minTicks;
  }

  const estimatedTicks = Math.floor(axisLengthPx / minPixelsPerTick);
  return Math.max(minTicks, Math.min(maxTicks, estimatedTicks));
};
