import type { AxisMode, SummStatPlotType } from "@/pages/sum_stats_ind/config/options";
import type { DataPoint } from "@/types/sum_stat_ind_datapoint";

export type { AxisMode, SummStatPlotType };

export type DataRow = DataPoint & Record<string, unknown>;

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

