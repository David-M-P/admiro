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
  selectedLineId: number;
  lines: FrequencyLineState[];
}

export const MAX_FREQUENCY_LINES = 10;
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

const fnv32a = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const frequencyLineKey = (filters: FrequencyLineFilters) =>
  `${filters.phase_state}_${filters.region}_${filters.ancestry}_${filters.mpp.toFixed(2)}`;

export const getFrequencyLineColor = (filters: FrequencyLineFilters) => {
  const hash = fnv32a(frequencyLineKey(filters));
  const hue = hash % 360;
  const sat = 58 + (hash % 20);
  const light = 42 + ((hash >>> 8) % 12);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
};

export const getFrequencyLineLabel = (
  lineId: number,
  filters: FrequencyLineFilters
) => `L${lineId} | ${filters.phase_state} | ${filters.region} | ${filters.ancestry} | ${filters.mpp.toFixed(2)}`;
