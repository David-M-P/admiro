export const SUMM_STAT_PLOT_OPTIONS_SINGLE = [
  "Violin",
  "Histogram",
  "Density",
  "Map",
] as const;

export const SUMM_STAT_PLOT_OPTIONS_DOUBLE = ["Points", "2D Density"] as const;

export const SUMM_STAT_PLOT_OPTIONS = [
  ...SUMM_STAT_PLOT_OPTIONS_SINGLE,
  ...SUMM_STAT_PLOT_OPTIONS_DOUBLE,
] as const;

export type SummStatPlotType = (typeof SUMM_STAT_PLOT_OPTIONS)[number];

export const SUMM_STAT_AXIS_MODES = [
  "Free Axis",
  "Shared Axis",
  "Define Range",
] as const;

export type AxisMode = (typeof SUMM_STAT_AXIS_MODES)[number];

export const SUMM_STAT_PHASE_OPTIONS = ["Unphased", "Phased"] as const;
export type SummStatPhaseOption = (typeof SUMM_STAT_PHASE_OPTIONS)[number];

export const SUMM_STAT_CHROMOSOME_OPTIONS = ["Autosome", "X Chromosome"] as const;
export type SummStatChromosomeOption =
  (typeof SUMM_STAT_CHROMOSOME_OPTIONS)[number];

export const SUMM_STAT_ANCESTRY_OPTIONS = [
  "All",
  "Ambiguous",
  "Denisova",
  "Neanderthal",
  "Altai",
  "Vindija",
  "Chagyrskaya",
  "AmbigNean",
  "Non DAVC",
] as const;
export type SummStatAncestryOption = (typeof SUMM_STAT_ANCESTRY_OPTIONS)[number];

export const SUMM_STAT_REGION_OPTIONS = [
  "Europe",
  "Middle East",
  "South Asia",
  "Africa",
  "East Asia",
  "America",
  "Oceania",
  "Central Asia",
] as const;
export type SummStatRegionOption = (typeof SUMM_STAT_REGION_OPTIONS)[number];
