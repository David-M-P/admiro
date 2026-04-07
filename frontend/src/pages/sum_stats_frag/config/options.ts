export const SUMM_STAT_FRAG_PLOT_OPTIONS_SINGLE = [
  "Violin",
  "Histogram",
  "Density",
] as const;

export const SUMM_STAT_FRAG_PLOT_OPTIONS_DOUBLE = ["Points", "2D Density"] as const;

export const SUMM_STAT_FRAG_PLOT_OPTIONS = [
  ...SUMM_STAT_FRAG_PLOT_OPTIONS_SINGLE,
  ...SUMM_STAT_FRAG_PLOT_OPTIONS_DOUBLE,
] as const;

export type SummStatFragPlotType = (typeof SUMM_STAT_FRAG_PLOT_OPTIONS)[number];

export const SUMM_STAT_FRAG_AXIS_MODES = [
  "Free Axis",
  "Shared Axis",
  "Define Range",
] as const;

export type AxisMode = (typeof SUMM_STAT_FRAG_AXIS_MODES)[number];

export const SUMM_STAT_PLOT_OPTIONS_SINGLE = SUMM_STAT_FRAG_PLOT_OPTIONS_SINGLE;
export const SUMM_STAT_PLOT_OPTIONS_DOUBLE = SUMM_STAT_FRAG_PLOT_OPTIONS_DOUBLE;
export const SUMM_STAT_PLOT_OPTIONS = SUMM_STAT_FRAG_PLOT_OPTIONS;

export type SummStatPlotType = SummStatFragPlotType;
