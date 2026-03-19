import type {
  AxisMode,
  SummStatAncestryOption,
  SummStatChromosomeOption,
  SummStatPhaseOption,
  SummStatPlotType,
  SummStatRegionOption,
} from "@/pages/sum_stats_ind/config/options";
import type {
  ColorScaleResult,
  CommonFilterInput,
  FacetGroup,
} from "@/pages/sum_stats_ind/domain/types";

export type { AxisMode, ColorScaleResult, CommonFilterInput, FacetGroup, SummStatPlotType };

export interface SummStatFilterState {
  phases: SummStatPhaseOption[];
  var_1: string;
  data_1: string[];
  reg_1: SummStatRegionOption[];
  mpp_1: number;
  chrms_1: SummStatChromosomeOption[];
  ancs_1: SummStatAncestryOption[];
  var_2_1: string;
  var_2_2: string;
  col: string[];
  fac_x: string[];
  fac_y: string[];
  mea_med_1: boolean;
  mea_med_x: boolean;
  mea_med_y: boolean;
  plot: SummStatPlotType | "";
  n_bins: number;
  x_axis: AxisMode;
  min_x_axis: number;
  max_x_axis: number;
  y_axis: AxisMode;
  min_y_axis: number;
  max_y_axis: number;
  map_data: boolean;
  map_data_rad: number;
  map_reg: boolean;
  map_reg_rad: number;
  map_pop: boolean;
  map_pop_rad: number;
  map_ind_rad: number;
  map_lat_jit: number;
  map_lon_jit: number;
  tree_lin: string[];
  bandwidth_divisor: number;
  thresholds: number;
}

export interface FragVisFilterState {
  tree_lin: string[];
  chrms: string[];
  ancs: string[];
  mpp: number;
  chrms_limits: [number, number];
  min_length: number;
  color: string;
}
