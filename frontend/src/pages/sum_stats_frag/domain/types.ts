import type { AxisMode, SummStatFragPlotType } from "@/pages/sum_stats_frag/config/options";

export type { AxisMode, SummStatFragPlotType };

export interface FragmentDataPoint {
  [key: string]: string | number;
  chrom: string;
  start: number;
  end: number;
  len: number;
  hap: number;
  mpp: number;
  called_seq: number;
  mut_rate: number;
  snps: number;
  admx_pop_variants: number;
  link_davc: number;
  vin: number;
  cha: number;
  alt: number;
  den: number;
  private_vin: number;
  private_cha: number;
  private_alt: number;
  private_den: number;
  shared_nea: number;
  shared_arch: number;
  anc: string;
  min_dist_anc: string;
  min_dist_val: number;
  anc_z_test: string;
  dist_z_test: number;
  pval_z_test: number;
  ind: string;
  phase_state: string;
  ind_phase: string;
  sex: string;
  pop: string;
  reg: string;
  dat: string;
}

export type DataRow = FragmentDataPoint & Record<string, unknown>;

export interface LegendItem {
  label: string;
  color: string;
  extent?: [number, number];
}

export interface FacetGroup<T extends DataRow = DataRow> {
  key: string;
  title: string;
  points: T[];
}

export interface CommonFilterInput<T extends DataRow = DataRow> {
  rows: T[];
  treeLin: string[];
  ancestries: string[];
  regions: string[];
  chromosomes: string[];
  ancestryRequiredColumns?: string[];
  finiteColumns?: string[];
}

export interface ColorScaleResult<T extends DataRow = DataRow> {
  getColor: (row: T) => string;
  getColorFromKey: (key: string) => string;
  legendData: LegendItem[];
  discreteOrContinuous: "default" | "continuous" | "discrete";
  globalColorOrder: string[];
  colorKey: (row: T) => string;
  continuousColorFieldShort: string | null;
}
