import * as d3 from "d3";

import type { DataRow } from "@/pages/sum_stats_ind/domain/types";

export const asNum = (value: unknown) =>
  value === null || value === undefined ? NaN : Number(value);

export const getNumericValue = (row: DataRow, key: string) => asNum(row[key]);

export const getStringValue = (row: DataRow, key: string) => {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
};

export const keyFromCols =
  (columnsShort: string[], emptyKey = "__all__") =>
  (row: DataRow): string => {
    if (columnsShort.length === 0) return emptyKey;
    if (columnsShort.length === 1) {
      return getStringValue(row, columnsShort[0]);
    }
    return columnsShort.map((column) => getStringValue(row, column)).join("_");
  };

export const extentWithBuffer = (
  rows: DataRow[],
  keyShort: string,
  bufferFraction = 0.05,
): [number, number] => {
  const values = rows
    .map((row) => getNumericValue(row, keyShort))
    .filter(Number.isFinite);

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

