import { mapping } from "@/pages/sum_stats_frag/static/mapping";
import { variables } from "@/pages/sum_stats_frag/static/ssiStatic";

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const createNormalizedLookup = (source: Record<string, string>) => {
  const lookup: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    lookup[normalize(key)] = value;
  }
  return lookup;
};

export const toShortCol = (value: string) => mapping.toShort[value] ?? value;
export const toLongCol = (value: string) => mapping.toLong[value] ?? value;
export const toShortCols = (values: string[]) => values.map(toShortCol).filter(Boolean);

const valueShortLookups = {
  anc: createNormalizedLookup(mapping.values.anc.toShort),
  reg: createNormalizedLookup(mapping.values.reg.toShort),
  phase_state: createNormalizedLookup(mapping.values.phase_state.toShort),
  sex: createNormalizedLookup(mapping.values.sex.toShort),
} as const;

const valueLongLookups = {
  anc: mapping.values.anc.toLong,
  reg: mapping.values.reg.toLong,
  phase_state: mapping.values.phase_state.toLong,
  sex: mapping.values.sex.toLong,
} as const;

export type ValueField = keyof typeof valueShortLookups;

export const toShortValue = (field: ValueField, value: string) => {
  return valueShortLookups[field][normalize(value)] ?? value;
};

export const toLongValue = (columnKeyShort: string, value: unknown): string => {
  if (value === null || value === undefined) return "NA";
  const asString = String(value);
  const fieldLookup = valueLongLookups[columnKeyShort as keyof typeof valueLongLookups];
  return fieldLookup?.[asString] ?? asString;
};

const continuousShortSet = new Set(variables.continuousOptions.map(toShortCol));
const discreteShortSet = new Set(variables.discreteOptions.map(toShortCol));

export const isContinuousColumn = (value: string) => continuousShortSet.has(toShortCol(value));
export const isDiscreteColumn = (value: string) => discreteShortSet.has(toShortCol(value));
