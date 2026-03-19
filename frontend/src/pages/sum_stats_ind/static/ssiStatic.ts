import {
  SUMM_STAT_ANCESTRY_OPTIONS,
  SUMM_STAT_AXIS_MODES,
  SUMM_STAT_CHROMOSOME_OPTIONS,
  SUMM_STAT_PHASE_OPTIONS,
  SUMM_STAT_REGION_OPTIONS,
} from "@/pages/sum_stats_ind/config/options";
import { mapping } from "@/pages/sum_stats_ind/static/mapping";
import type { SummStatFilterState } from "@/types/filter-state";

export type FilterState = SummStatFilterState;
export const mppMarks = [
  { value: 0.5, label: "50%" },
  { value: 0.55, label: "" },
  { value: 0.6, label: "" },
  { value: 0.65, label: "65%" },
  { value: 0.7, label: "" },
  { value: 0.75, label: "" },
  { value: 0.8, label: "80%" },
  { value: 0.85, label: "" },
  { value: 0.9, label: "" },
  { value: 0.95, label: "95%" },
];

export const optionsAxis = [...SUMM_STAT_AXIS_MODES];
export const mapJitMarks = [
  { value: 0, label: "0" },
  { value: 1, label: "" },
  { value: 2, label: "" },
  { value: 3, label: "" },
  { value: 4, label: "" },
  { value: 5, label: "5" },
  { value: 6, label: "" },
  { value: 7, label: "" },
  { value: 8, label: "" },
  { value: 9, label: "" },
  { value: 10, label: "10" },
];



export const datasets = {
  options_old: [
    "DATA",
    "PDAT",
    "GNOM",
    "PGNO",
    "GENI",
    "PGEN",
    "1KGP",
    "HGDP",
    "SGDP",
    "VANU",
    "IGDP",
    "AYTA",
    "OFAR",
  ],
  options: [...SUMM_STAT_PHASE_OPTIONS],
};

export const mappingToLong = {
  ...mapping.toLong,
  ...mapping.values.reg.toLong,
  ...mapping.values.chrom.toLong,
  ...mapping.values.anc.toLong,
  ...mapping.values.phase_state.toLong,
  EUR: "Europe",
  MID: "Middle East",
  SAS: "South Asia",
  AFR: "Africa",
  EAS: "East Asia",
  AMR: "America",
  OCE: "Oceania",
  CAS: "Central Asia",
  GLOB: "Global",
  DATA: "Diploid",
  PDAT: "Phased",
  A: "Autosome",
  X: "X",
  Xprime: "X Prime",
  F: "Female",
  M: "Male",
  All: "All",
  Ambiguous: "Ambiguous",
  den: "Denisova",
  Neanderthal: "Neanderthal",
  alt: "Altai",
  vin: "Vindija",
  cha: "Chagyrskaya",
  AmbigNean: "AmbigNean",
  nonDAVC: "Non DAVC",
};

export const binMarks = [
  { value: 0, label: "0" },
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 75, label: "75" },
  { value: 100, label: "100" },
];

export const bandwidthDivisorMarks = [
  { value: 1, label: "Dense" },
  { value: 100, label: "Light" },
];

export const tdBandwidthDivisorMarks = [
  { value: 1, label: "Detailed" },
  { value: 50, label: "Smooth" },
];


export const tdThresholdDivisorMarks = [
  { value: 10, label: "Less" },
  { value: 45, label: "More" },
];

export const phases = {
  options: [...SUMM_STAT_PHASE_OPTIONS],
};
export const variables = {
  allOptions: [
    "Chromosome",
    "Phase state",
    "Ancestry",
    "Haplotype",
    "Mean Length (bp)",
    "Median Length (bp)",
    "Max Length (bp)",
    "Min Length (bp)",
    "N Fragments",
    "Sequence (bp)",
    "Sex",
    "Region",
    "Dataset",
    "Population",
    "Anc Africa",
    "Anc America",
    "Anc East Asia",
    "Anc Europe",
    "Anc Oceania",
    "Anc Oceania 2",
    "Anc South Asia",
    "Anc Middle East",
  ],
  discreteOptions: [
    "Chromosome",
    "Phase state",
    "Ancestry",
    "Haplotype",
    "Sex",
    "Region",
    "Dataset",
    "Population",
  ],
  continousOptions: [
    "Mean Length (bp)",
    "Median Length (bp)",
    "Max Length (bp)",
    "Min Length (bp)",
    "N Fragments",
    "Sequence (bp)", "Anc Africa",
    "Anc America",
    "Anc East Asia",
    "Anc Europe",
    "Anc Oceania",
    "Anc Oceania 2",
    "Anc South Asia",
    "Anc Middle East",
  ],
  continuousOptions: [
    "Mean Length (bp)",
    "Median Length (bp)",
    "Max Length (bp)",
    "Min Length (bp)",
    "N Fragments",
    "Sequence (bp)",
    "Anc Africa",
    "Anc America",
    "Anc East Asia",
    "Anc Europe",
    "Anc Oceania",
    "Anc Oceania 2",
    "Anc South Asia",
    "Anc Middle East",
  ],
};

export const ancestries = {
  options: [...SUMM_STAT_ANCESTRY_OPTIONS],
};

export const chromosomes = {
  options: [...SUMM_STAT_CHROMOSOME_OPTIONS],
};

export const regions = {
  options: [...SUMM_STAT_REGION_OPTIONS],
};
