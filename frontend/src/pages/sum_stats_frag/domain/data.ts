import * as d3 from "d3";

import { toLongCol, toLongValue } from "@/pages/sum_stats_frag/domain/columns";
import type { DataRow, FragmentDataPoint } from "@/pages/sum_stats_frag/domain/types";

const RAW_TO_SHORT: Record<string, keyof FragmentDataPoint> = {
  Chromosome: "chrom",
  Start: "start",
  End: "end",
  Length: "len",
  Haplotype: "hap",
  "Mean Post. Prob.": "mpp",
  "Called Seq.": "called_seq",
  "Mutation Rate": "mut_rate",
  SNPs: "snps",
  "Admixt. Pop. Variants": "admx_pop_variants",
  "Link. DAVC": "link_davc",
  Vindija: "vin",
  Chagyrskaya: "cha",
  Altai: "alt",
  Denisova: "den",
  "Private Vindija": "private_vin",
  "Private Chagyrskaya": "private_cha",
  "Private Altai": "private_alt",
  "Private Denisova": "private_den",
  "Shared Neanderthal": "shared_nea",
  "Shared Archaic": "shared_arch",
  Ancestry: "anc",
  "Min. Distance Ancestry": "min_dist_anc",
  "Min. Distance Value": "min_dist_val",
  "Ancestry Z test": "anc_z_test",
  "Distance Z test": "dist_z_test",
  "P-val Z test": "pval_z_test",
  Individual: "ind",
  "Phase State": "phase_state",
  Individual_Phase: "ind_phase",
  Sex: "sex",
  Population: "pop",
  Region: "reg",
  Dataset: "dat",
};

const NUMERIC_FIELDS: Array<keyof FragmentDataPoint> = [
  "start",
  "end",
  "len",
  "hap",
  "mpp",
  "called_seq",
  "mut_rate",
  "snps",
  "admx_pop_variants",
  "link_davc",
  "vin",
  "cha",
  "alt",
  "den",
  "private_vin",
  "private_cha",
  "private_alt",
  "private_den",
  "shared_nea",
  "shared_arch",
  "min_dist_val",
  "dist_z_test",
  "pval_z_test",
];

const normalizeChromosome = (value: unknown): string => {
  const asString = value == null ? "" : String(value).trim();
  const withoutPrefix = asString.replace(/^chr/i, "");
  if (withoutPrefix.toUpperCase() === "X") return "X";
  return withoutPrefix.replace(/^0+/, "") || withoutPrefix;
};

const normalizePhaseState = (value: unknown): string => {
  const asString = value == null ? "" : String(value).trim().toLowerCase();
  return asString === "phased" ? "phased" : "unphased";
};

const normalizeString = (value: unknown): string => (value == null ? "" : String(value));

const normalizeNumeric = (value: unknown): number => {
  if (typeof value === "number") return value;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : Number.NaN;
};

export const normalizeFragmentRows = (rows: Record<string, unknown>[]): FragmentDataPoint[] => {
  return rows.map((row) => {
    const normalized = {} as FragmentDataPoint;

    for (const [rawKey, shortKey] of Object.entries(RAW_TO_SHORT)) {
      const rawValue = row[rawKey];
      if (shortKey === "chrom") {
        normalized[shortKey] = normalizeChromosome(rawValue) as FragmentDataPoint[typeof shortKey];
      } else if (shortKey === "phase_state") {
        normalized[shortKey] = normalizePhaseState(rawValue) as FragmentDataPoint[typeof shortKey];
      } else if (NUMERIC_FIELDS.includes(shortKey)) {
        normalized[shortKey] = normalizeNumeric(rawValue) as FragmentDataPoint[typeof shortKey];
      } else {
        normalized[shortKey] = normalizeString(rawValue) as FragmentDataPoint[typeof shortKey];
      }
    }

    return normalized;
  });
};

export const asNum = (value: unknown) =>
  value === null || value === undefined ? Number.NaN : Number(value);

export const getNumericValue = (row: DataRow, key: string) => asNum(row[key]);

export const getStringValue = (row: DataRow, key: string) => {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
};

export const keyFromCols =
  (columnsShort: string[], emptyKey = "__all__") =>
  (row: DataRow): string => {
    if (columnsShort.length === 0) return emptyKey;
    if (columnsShort.length === 1) return getStringValue(row, columnsShort[0]);
    return columnsShort.map((column) => getStringValue(row, column)).join("_");
  };

export const extentWithBuffer = (
  rows: DataRow[],
  keyShort: string,
  bufferFraction = 0.05,
): [number, number] => {
  const values = rows.map((row) => getNumericValue(row, keyShort)).filter(Number.isFinite);

  if (values.length === 0) return [0, 1];

  let minimum = d3.min(values) ?? 0;
  let maximum = d3.max(values) ?? 1;

  if (minimum === maximum) {
    minimum -= 1;
    maximum += 1;
  }

  const buffer = (maximum - minimum) * bufferFraction;
  return [minimum - buffer, maximum + buffer];
};

export const toDisplayRow = (row: FragmentDataPoint): Record<string, unknown> => {
  const entries = Object.entries(row).map(([shortKey, value]) => [
    toLongCol(shortKey),
    typeof value === "string" ? toLongValue(shortKey, value) : value,
  ]);
  return Object.fromEntries(entries);
};
