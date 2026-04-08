import { anc_cmaps, data_cmaps, reg_cmaps } from "@/assets/colormaps";
import {
  isContinuousColumn,
  toLongValue,
  toShortCol,
  toShortCols,
} from "@/pages/sum_stats_ind/domain/columns";
import { getNumericValue, keyFromCols } from "@/pages/sum_stats_ind/domain/data";
import type { ColorScaleResult, DataRow, LegendItem } from "@/pages/sum_stats_ind/domain/types";
import * as d3 from "d3";

const defaultColor = "steelblue";

const customDiscreteColorMaps: Record<string, Record<string, string>> = {
  anc: anc_cmaps,
  dat: data_cmaps,
  reg: reg_cmaps,
};

interface BuildColorScaleOptions<T extends DataRow = DataRow> {
  rows: T[];
  colorColumns: string[];
  sortMetricColumn?: string;
  allowContinuous?: boolean;
  emptyGroupKey?: string;
  defaultOrderValue?: string;
}

const uniqueByAppearance = <T,>(values: T[]) => {
  const seen = new Set<T>();
  const ordered: T[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
};

export const buildColorScale = <T extends DataRow>({
  rows,
  colorColumns,
  sortMetricColumn,
  allowContinuous = false,
  emptyGroupKey = "__all__",
  defaultOrderValue = "__all__",
}: BuildColorScaleOptions<T>): ColorScaleResult<T> => {
  const colorColumnsShort = toShortCols(colorColumns);
  const hasExplicitNoColor =
    colorColumns.length === 1 && colorColumns[0].trim().length === 0;
  const hasNoColor = colorColumnsShort.length === 0 || hasExplicitNoColor;

  const colorKey = keyFromCols(colorColumnsShort, emptyGroupKey);

  if (hasNoColor) {
    return {
      getColor: () => defaultColor,
      getColorFromKey: () => defaultColor,
      legendData: [{ label: "Default Color", color: defaultColor }],
      discreteOrContinuous: "default",
      globalColorOrder: [defaultOrderValue],
      colorKey: () => defaultOrderValue,
      continuousColorFieldShort: null,
    };
  }

  const firstColorColumn = colorColumnsShort[0];

  if (allowContinuous && colorColumnsShort.length === 1 && isContinuousColumn(firstColorColumn)) {
    const values = rows
      .map((row) => getNumericValue(row, firstColorColumn))
      .filter(Number.isFinite);

    if (values.length === 0) {
      return {
        getColor: () => defaultColor,
        getColorFromKey: () => defaultColor,
        legendData: [{ label: "No valid data", color: defaultColor }],
        discreteOrContinuous: "continuous",
        globalColorOrder: [],
        colorKey,
        continuousColorFieldShort: firstColorColumn,
      };
    }

    const [rawMinimum, rawMaximum] = d3.extent(values) as [number, number];
    let minimum = Math.floor(rawMinimum);
    let maximum = Math.ceil(rawMaximum);

    if (minimum === maximum) {
      minimum -= 1;
      maximum += 1;
    }

    const extent: [number, number] = [minimum, maximum];
    const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain(extent);

    return {
      getColor: (row) => {
        const numeric = getNumericValue(row, firstColorColumn);
        return Number.isFinite(numeric) ? colorScale(numeric) : defaultColor;
      },
      getColorFromKey: () => defaultColor,
      legendData: [
        { label: `Min: ${minimum}`, color: colorScale(minimum), extent },
        { label: `Max: ${maximum}`, color: colorScale(maximum), extent },
      ],
      discreteOrContinuous: "continuous",
      globalColorOrder: [],
      colorKey,
      continuousColorFieldShort: firstColorColumn,
    };
  }

  let globalColorOrder: string[];
  if (sortMetricColumn) {
    const metricShort = toShortCol(sortMetricColumn);
    const groupedByKey = Array.from(
      d3.group(rows, (row) => colorKey(row) || "__missing__"),
      ([key, groupedRows]) => ({
        key,
        mean:
          d3.mean(groupedRows, (row) => getNumericValue(row, metricShort)) ??
          Number.POSITIVE_INFINITY,
      }),
    );
    groupedByKey.sort((left, right) => d3.ascending(left.mean, right.mean));
    globalColorOrder = groupedByKey.map((group) => group.key);
  } else {
    globalColorOrder = uniqueByAppearance(
      rows.map((row) => colorKey(row)).filter((key) => key !== ""),
    );
  }

  const customMap =
    colorColumnsShort.length === 1
      ? customDiscreteColorMaps[firstColorColumn]
      : undefined;

  if (customMap) {
    const legendData: LegendItem[] = globalColorOrder.map((value) => ({
      label: toLongValue(firstColorColumn, value),
      color: customMap[value] ?? defaultColor,
    }));
    return {
      getColor: (row) => {
        const key = colorKey(row);
        return key ? customMap[key] ?? defaultColor : defaultColor;
      },
      getColorFromKey: (key) =>
        key && key !== "__missing__" ? customMap[key] ?? defaultColor : defaultColor,
      legendData,
      discreteOrContinuous: "discrete",
      globalColorOrder,
      colorKey,
      continuousColorFieldShort: null,
    };
  }

  const ordinalScale = d3
    .scaleOrdinal<string, string>(d3.schemeCategory10)
    .domain(globalColorOrder);

  return {
    getColor: (row) => {
      const key = colorKey(row);
      return key ? ordinalScale(key) : defaultColor;
    },
    getColorFromKey: (key) =>
      key && key !== "__missing__" ? ordinalScale(key) : defaultColor,
    legendData: globalColorOrder.map((value) => ({
      label: String(value),
      color: ordinalScale(value),
    })),
    discreteOrContinuous: "discrete",
    globalColorOrder,
    colorKey,
    continuousColorFieldShort: null,
  };
};

