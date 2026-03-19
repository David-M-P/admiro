import {
  isAncestryComponentField,
  toShortCol,
  toShortCols,
  toShortValue,
} from "@/pages/sum_stats_ind/domain/columns";
import { getNumericValue } from "@/pages/sum_stats_ind/domain/data";
import type { CommonFilterInput, DataRow } from "@/pages/sum_stats_ind/domain/types";

const toShortColumnsForFilter = (columns: string[]) =>
  toShortCols(columns).filter((column) => column.length > 0);

const filterRowsByCoreSelections = <T extends DataRow>(
  rows: T[],
  treeLin: string[],
  ancestries: string[],
  regions: string[],
  chromosomes: string[],
) => {
  const excludedIndividuals = new Set(treeLin ?? []);
  const ancestryAllowed = new Set((ancestries ?? []).map((value) => toShortValue("anc", value)));
  const regionsAllowed = new Set((regions ?? []).map((value) => toShortValue("reg", value)));
  const chromosomesAllowed = new Set(
    (chromosomes ?? []).map((value) => toShortValue("chrom", value)),
  );

  return rows.filter((row) => {
    if (excludedIndividuals.size > 0 && excludedIndividuals.has(String(row.ind_phase))) {
      return false;
    }
    if (ancestryAllowed.size > 0 && !ancestryAllowed.has(String(row.anc))) return false;
    if (regionsAllowed.size > 0 && !regionsAllowed.has(String(row.reg))) return false;

    const chromosome = String(row.chrom);
    const chromosomePass =
      chromosomesAllowed.has(chromosome) ||
      (chromosomesAllowed.has("A") && (chromosome === "A" || /^\d+$/.test(chromosome)));

    if (!chromosomePass) return false;
    return true;
  });
};

const filterRowsByAncestryPresence = <T extends DataRow>(
  rows: T[],
  ancestryRequiredColumns: string[],
) => {
  const requiredShortColumns = toShortColumnsForFilter(ancestryRequiredColumns).filter(
    (column) => isAncestryComponentField(column),
  );

  if (requiredShortColumns.length === 0) return rows;

  return rows.filter((row) =>
    requiredShortColumns.every((column) => row[column] !== null),
  );
};

const filterRowsByFiniteColumns = <T extends DataRow>(
  rows: T[],
  finiteColumns: string[],
) => {
  const shortColumns = toShortColumnsForFilter(finiteColumns);
  if (shortColumns.length === 0) return rows;
  return rows.filter((row) =>
    shortColumns.every((column) => Number.isFinite(getNumericValue(row, column))),
  );
};

export const applyCommonDataFilters = <T extends DataRow>({
  rows,
  treeLin,
  ancestries,
  regions,
  chromosomes,
  ancestryRequiredColumns = [],
  finiteColumns = [],
}: CommonFilterInput<T>): T[] => {
  const selectedRows = filterRowsByCoreSelections(
    rows,
    treeLin,
    ancestries,
    regions,
    chromosomes,
  );
  const ancestrySafeRows = filterRowsByAncestryPresence(selectedRows, ancestryRequiredColumns);
  return filterRowsByFiniteColumns(ancestrySafeRows, finiteColumns);
};

export const toShortColumn = toShortCol;

