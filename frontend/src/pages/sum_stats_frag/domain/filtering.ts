import { toShortCols } from "@/pages/sum_stats_frag/domain/columns";
import { getNumericValue } from "@/pages/sum_stats_frag/domain/data";
import type { CommonFilterInput, DataRow } from "@/pages/sum_stats_frag/domain/types";

interface BrowserFilterInput<T extends DataRow = DataRow> {
  rows: T[];
  minimumPosteriorProbability: number;
  ancestries: string[];
  chromosomes: string[];
}

export const applyBrowserDataFilters = <T extends DataRow>({
  rows,
  minimumPosteriorProbability,
  ancestries,
  chromosomes,
}: BrowserFilterInput<T>): T[] => {
  if (ancestries.length === 0 || chromosomes.length === 0) return [];

  const ancestryAllowed = new Set(ancestries);
  const chromosomesAllowed = new Set(chromosomes);
  const threshold = minimumPosteriorProbability / 100;

  return rows.filter((row) => {
    if (!ancestryAllowed.has(String(row.anc))) return false;
    if (!chromosomesAllowed.has(String(row.chrom))) return false;
    return getNumericValue(row, "mpp") >= threshold;
  });
};

export const filterRowsByFiniteColumns = <T extends DataRow>(
  rows: T[],
  finiteColumns: string[],
): T[] => {
  const shortColumns = toShortCols(finiteColumns);
  if (shortColumns.length === 0) return rows;

  return rows.filter((row) =>
    shortColumns.every((column) => Number.isFinite(getNumericValue(row, column))),
  );
};

export const applyCommonDataFilters = <T extends DataRow>({
  rows,
  ancestries,
  chromosomes,
  finiteColumns = [],
}: CommonFilterInput<T>): T[] => {
  const ancestryAllowed = new Set(ancestries);
  const chromosomeAllowed = new Set(chromosomes);

  const selectionFilteredRows = rows.filter((row) => {
    if (ancestryAllowed.size > 0 && !ancestryAllowed.has(String(row.anc))) return false;
    if (chromosomeAllowed.size > 0 && !chromosomeAllowed.has(String(row.chrom))) return false;
    return true;
  });

  // Keep the full row shape for tooltips and plotting; the fragment page does not
  // have ancestry-component completeness rules like `sum_stats_ind`.
  // Only the explicit numeric plot variables should be required to be finite.
  return filterRowsByFiniteColumns(selectionFilteredRows, finiteColumns);
};
