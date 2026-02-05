import { anc_cmaps } from "@/assets/colormaps";
import { variables } from "@/assets/sharedOptions";
import { chrlen } from "@/assets/StaticData";
import { DataPoint } from "@/pages/frag_vis_ind/static/fviStatic";
import * as d3 from "d3";
import React, { useEffect, useRef } from "react";



type ChromosomeProps = {
  data: any[];
  isSidebarVisible: boolean;
  lin: string[];
  chrms: string[];
  ancs: string[];
  mpp: number;
  chrms_limits: [number, number];
  min_length: number;
  color: string;
};



const createColorScale = (
  data: DataPoint[],
  col: string
): {
  getColor: (d: DataPoint) => string;
  legendData: { label: string; color: string; extent?: [number, number] }[];
  discreteOrContinuous: string;
  globalColorOrder: string[];
} => {
  const FALLBACK = "steelblue";
  let getColor: (d: DataPoint) => string = () => FALLBACK;
  let legendData: { label: string; color: string; extent?: [number, number] }[] = [];
  let discreteOrContinuous: "discrete" | "continuous" = "discrete";
  let globalColorOrder: string[] = [];

  // 2) If col length = 1 and col[0] is in { "reg", "dat", "anc" }, use your custom maps
  if (col === "Ancestry") {
    // Determine which colormap object to use
    let chosenMap: Record<string, string> = {};
    chosenMap = anc_cmaps;

    // Extract unique 'color' values from data
    const uniqueValues = [
      ...new Set(
        data
          .map((d) => d.Ancestry)
          .filter((c) => c !== null && c !== undefined)
          .map(String)
      ),
    ];

    // The getColor function looks up the color in the chosen map, fallback to "steelblue"
    getColor = (d) => {
      const val = d.Ancestry;
      if (!val) return "steelblue";
      return chosenMap[val] || "steelblue";
    };

    // Build legend data, using either the encountered uniqueValues or all keys from chosenMap
    // Here we just build from encountered uniqueValues to show only what's in data:
    legendData = uniqueValues.map((val) => ({
      label:
        variables.mappingToLong[
        val as keyof typeof variables.mappingToLong
        ] || String(val),             // Or a custom label if you have a mapping
      color: chosenMap[val] || "steelblue",
    }));

    discreteOrContinuous = "discrete";
    globalColorOrder = uniqueValues; // So your chart can order categories consistently
  }
  else if (col === "Individual") {
    const uniqueValues = [
      ...new Set(
        data
          .map((d) => d.Individual_Phase)
          .filter((v) => v !== null && v !== undefined && v !== "")
          .map(String)
      ),
    ];

    const hueFromString = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return h % 360;
    };

    const hash32 = (s: string) => {
      let h = 2166136261; // FNV-1a
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const chosenMap: Record<string, string> = Object.fromEntries(
      uniqueValues.map((val) => {
        const h = hash32(val);

        // Golden-angle-ish dispersion for hue
        const hue = (h * 137.508) % 360;

        // Small deterministic variation (helps when hues land close)
        const sat = 60 + (h % 25);                 // 60..84
        const light = 42 + ((h >>> 8) % 16);       // 42..57

        return [val, `hsl(${hue.toFixed(1)}, ${sat}%, ${light}%)`];
      })
    );


    getColor = (d) => {
      const val = d.Individual_Phase; // or d.Individual
      if (!val) return "steelblue";
      return chosenMap[String(val)] || "steelblue";
    };

    legendData = uniqueValues.map((val) => ({
      label: String(val),
      color: chosenMap[val] || "steelblue",
    }));

    discreteOrContinuous = "discrete";
    globalColorOrder = uniqueValues;
  }



  // 3) If col[0] is in continuousOptionsShort => use continuous colormap logic
  else if (col === "Mean Post. Prob.") {
    const domain: [number, number] = [0.5, 1.0];

    // Fixed "blue" gradient (you can swap to d3.interpolateBlues if you prefer)
    const colorScale = d3
      .scaleSequential(d3.interpolateRgb("lightblue", "darkblue"))
      .domain(domain)
      .clamp(true);

    getColor = (d) => {
      const v = Number(d["Mean Post. Prob."]);
      return Number.isFinite(v) ? colorScale(v) : "steelblue";
    };

    legendData = [
      { label: `Min: ${domain[0]}`, color: colorScale(domain[0]), extent: domain },
      { label: `Max: ${domain[1]}`, color: colorScale(domain[1]), extent: domain },
    ];

    discreteOrContinuous = "continuous";
    globalColorOrder = [];
  }

  return { getColor, legendData, discreteOrContinuous, globalColorOrder };
};

