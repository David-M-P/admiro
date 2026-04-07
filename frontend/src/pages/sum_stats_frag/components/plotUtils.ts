import * as d3 from "d3";

export const clearPlotSvg = (svgElement: SVGSVGElement) => {
  d3.select(svgElement).selectAll("*").remove();
  const container = svgElement.parentElement;
  if (container) {
    d3.select(container).selectAll("div.tooltip").remove();
  }
};

export const drawEmptySvgState = (
  svgElement: SVGSVGElement,
  width: number,
  height: number,
  message: string,
) => {
  clearPlotSvg(svgElement);
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
