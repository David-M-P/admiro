import { toLongCol, toLongValue, toShortCols } from "@/pages/sum_stats_ind/domain/columns";
import type { DataRow, FacetGroup } from "@/pages/sum_stats_ind/domain/types";

export const buildFacetGroups = <T extends DataRow>(
  rows: T[],
  facetColumnsLong: string[],
): FacetGroup<T>[] => {
  const facetColumnsShort = toShortCols(facetColumnsLong).filter(
    (column) => column.length > 0,
  );

  if (facetColumnsShort.length === 0) {
    return [{ key: "__all__", title: "", points: rows }];
  }

  const grouped = new Map<string, { title: string; points: T[] }>();

  for (const row of rows) {
    const key = facetColumnsShort
      .map((column) => `${column}=${String(row[column] ?? "NA")}`)
      .join("|");

    const title = facetColumnsShort
      .map((column) => `${toLongCol(column)}: ${toLongValue(column, row[column])}`)
      .join("\n");

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { title, points: [row] });
    } else {
      existing.points.push(row);
    }
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({ key, title: value.title, points: value.points }))
    .sort((left, right) => left.title.localeCompare(right.title));
};