const ChromosomeComponent: React.FC<ChromosomeProps> = ({
  data,
  isSidebarVisible,
  lin,
  chrms,
  ancs,
  mpp,
  chrms_limits,
  min_length,
  color,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (svgRef.current && Array.isArray(data) && data.length > 0) {
      plotChromosomes(
        svgRef.current!,
        data,
        lin,
        chrms,
        ancs,
        mpp,
        chrms_limits,
        min_length,
        color
      );
    }
  }, [data, chrms, chrms_limits, mpp, min_length, color]);

  const handleResize = () => {
    if (containerRef.current && svgRef.current && data) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      svgRef.current.setAttribute("width", String(width));
      svgRef.current.setAttribute("height", String(height));
      plotChromosomes(
        svgRef.current!,
        data,
        lin,
        chrms,
        ancs,
        mpp,
        chrms_limits,
        min_length,
        color
      );
    }
  };

  useEffect(() => {
    // Attach resize event listener
    window.addEventListener("resize", handleResize);
    // Run resize handler once to set initial sizes
    handleResize();
    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, chrms, lin, ancs, chrms_limits, mpp, min_length, color]);

  useEffect(() => {
    // Handle resize when the sidebar visibility changes
    handleResize();
  }, [isSidebarVisible]);

  return (
    <div
      id="chromosome-container"
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <svg id="chromplot" ref={svgRef} />
    </div>
  );
};
export default ChromosomeComponent;

