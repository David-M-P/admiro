import { chrms_all } from "@/assets/sharedOptions";

export const FRAG_VIS_REG_PLOT_TYPES = [
  "Frequency",
  "Comparison",
  "Composition Plot",
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

export const COMPARISON_SET_MODE_OPTIONS = ["Joined", "Shared", "Private"] as const;
export type ComparisonSetMode = (typeof COMPARISON_SET_MODE_OPTIONS)[number];

export const COMPARISON_REGION_OPTIONS = [
  "America",
  "Ayta",
  "East Asia",
  "Europe",
  "Middle East",
  "Oceania",
  "South Asia",
] as const;
export type ComparisonRegion = (typeof COMPARISON_REGION_OPTIONS)[number];

export const COMPARISON_REGION_CODE_ORDER = [
  "AMR",
  "AYT",
  "EAS",
  "EUR",
  "MID",
  "OCE",
  "SAS",
] as const;
export type ComparisonRegionCode = (typeof COMPARISON_REGION_CODE_ORDER)[number];

export const COMPARISON_PRESENCE_COLUMNS = [
  "idx_1",
  "idx_2",
  "idx_3",
  "idx_4",
  "idx_5",
  "idx_6",
  "idx_7",
] as const;
export type ComparisonPresenceColumn = (typeof COMPARISON_PRESENCE_COLUMNS)[number];

export const COMPARISON_REGION_TO_CODE: Record<ComparisonRegion, ComparisonRegionCode> = {
  America: "AMR",
  Ayta: "AYT",
  "East Asia": "EAS",
  Europe: "EUR",
  "Middle East": "MID",
  Oceania: "OCE",
  "South Asia": "SAS",
};

export const COMPARISON_REGION_CODE_TO_LABEL: Record<ComparisonRegionCode, ComparisonRegion> = {
  AMR: "America",
  AYT: "Ayta",
  EAS: "East Asia",
  EUR: "Europe",
  MID: "Middle East",
  OCE: "Oceania",
  SAS: "South Asia",
};

export const COMPARISON_REGION_CODE_TO_COLUMN: Record<
  ComparisonRegionCode,
  ComparisonPresenceColumn
> = {
  AMR: "idx_1",
  AYT: "idx_2",
  EAS: "idx_3",
  EUR: "idx_4",
  MID: "idx_5",
  OCE: "idx_6",
  SAS: "idx_7",
};

export const COMPOSITION_PHASE_OPTIONS = FREQUENCY_PHASE_OPTIONS;
export type CompositionPhaseState = FrequencyPhaseState;

export const COMPOSITION_ANCESTRY_OPTIONS = FREQUENCY_ANCESTRY_OPTIONS;
export type CompositionAncestry = FrequencyAncestry;

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
export type ComparisonLineStatus = "idle" | "loading" | "loaded" | "error";
export type CompositionStatus = "idle" | "loading" | "loaded" | "error";

export interface FrequencyLineFilters {
  phase_state: FrequencyPhaseState;
  region: FrequencyRegion;
  ancestry: FrequencyAncestry;
  mpp: number;
}

export interface ComparisonLineFilters {
  phase_state: FrequencyPhaseState;
  ancestry: FrequencyAncestry;
  mpp: number;
  set_mode: ComparisonSetMode;
  regions: ComparisonRegion[];
}

export interface CompositionFilters {
  phase_state: CompositionPhaseState;
  ancestry: CompositionAncestry;
  mpp: number;
  barCount: number;
}

export interface FrequencyRow {
  chromosome: string;
  start: number;
  end: number;
  n_with_archaic: number;
  n_total: number;
  frequency: number;
}

export interface ComparisonRow {
  chromosome: string;
  start: number;
  end: number;
  presence: Record<ComparisonRegionCode, boolean>;
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

export interface ComparisonLineState {
  lineId: number;
  filters: ComparisonLineFilters;
  status: ComparisonLineStatus;
  rawRows: unknown[];
  rows: ComparisonRow[];
  visible: boolean;
  error?: string;
}

export interface CompositionRow {
  index: number;
  pop_combination: string[];
  total_sequence: number;
}

export interface CompositionState {
  filters: CompositionFilters;
  status: CompositionStatus;
  rawRows: unknown[];
  rows: CompositionRow[];
  error?: string;
}

export interface FragVisRegState {
  plotType: FragVisRegPlotType;
  chrms: string[];
  chrms_limits: [number, number];
  smoothing_window_kbp: number;
  comparison_min_fragment_length_kbp: number;
  selectedLineId: number;
  selectedComparisonLineId: number;
  lines: FrequencyLineState[];
  comparisonLines: ComparisonLineState[];
  composition: CompositionState;
}

export const MAX_FREQUENCY_LINES = 10;
export const MAX_COMPARISON_LINES = 10;

export const FREQUENCY_SMOOTHING_WINDOW_MIN_KBP = 250;
export const FREQUENCY_SMOOTHING_WINDOW_MAX_KBP = 2750;
export const FREQUENCY_SMOOTHING_WINDOW_STEP_KBP = 250;
export const DEFAULT_FREQUENCY_SMOOTHING_WINDOW_KBP = 1000;
export const FREQUENCY_SMOOTHING_WINDOW_MARKS = [
  { value: 250, label: "250" },
  { value: 1500, label: "1,500" },
  { value: 2750, label: "2,750" },
];

export const COMPARISON_MIN_FRAGMENT_LENGTH_MIN_KBP = 0;
export const COMPARISON_MIN_FRAGMENT_LENGTH_MAX_KBP = 10000;
export const COMPARISON_MIN_FRAGMENT_LENGTH_STEP_KBP = 50;
export const DEFAULT_COMPARISON_MIN_FRAGMENT_LENGTH_KBP = 0;
export const COMPARISON_MIN_FRAGMENT_LENGTH_MARKS = [
  { value: 0, label: "0" },
  { value: 1000, label: "1,000" },
  { value: 5000, label: "5,000" },
  { value: 10000, label: "10,000" },
];

export const DEFAULT_FREQUENCY_LINE_FILTERS: FrequencyLineFilters = {
  phase_state: "Unphased",
  region: "Global",
  ancestry: "All",
  mpp: 0.5,
};

export const DEFAULT_COMPARISON_LINE_FILTERS: ComparisonLineFilters = {
  phase_state: "Unphased",
  ancestry: "All",
  mpp: 0.5,
  set_mode: "Joined",
  regions: [...COMPARISON_REGION_OPTIONS],
};

export const DEFAULT_COMPOSITION_FILTERS: CompositionFilters = {
  phase_state: "Unphased",
  ancestry: "All",
  mpp: 0.5,
  barCount: 50,
};

export const COMPOSITION_BAR_COUNT_MIN = 2;
export const COMPOSITION_BAR_COUNT_MAX = 100;

export const COMPOSITION_POPULATION_ORDER = [
  "AMR",
  "AYT",
  "EAS",
  "EUR",
  "MID",
  "OCE",
  "SAS",
] as const;
export type CompositionPopulation = (typeof COMPOSITION_POPULATION_ORDER)[number];

export const COMPOSITION_POPULATION_COLORS: Record<CompositionPopulation, string> = {
  AMR: "#fc4c3c",
  MID: "#EC8510",
  OCE: "#04B3BD",
  EUR: "#0474bc",
  EAS: "#34bc2c",
  AYT: "yellow",
  SAS: "#804474",
};

export const COMPOSITION_MULTI_POP_COLOR = "#9e9e9e";

export const DEFAULT_FRAG_VIS_REG_STATE: FragVisRegState = {
  plotType: "Frequency",
  chrms: [...chrms_all.options],
  chrms_limits: [0, 250000],
  smoothing_window_kbp: DEFAULT_FREQUENCY_SMOOTHING_WINDOW_KBP,
  comparison_min_fragment_length_kbp: DEFAULT_COMPARISON_MIN_FRAGMENT_LENGTH_KBP,
  selectedLineId: 1,
  selectedComparisonLineId: 1,
  lines: Array.from({ length: MAX_FREQUENCY_LINES }, (_, index) => ({
    lineId: index + 1,
    filters: { ...DEFAULT_FREQUENCY_LINE_FILTERS },
    status: "idle",
    rawRows: [],
    rows: [],
    visible: false,
  })),
  comparisonLines: Array.from({ length: MAX_COMPARISON_LINES }, (_, index) => ({
    lineId: index + 1,
    filters: { ...DEFAULT_COMPARISON_LINE_FILTERS },
    status: "idle",
    rawRows: [],
    rows: [],
    visible: false,
  })),
  composition: {
    filters: { ...DEFAULT_COMPOSITION_FILTERS },
    status: "idle",
    rawRows: [],
    rows: [],
  },
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
) =>
  `L${lineId} | ${filters.phase_state} | ${filters.region} | ${filters.ancestry} | ${filters.mpp.toFixed(2)}`;

export const getComparisonLineLabel = (
  lineId: number,
  filters: ComparisonLineFilters
) => {
  const selectedCodes =
    filters.regions.length === 0
      ? "All"
      : filters.regions
        .map((region) => COMPARISON_REGION_TO_CODE[region])
        .join("+");
  return `L${lineId} | ${filters.phase_state} | ${filters.ancestry} | ${filters.mpp.toFixed(
    2
  )} | ${filters.set_mode} | ${selectedCodes}`;
};
