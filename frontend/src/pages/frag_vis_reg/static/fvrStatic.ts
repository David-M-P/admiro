import { chrms_all } from "@/assets/sharedOptions";

export const FRAG_VIS_REG_PLOT_TYPES = [
  "Frequency",
  "Comparison",
  "Correlation",
] as const;
export type FragVisRegPlotType = (typeof FRAG_VIS_REG_PLOT_TYPES)[number];

export const FREQUENCY_PHASE_OPTIONS = ["Phased", "Unphased"] as const;
export type FrequencyPhaseState = (typeof FREQUENCY_PHASE_OPTIONS)[number];

export const FREQUENCY_REGION_OPTIONS = [
  "America",
  "Ayta",
  "East Asia",
  "Europe",
  "Global",
  "Middle East",
  "Oceania",
  "South Asia",
] as const;
export type FrequencyRegion = (typeof FREQUENCY_REGION_OPTIONS)[number];

export const FREQUENCY_ANCESTRY_OPTIONS = [
  "All",
  "Ambiguous",
  "Denisova",
  "Neanderthal",
  "Non DAVC",
] as const;
export type FrequencyAncestry = (typeof FREQUENCY_ANCESTRY_OPTIONS)[number];

export const FREQUENCY_PHASE_TO_PAYLOAD: Record<FrequencyPhaseState, "PDAT" | "DATA"> = {
  Phased: "PDAT",
  Unphased: "DATA",
};

export const FREQUENCY_REGION_TO_PAYLOAD: Record<string, string> = {
  Europe: "EUR",
  "Middle East": "MID",
  "South Asia": "SAS",
  Africa: "AFR",
  "East Asia": "EAS",
  America: "AMR",
  Oceania: "OCE",
  "Central Asia": "CAS",
  Global: "GLOB",
  Ayta: "AYT",
};

export const FREQUENCY_ANCESTRY_TO_PAYLOAD: Record<string, string> = {
  All: "All",
  Ambiguous: "Ambiguous",
  Denisova: "Denisova",
  Neanderthal: "Neanderthal",
  Altai: "Altai",
  Vindija: "Vindija",
  Chagyrskaya: "Chagyrskaya",
  AmbigNean: "AmbigNean",
  "Non DAVC": "nonDAVC",
};

export type FrequencyLineStatus = "idle" | "loading" | "loaded" | "error";

export interface FrequencyLineFilters {
  phase_state: FrequencyPhaseState;
  region: FrequencyRegion;
  ancestry: FrequencyAncestry;
  mpp: number;
}

export interface FrequencyRow {
  chromosome: string;
  start: number;
  end: number;
  n_with_archaic: number;
  n_total: number;
  frequency: number;
}

export interface FrequencyLineState {
  lineId: number;
  filters: FrequencyLineFilters;
  status: FrequencyLineStatus;
  rawRows: unknown[];
  rows: FrequencyRow[];
  visible: boolean;
  error?: string;
}

export interface FragVisRegState {
  plotType: FragVisRegPlotType;
  chrms: string[];
  chrms_limits: [number, number];
  smoothing_window_kbp: number;
  selectedLineId: number;
  lines: FrequencyLineState[];
}

export const MAX_FREQUENCY_LINES = 10;
export const FREQUENCY_SMOOTHING_WINDOW_MIN_KBP = 250;
export const FREQUENCY_SMOOTHING_WINDOW_MAX_KBP = 2750;
export const FREQUENCY_SMOOTHING_WINDOW_STEP_KBP = 250;
export const DEFAULT_FREQUENCY_SMOOTHING_WINDOW_KBP = 1000;
export const FREQUENCY_SMOOTHING_WINDOW_MARKS = [
  { value: 250, label: "250" },
  { value: 1500, label: "1,500" },
  { value: 2750, label: "2,750" },
];

export const DEFAULT_FREQUENCY_LINE_FILTERS: FrequencyLineFilters = {
  phase_state: "Unphased",
  region: "Global",
  ancestry: "All",
  mpp: 0.5,
};

export const DEFAULT_FRAG_VIS_REG_STATE: FragVisRegState = {
  plotType: "Frequency",
  chrms: [...chrms_all.options],
  chrms_limits: [0, 250000],
  smoothing_window_kbp: DEFAULT_FREQUENCY_SMOOTHING_WINDOW_KBP,
  selectedLineId: 1,
  lines: Array.from({ length: MAX_FREQUENCY_LINES }, (_, index) => ({
    lineId: index + 1,
    filters: { ...DEFAULT_FREQUENCY_LINE_FILTERS },
    status: "idle",
    rawRows: [],
    rows: [],
    visible: false,
  })),
};

const CHROMOSOME_ORDER = [...Array(22).keys()].map((i) => String(i + 1)).concat("X");

export const sortChromosomes = (chromosomes: string[]) => {
  const unique = Array.from(new Set(chromosomes));
  return unique.sort((a, b) => CHROMOSOME_ORDER.indexOf(a) - CHROMOSOME_ORDER.indexOf(b));
};

const FREQUENCY_LINE_PALETTE = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc949",
  "#af7aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ab",
] as const;

export const getFrequencyLineColor = (lineId: number) =>
  FREQUENCY_LINE_PALETTE[(Math.max(1, lineId) - 1) % FREQUENCY_LINE_PALETTE.length];

export const getFrequencyLineLabel = (
  lineId: number,
  filters: FrequencyLineFilters
) => `L${lineId} | ${filters.phase_state} | ${filters.region} | ${filters.ancestry} | ${filters.mpp.toFixed(2)}`;