const plotChromosomes = (
  svgElement: SVGSVGElement,
  data: DataPoint[],
  lin: string[],
  chrms: string[],
  ancs: string[],
  mpp: number,
  chrms_limits: [number, number],
  min_length: number,
  color: string
) => {
  d3.select(svgElement).selectAll("*").remove();
  const container = svgElement.parentElement;
  d3.select(container).selectAll(".tooltip").remove();
  const containerMargin = { top: 0, right: 0, bottom: 0, left: -10 };
  const plotMargin = { top: 20, right: -30, bottom: 90, left: 75 };
  const width = container
    ? container.clientWidth - containerMargin.left - containerMargin.right
    : 960;
  const height = container
    ? container.clientHeight - containerMargin.top - containerMargin.bottom
    : 600;

  const plotHeight = height - plotMargin.top - plotMargin.bottom;

  const plotWidth = width - plotMargin.left - plotMargin.right;
  const tooltip = d3.select(container).append("div").attr("class", "tooltip");




  function handleMouseOver(event: any, d: DataPoint) {
    tooltip.transition().duration(200).style("opacity", 0.9);

    const [mouseX, mouseY] = d3.pointer(event, container);

    const htmlContent = `
    <strong>Individual:</strong> ${d.Individual}<br/>
    <strong>Dataset:</strong> ${d.Dataset}<br/>
    <strong>Region:</strong> ${d.Region}<br/>
    <strong>Population:</strong> ${d.Population}<br/>
    <strong>Chromosome:</strong> ${d.Chromosome}<br/>
    <strong>Haplotype:</strong> ${d.Haplotype}<br/>
    <strong>Start:</strong> ${d.Start}<br/>
    <strong>End:</strong> ${d.End}<br/>
    <strong>Length:</strong> ${d.Length}<br/>
    <strong>Mean Post. Prob.:</strong> ${d["Mean Post. Prob."]}<br/>
    <strong>Called Seq.:</strong> ${d["Called Seq."]}<br/>
    <strong>Mutation Rate:</strong> ${d["Mutation Rate"]}<br/>
    <strong>SNPs:</strong> ${d.SNPs}<br/>

    <strong>Ancestry:</strong> ${d.Ancestry}<br/>
    <strong>Min. Distance Ancestry:</strong> ${d["Min. Distance Ancestry"]}<br/>
    <strong>Min. Distance Value:</strong> ${d["Min. Distance Value"]}<br/>
    <strong>Ancestry Z test:</strong> ${d["Ancestry Z test"]}<br/>
    <strong>Distance Z test:</strong> ${d["Distance Z test"]}<br/>
    <strong>P-val Z test:</strong> ${d["P-val Z test"]}<br/>

    <strong>Link. DAVC:</strong> ${d["Link. DAVC"]}<br/>
    <strong>Admixt. Pop. Variants:</strong> ${d["Admixt. Pop. Variants"]}<br/>

    <strong>Vindija:</strong> ${d.Vindija}<br/>
    <strong>Chagyrskaya:</strong> ${d.Chagyrskaya}<br/>
    <strong>Altai:</strong> ${d.Altai}<br/>
    <strong>Denisova:</strong> ${d.Denisova}<br/>

    <strong>Private Vindija:</strong> ${d["Private Vindija"]}<br/>
    <strong>Private Chagyrskaya:</strong> ${d["Private Chagyrskaya"]}<br/>
    <strong>Private Altai:</strong> ${d["Private Altai"]}<br/>
    <strong>Private Denisova:</strong> ${d["Private Denisova"]}<br/>

    <strong>Shared Neanderthal:</strong> ${d["Shared Neanderthal"]}<br/>
    <strong>Shared Archaic:</strong> ${d["Shared Archaic"]}<br/>

    <strong>Sex:</strong> ${d.Sex}<br/>
    <strong>Phase State:</strong> ${d["Phase State"]}<br/>
    <strong>Individual_Phase:</strong> ${d.Individual_Phase}<br/>
  `;

    tooltip
      .html(htmlContent)
      .style("left", mouseX + 10 + "px")
      .style("top", mouseY - 28 + "px");
  }

  function handleMouseMove(event: any, d: DataPoint) {
    const [mouseX, mouseY] = d3.pointer(event, container);
    tooltip.style("left", mouseX + 10 + "px").style("top", mouseY - 28 + "px");
  }

  function handleMouseOut(event: any, d: DataPoint) {
    tooltip.transition().duration(500).style("opacity", 0);
  }

  function reorderChromosomes(chromList: string[]): string[] {
    // Define the desired order
    const desiredOrder = [...Array(22).keys()]
      .map((i) => (i + 1).toString())
      .concat(["X"]);

    // Sort the input list based on the desired order
    return chromList.sort((a, b) => {
      const indexA = desiredOrder.indexOf(a);
      const indexB = desiredOrder.indexOf(b);

      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  const orderedChrms = reorderChromosomes(chrms);

  const svg = d3
    .select(svgElement)
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${plotMargin.left},${plotMargin.top})`);

  // Normalize UI label -> createColorScale key
  const colorKey = color === "Mean Posterior Probability" ? "Mean Post. Prob." : color;

  const { getColor, legendData, discreteOrContinuous } = createColorScale(data, colorKey);

  const maxChromLength = Math.max(
    ...orderedChrms.map((chrom) => chrlen[chrom] || min_length)
  );

  const xScale = d3
    .scaleLinear()
    .domain([chrms_limits[0] * 1000, chrms_limits[1] * 1000])
    .range([0, plotWidth * 0.95]);

  const chrmsCount = chrms.length;
  const chrPadding = 10; // Padding between chromosomes
  const chrHeight = (plotHeight - (chrmsCount - 1) * chrPadding) / chrmsCount; // Space per chromosome minus padding
  // Compute unique lin_hap combinations
  const uniqueLinHap = Array.from(
    new Set(data.map(d => `${d.Individual_Phase}-${d.Haplotype}`))
  );

  // Adjust loop and partitionHeight
  const partitionHeight = chrHeight / uniqueLinHap.length;

  let colorScaleDiscrete: d3.ScaleOrdinal<string, string> | null = null;
  let colorScaleContinous: ((value: number) => string) | null = null;

  if (color === "Ancestry") {
    colorScaleDiscrete = d3
      .scaleOrdinal<string>(d3.schemeCategory10)
      .domain(ancs);
  } else if (color === "Individual") {
    colorScaleDiscrete = d3
      .scaleOrdinal<string>(d3.schemeCategory10)
      .domain(lin);
  } else if (color === "Mean Posterior Probability") {
    // Scale maps from 0.5 to 1, and the result of the scale will be a number between 0 and 1.
    const mppScale = d3
      .scaleLinear<number>()
      .domain([0.5, 1]) // Input domain
      .range([0, 1]); // Range for the interpolator

    // The color scale uses `interpolateBlues` to map the number to a color
    colorScaleContinous = (value: number) =>
      d3.interpolateBlues(mppScale(value));
  }



  // Draw chromosomes
  orderedChrms.forEach((chrom, index) => {
    const chromLength = chrlen[chrom];
    const scaledChromWidth = xScale(chromLength);

    // Calculate the y position for the chromosome based on the index
    const yPos = index * (chrHeight + chrPadding);

    svg
      .append("rect")
      .attr("x", 0)
      .attr("y", yPos)
      .attr("width", scaledChromWidth)
      .attr("height", chrHeight)
      .attr("fill", "white")
      .attr("stroke", "black");
    svg
      .append("text")
      .attr("x", -10) // Position the label slightly to the left of the chromosome
      .attr("y", yPos + chrHeight / 2) // Center label vertically
      .attr("dy", "0.35em") // Small adjustment for text baseline
      .style("text-anchor", "end") // Align text to the right
      .text(`${chrom}`);
    // Filter data for this chromosome
    const chromData = data.filter((d) => d.Chromosome === chrom);


    const normAnc = (s: string) =>
      s.toLowerCase().replace(/\s+/g, "");
    // For each individual, draw their respective rectangle
    uniqueLinHap.forEach((linHapValue, linHapIndex) => {
      const [linValue, hapValueString] = linHapValue.split('-'); // Extract values
      const hapValue: number = Number(hapValueString); // Ensure hapValue is a number
      // Filter data for the individual
      const individualData = chromData.filter((d) => {
        const ancestryOk =
          !ancs?.length || ancs.some((a) => normAnc(a) === normAnc(String(d.Ancestry)));

        return (
          d.Individual_Phase === linValue &&
          d.Haplotype === hapValue &&
          ancestryOk &&
          ancs?.length > 0 &&
          d["Mean Post. Prob."] >= mpp &&
          d.Length >= min_length * 1000 &&
          d.Start >= chrms_limits[0] * 1000
        );
      });
      individualData.forEach((d) => {
        const startX = xScale(d.Start);
        const endX = xScale(d.End);
        const indYPos = yPos + linHapIndex * partitionHeight;

        const fillColor = getColor(d);

        svg
          .append("rect")
          .attr("x", startX)
          .attr("y", indYPos)
          .attr("width", endX - startX)
          .attr("height", partitionHeight)
          .attr("fill", fillColor)
          .on("mouseover", (event) => handleMouseOver(event, d))
          .on("mousemove", (event) => handleMouseMove(event, d))
          .on("mouseout", (event) => handleMouseOut(event, d));

      });
    });
  });

  svg
    .append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(xScale));
  // --------------------
  // Legend (uses createColorScale output)
  // --------------------
  const legendY = plotHeight + 45; // inside bottom margin space
  const legendG = svg.append("g").attr("transform", `translate(0,${legendY})`);

  if (discreteOrContinuous === "continuous") {
    // Expect extent in legendData[0].extent (you set it in createColorScale)
    const extent = legendData[0]?.extent ?? ([0.5, 1.0] as [number, number]);

    const legendWidth = Math.min(400, plotWidth * 0.7);
    const legendHeight = 18;

    // Create/update gradient in defs
    const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");

    const gradientId = "mpp-gradient";
    const gradient = defs
      .select<SVGLinearGradientElement>(`#${gradientId}`)
      .empty()
      ? defs.append("linearGradient").attr("id", gradientId)
      : defs.select<SVGLinearGradientElement>(`#${gradientId}`);

    gradient
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    // Match your createColorScale (lightblue -> darkblue) over extent
    const colorScale = d3
      .scaleSequential(d3.interpolateRgb("lightblue", "darkblue"))
      .domain(extent);

    // Build smooth-ish stops
    const stops = d3.range(0, 11).map((i) => {
      const t = i / 10;
      const v = extent[0] + t * (extent[1] - extent[0]);
      return { offset: `${t * 100}%`, color: colorScale(v) };
    });

    gradient
      .selectAll("stop")
      .data(stops)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    // Center legend horizontally
    const legendX = (plotWidth - legendWidth) / 2;
    legendG.attr("transform", `translate(${legendX},${legendY})`);

    // Gradient bar
    legendG
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", `url(#${gradientId})`)
      .attr("stroke", "black")
      .attr("stroke-width", 0.5);

    // Min / Max labels
    legendG
      .append("text")
      .attr("x", 0)
      .attr("y", legendHeight + 14)
      .style("text-anchor", "start")
      .style("font-size", "12px")
      .text(`${extent[0]}`);

    legendG
      .append("text")
      .attr("x", legendWidth)
      .attr("y", legendHeight + 14)
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .text(`${extent[1]}`);
  } else {
    // Discrete legend based purely on legendData (like HistogramComponent)
    // normalize for matching (case-insensitive + ignore spaces)
    const norm = (s: string) => s.trim().replace(/\s+/g, "").toLowerCase();

    let filteredLegendData = legendData; // default

    if (color === "Ancestry") {
      const ancsSet = new Set(ancs.map(norm));
      filteredLegendData = legendData.filter((item) => ancsSet.has(norm(item.label)));
    }


    // Discrete legend based purely on filteredLegendData
    const padding = 30;
    let cumulativeWidth = 0;

    const tempG = legendG.append("g");

    filteredLegendData.forEach((item) => {
      const g = tempG.append("g").attr("transform", `translate(${cumulativeWidth},0)`);

      g.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", item.color);

      const text = g
        .append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .style("font-size", "12px")
        .text(item.label);

      const textWidth = text.node()?.getBBox().width ?? 0;
      const w = 18 + 6 + textWidth;

      cumulativeWidth += w + padding;
    });

    legendG.attr("transform", `translate(${0},${legendY})`);
  }
}
