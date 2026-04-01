import { chr_range_marks, chrms_all, mpp_marks } from "@/assets/sharedOptions";
import { PageWithSidebar } from "@/layout/PageWithSidebar";
import { apiUrl } from "@/lib/api-url";
import { decodeRowsPayload } from "@/lib/compact-table";
import {
  buildSessionCacheKey,
  formatTransferMetrics,
  getFetchTransferMetrics,
  setSessionCacheValue,
} from "@/lib/request-observability";
import ComparisonChromosomePlot from "@/pages/frag_vis_reg/components/ComparisonChromosomePlot";
import CompositionPlot from "@/pages/frag_vis_reg/components/CompositionPlot";
import FrequencyChromosomePlot from "@/pages/frag_vis_reg/components/FrequencyChromosomePlot";
import {
  COMPARISON_MIN_FRAGMENT_LENGTH_MARKS,
  COMPARISON_MIN_FRAGMENT_LENGTH_MAX_KBP,
  COMPARISON_MIN_FRAGMENT_LENGTH_MIN_KBP,
  COMPARISON_MIN_FRAGMENT_LENGTH_STEP_KBP,
  COMPARISON_REGION_CODE_ORDER,
  COMPARISON_REGION_OPTIONS,
  COMPARISON_REGION_TO_CODE,
  COMPARISON_SET_MODE_OPTIONS,
  COMPOSITION_ANCESTRY_OPTIONS,
  COMPOSITION_BAR_COUNT_MAX,
  COMPOSITION_BAR_COUNT_MIN,
  COMPOSITION_PHASE_OPTIONS,
  ComparisonLineFilters,
  ComparisonLineState,
  ComparisonRegionCode,
  ComparisonRow,
  CompositionFilters,
  CompositionRow,
  DEFAULT_FRAG_VIS_REG_STATE,
  FRAG_VIS_REG_PLOT_TYPES,
  FREQUENCY_ANCESTRY_OPTIONS,
  FREQUENCY_ANCESTRY_TO_PAYLOAD,
  FREQUENCY_PHASE_OPTIONS,
  FREQUENCY_PHASE_TO_PAYLOAD,
  FREQUENCY_REGION_OPTIONS,
  FREQUENCY_REGION_TO_PAYLOAD,
  FREQUENCY_SMOOTHING_WINDOW_MARKS,
  FREQUENCY_SMOOTHING_WINDOW_MAX_KBP,
  FREQUENCY_SMOOTHING_WINDOW_MIN_KBP,
  FREQUENCY_SMOOTHING_WINDOW_STEP_KBP,
  FragVisRegPlotType,
  FrequencyLineFilters,
  FrequencyLineState,
  FrequencyRow,
  getComparisonLineLabel,
  getFrequencyLineColor,
  getFrequencyLineLabel,
} from "@/pages/frag_vis_reg/static/fvrStatic";
import MultipleSelectChip from "@/shared/MultipleSelect/multipleselect";
import PlotDownloadButton from "@/shared/PlotDownloadButton/PlotDownloadButton";
import { useSidebar } from "@/shared/SideBarContext/SideBarContext";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { useMemo, useRef, useState } from "react";

const FRAG_VIS_REG_ENDPOINT = "/api/fragvisreg-data";
const FRAG_VIS_REG_FREQUENCY_SESSION_CACHE_MAX_ENTRIES = 80;
const FRAG_VIS_REG_COMPARISON_SESSION_CACHE_MAX_ENTRIES = 80;
const FRAG_VIS_REG_COMPOSITION_SESSION_CACHE_MAX_ENTRIES = 40;

type FrequencySessionCacheEntry = {
  rawRows: unknown[];
  normalizedRows: FrequencyRow[];
};

type CompositionSessionCacheEntry = {
  rawRows: unknown[];
  normalizedRows: CompositionRow[];
};

type ComparisonSessionCacheEntry = {
  rawRows: unknown[];
  normalizedRows: ComparisonRow[];
};

const FRAG_VIS_REG_FREQUENCY_SESSION_CACHE = new Map<string, FrequencySessionCacheEntry>();
const FRAG_VIS_REG_COMPARISON_SESSION_CACHE = new Map<string, ComparisonSessionCacheEntry>();
const FRAG_VIS_REG_COMPOSITION_SESSION_CACHE = new Map<string, CompositionSessionCacheEntry>();

const toFiniteNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeChromosome = (value: unknown): string | null => {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const noPrefix = raw.replace(/^chr/i, "");
  if (noPrefix.toUpperCase() === "X") return "X";
  const numeric = Number(noPrefix);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 22) {
    return String(numeric);
  }
  return null;
};

const pickFirstValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
};

type FrequencyChangePointRow = {
  chromosome: string;
  position: number;
  n_with_archaic: number;
  n_total: number;
  frequency: number;
};

type NormalizedFrequencyRow =
  | { kind: "interval"; row: FrequencyRow }
  | { kind: "change_point"; row: FrequencyChangePointRow };

const normalizeFrequencyRow = (row: unknown): NormalizedFrequencyRow | null => {
  let chromosomeValue: unknown;
  let startValue: unknown;
  let endValue: unknown;
  let positionValue: unknown;
  let nWithArchaicValue: unknown;
  let nTotalValue: unknown;
  let frequencyValue: unknown;

  if (Array.isArray(row)) {
    chromosomeValue = row[0];
    if (row.length >= 6) {
      startValue = row[1];
      endValue = row[2];
      nWithArchaicValue = row[3];
      nTotalValue = row[4];
      frequencyValue = row[5];
    } else {
      positionValue = row[1];
      nWithArchaicValue = row[2];
      nTotalValue = row[3];
      frequencyValue = row[4];
    }
  } else if (row && typeof row === "object") {
    const record = row as Record<string, unknown>;
    chromosomeValue = pickFirstValue(record, [
      "chromosome",
      "chrom",
      "chr",
      "Chromosome",
      "column_1",
      "0",
    ]);
    startValue = pickFirstValue(record, ["start", "Start", "column_2", "1"]);
    endValue = pickFirstValue(record, ["end", "End", "column_3", "2"]);
    positionValue = pickFirstValue(record, ["position", "Position", "column_2", "1"]);
    nWithArchaicValue = pickFirstValue(record, [
      "n_with_archaic",
      "n_archaic",
      "n_individuals_with_archaic",
      "n_contain",
      "column_4",
      "3",
    ]);
    nTotalValue = pickFirstValue(record, [
      "n_total",
      "total_individuals",
      "n_individuals_total",
      "column_5",
      "4",
    ]);
    frequencyValue = pickFirstValue(record, [
      "frequency",
      "freq",
      "Frequency",
      "column_6",
      "5",
      "column_5",
      "4",
    ]);
  } else {
    return null;
  }

  const chromosome = normalizeChromosome(chromosomeValue);
  const start = toFiniteNumber(startValue);
  const end = toFiniteNumber(endValue);
  const position = toFiniteNumber(positionValue);
  const frequency = toFiniteNumber(frequencyValue);
  const nWithArchaic = toFiniteNumber(nWithArchaicValue) ?? 0;
  const nTotal = toFiniteNumber(nTotalValue) ?? 0;

  if (!chromosome || frequency === null || frequency < 0) {
    return null;
  }

  if (start !== null && end !== null) {
    return {
      kind: "interval",
      row: {
        chromosome,
        start: Math.min(start, end),
        end: Math.max(start, end),
        n_with_archaic: nWithArchaic,
        n_total: nTotal,
        frequency,
      },
    };
  }

  if (position !== null) {
    return {
      kind: "change_point",
      row: {
        chromosome,
        position,
        n_with_archaic: nWithArchaic,
        n_total: nTotal,
        frequency,
      },
    };
  }

  return null;
};

const toIntervalsFromChangePoints = (rows: FrequencyChangePointRow[]): FrequencyRow[] => {
  const rowsByChromosome = new Map<string, FrequencyChangePointRow[]>();
  for (const row of rows) {
    const existing = rowsByChromosome.get(row.chromosome);
    if (existing) {
      existing.push(row);
    } else {
      rowsByChromosome.set(row.chromosome, [row]);
    }
  }

  const intervals: FrequencyRow[] = [];
  for (const chromosomeRows of rowsByChromosome.values()) {
    const sortedRows = chromosomeRows
      .slice()
      .sort((a, b) => a.position - b.position);
    const dedupedRows: FrequencyChangePointRow[] = [];

    for (const point of sortedRows) {
      const lastPoint = dedupedRows[dedupedRows.length - 1];
      if (lastPoint && lastPoint.position === point.position) {
        dedupedRows[dedupedRows.length - 1] = point;
      } else {
        dedupedRows.push(point);
      }
    }

    for (let index = 0; index < dedupedRows.length - 1; index += 1) {
      const current = dedupedRows[index];
      const next = dedupedRows[index + 1];
      const start = Math.min(current.position, next.position);
      const end = Math.max(current.position, next.position);

      if (end <= start) continue;

      intervals.push({
        chromosome: current.chromosome,
        start,
        end,
        n_with_archaic: current.n_with_archaic,
        n_total: current.n_total,
        frequency: current.frequency,
      });
    }
  }

  return intervals;
};

const chromosomeSortKey = (chromosome: string) => (chromosome === "X" ? 23 : Number(chromosome));

const normalizeFrequencyRows = (rawRows: unknown[]) => {
  const parsedRows = rawRows
    .map(normalizeFrequencyRow)
    .filter((row): row is NormalizedFrequencyRow => row !== null);

  const intervalRows = parsedRows
    .filter((row): row is { kind: "interval"; row: FrequencyRow } => row.kind === "interval")
    .map((row) => row.row);
  const changePointRows = parsedRows
    .filter(
      (row): row is { kind: "change_point"; row: FrequencyChangePointRow } =>
        row.kind === "change_point"
    )
    .map((row) => row.row);

  return [...intervalRows, ...toIntervalsFromChangePoints(changePointRows)].sort((a, b) => {
    const chromosomeDiff = chromosomeSortKey(a.chromosome) - chromosomeSortKey(b.chromosome);
    if (chromosomeDiff !== 0) return chromosomeDiff;
    if (a.start !== b.start) return a.start - b.start;
    return a.end - b.end;
  });
};

const parseFrequencyResponse = (payload: unknown): unknown[] => {
  try {
    return decodeRowsPayload(payload);
  } catch {
    throw new Error("Unexpected response format from /api/fragvisreg-data.");
  }
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "t", "1", "yes", "y"].includes(normalized);
  }
  return false;
};

const normalizeComparisonRow = (row: unknown): ComparisonRow | null => {
  let chromosomeValue: unknown;
  let startValue: unknown;
  let endValue: unknown;
  const presence = {} as Record<ComparisonRegionCode, boolean>;

  if (Array.isArray(row)) {
    chromosomeValue = row[0];
    startValue = row[1];
    endValue = row[2];
    COMPARISON_REGION_CODE_ORDER.forEach((code, index) => {
      presence[code] = toBoolean(row[index + 3]);
    });
  } else if (row && typeof row === "object") {
    const record = row as Record<string, unknown>;
    chromosomeValue = pickFirstValue(record, [
      "chromosome",
      "chrom",
      "chr",
      "Chromosome",
      "column_1",
      "0",
    ]);
    startValue = pickFirstValue(record, ["start", "Start", "column_2", "1"]);
    endValue = pickFirstValue(record, ["end", "End", "column_3", "2"]);

    presence.AMR = toBoolean(
      pickFirstValue(record, ["idx_1", "idx1", "AMR", "amr", "column_4", "3"])
    );
    presence.AYT = toBoolean(
      pickFirstValue(record, ["idx_2", "idx2", "AYT", "ayt", "column_5", "4"])
    );
    presence.EAS = toBoolean(
      pickFirstValue(record, ["idx_3", "idx3", "EAS", "eas", "column_6", "5"])
    );
    presence.EUR = toBoolean(
      pickFirstValue(record, ["idx_4", "idx4", "EUR", "eur", "column_7", "6"])
    );
    presence.MID = toBoolean(
      pickFirstValue(record, ["idx_5", "idx5", "MID", "mid", "column_8", "7"])
    );
    presence.OCE = toBoolean(
      pickFirstValue(record, ["idx_6", "idx6", "OCE", "oce", "column_9", "8"])
    );
    presence.SAS = toBoolean(
      pickFirstValue(record, ["idx_7", "idx7", "SAS", "sas", "column_10", "9"])
    );
  } else {
    return null;
  }

  const chromosome = normalizeChromosome(chromosomeValue);
  const start = toFiniteNumber(startValue);
  const end = toFiniteNumber(endValue);

  if (!chromosome || start === null || end === null) {
    return null;
  }

  return {
    chromosome,
    start: Math.min(start, end),
    end: Math.max(start, end),
    presence,
  };
};

const normalizeComparisonRows = (rawRows: unknown[]) =>
  rawRows
    .map(normalizeComparisonRow)
    .filter((row): row is ComparisonRow => row !== null)
    .sort((a, b) => {
      const chromosomeDiff = chromosomeSortKey(a.chromosome) - chromosomeSortKey(b.chromosome);
      if (chromosomeDiff !== 0) return chromosomeDiff;
      if (a.start !== b.start) return a.start - b.start;
      return a.end - b.end;
    });

const parseComparisonResponse = (payload: unknown): unknown[] => {
  try {
    return decodeRowsPayload(payload);
  } catch {
    throw new Error("Unexpected response format from /api/fragvisreg-data.");
  }
};

const toComparisonBrowserFilteredLine = (
  line: ComparisonLineState,
  minFragmentLengthKbp: number
): ComparisonLineState => {
  const minFragmentLengthBp = Math.max(0, Math.round(minFragmentLengthKbp * 1000));
  const selectedCodes = line.filters.regions
    .map((region) => COMPARISON_REGION_TO_CODE[region])
    .filter((code): code is ComparisonRegionCode => Boolean(code));
  const selectedCodeSet = new Set(selectedCodes);

  const filteredRows = line.rows.filter((row) => {
    const fragmentLength = Math.max(0, row.end - row.start);
    if (fragmentLength < minFragmentLengthBp) return false;
    if (selectedCodes.length === 0) return true;

    if (line.filters.set_mode === "Joined") {
      return selectedCodes.some((code) => row.presence[code]);
    }

    if (line.filters.set_mode === "Shared") {
      return selectedCodes.every((code) => row.presence[code]);
    }

    if (!selectedCodes.every((code) => row.presence[code])) {
      return false;
    }

    return COMPARISON_REGION_CODE_ORDER.every(
      (code) => row.presence[code] === selectedCodeSet.has(code)
    );
  });

  return {
    ...line,
    rows: filteredRows,
  };
};

const normalizePopCombination = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0)
      .map((item) => item.toUpperCase());
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[\[\]"']/g, "");
    if (!cleaned.trim()) return [];
    return cleaned
      .split(/[|,]/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => item.toUpperCase());
  }

  return [];
};

const normalizeCompositionRow = (row: unknown): CompositionRow | null => {
  let indexValue: unknown;
  let popCombinationValue: unknown;
  let totalSequenceValue: unknown;

  if (Array.isArray(row)) {
    indexValue = row[0];
    popCombinationValue = row[1];
    totalSequenceValue = row[2];
  } else if (row && typeof row === "object") {
    const record = row as Record<string, unknown>;
    indexValue = pickFirstValue(record, ["index", "Index", "column_1", "0"]);
    popCombinationValue = pickFirstValue(record, [
      "pop_combination",
      "popCombination",
      "column_2",
      "1",
    ]);
    totalSequenceValue = pickFirstValue(record, [
      "total_sequence",
      "totalSequence",
      "column_3",
      "2",
    ]);
  } else {
    return null;
  }

  const index = toFiniteNumber(indexValue);
  const totalSequence = toFiniteNumber(totalSequenceValue);
  if (index === null || totalSequence === null || index < 0 || totalSequence < 0) {
    return null;
  }

  return {
    index: Math.round(index),
    pop_combination: normalizePopCombination(popCombinationValue),
    total_sequence: totalSequence,
  };
};

const normalizeCompositionRows = (rawRows: unknown[]) =>
  rawRows
    .map(normalizeCompositionRow)
    .filter((row): row is CompositionRow => row !== null)
    .sort((a, b) => a.index - b.index);

const parseCompositionResponse = (payload: unknown): unknown[] => {
  try {
    return decodeRowsPayload(payload);
  } catch {
    throw new Error("Unexpected response format from /api/fragvisreg-data.");
  }
};

const updateLineById = (
  lines: FrequencyLineState[],
  lineId: number,
  updater: (line: FrequencyLineState) => FrequencyLineState
) => lines.map((line) => (line.lineId === lineId ? updater(line) : line));

const updateComparisonLineById = (
  lines: ComparisonLineState[],
  lineId: number,
  updater: (line: ComparisonLineState) => ComparisonLineState
) => lines.map((line) => (line.lineId === lineId ? updater(line) : line));

export function FragVisReg() {
  const { isSidebarVisible } = useSidebar();
  const [state, setState] = useState(DEFAULT_FRAG_VIS_REG_STATE);
  const plotRef = useRef<HTMLDivElement | null>(null);

  const selectedLine = useMemo(
    () =>
      state.lines.find((line) => line.lineId === state.selectedLineId) ??
      state.lines[0],
    [state.lines, state.selectedLineId]
  );

  const selectedComparisonLine = useMemo(
    () =>
      state.comparisonLines.find(
        (line) => line.lineId === state.selectedComparisonLineId
      ) ?? state.comparisonLines[0],
    [state.comparisonLines, state.selectedComparisonLineId]
  );

  const visibleLines = useMemo(
    () => state.lines.filter((line) => line.visible),
    [state.lines]
  );

  const visibleComparisonLines = useMemo(
    () => state.comparisonLines.filter((line) => line.visible),
    [state.comparisonLines]
  );

  const browserFilteredComparisonLines = useMemo(
    () =>
      state.comparisonLines.map((line) =>
        toComparisonBrowserFilteredLine(line, state.comparison_min_fragment_length_kbp)
      ),
    [state.comparisonLines, state.comparison_min_fragment_length_kbp]
  );

  const visibleBrowserFilteredComparisonLines = useMemo(
    () => browserFilteredComparisonLines.filter((line) => line.visible),
    [browserFilteredComparisonLines]
  );

  const selectedComparisonLineFilteredCount = useMemo(() => {
    if (!selectedComparisonLine) return 0;
    return toComparisonBrowserFilteredLine(
      selectedComparisonLine,
      state.comparison_min_fragment_length_kbp
    ).rows.length;
  }, [selectedComparisonLine, state.comparison_min_fragment_length_kbp]);

  const compositionVisibleRows = useMemo(() => {
    const cappedCount = Math.max(
      COMPOSITION_BAR_COUNT_MIN,
      Math.min(COMPOSITION_BAR_COUNT_MAX, Math.round(state.composition.filters.barCount))
    );
    return state.composition.rows.slice(0, cappedCount);
  }, [state.composition.filters.barCount, state.composition.rows]);

  const applySelectedLine = async () => {
    if (state.plotType !== "Frequency") return;
    const lineToFetch = selectedLine;
    if (!lineToFetch) return;
    const startedAt = performance.now();

    setState((prevState) => ({
      ...prevState,
      lines: updateLineById(prevState.lines, lineToFetch.lineId, (line) => ({
        ...line,
        status: "loading",
        error: undefined,
      })),
    }));

    try {
      const payloadPhaseState = FREQUENCY_PHASE_TO_PAYLOAD[lineToFetch.filters.phase_state];
      const payloadRegion = FREQUENCY_REGION_TO_PAYLOAD[lineToFetch.filters.region];
      const payloadAncestry = FREQUENCY_ANCESTRY_TO_PAYLOAD[lineToFetch.filters.ancestry];

      if (!payloadRegion || !payloadAncestry) {
        throw new Error("Unsupported filter values for backend payload mapping.");
      }

      const requestPayload = {
        plot_type: "freq",
        phase_state: payloadPhaseState,
        region: payloadRegion,
        ancestry: payloadAncestry,
        mpp: Math.round(lineToFetch.filters.mpp * 100),
      } as const;
      const cacheKey = buildSessionCacheKey(FRAG_VIS_REG_ENDPOINT, requestPayload);
      const cachedEntry = FRAG_VIS_REG_FREQUENCY_SESSION_CACHE.get(cacheKey);

      if (cachedEntry) {
        FRAG_VIS_REG_FREQUENCY_SESSION_CACHE.delete(cacheKey);
        FRAG_VIS_REG_FREQUENCY_SESSION_CACHE.set(cacheKey, cachedEntry);
        const finishedAt = performance.now();
        console.log(
          `frag-vis-reg freq fetch: 0.0 ms | json: 0.0 ms | total: ${(finishedAt - startedAt).toFixed(1)} ms | cache: HIT | transfer: skipped`
        );
        setState((prevState) => ({
          ...prevState,
          lines: updateLineById(prevState.lines, lineToFetch.lineId, (line) => ({
            ...line,
            status: "loaded",
            rawRows: cachedEntry.rawRows,
            rows: cachedEntry.normalizedRows,
            visible: true,
            error: undefined,
          })),
        }));
        return;
      }

      const requestUrl = apiUrl(FRAG_VIS_REG_ENDPOINT);
      const fetchStartedAt = performance.now();
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
      const fetchFinishedAt = performance.now();

      if (!response.ok) {
        throw new Error(`Failed to fetch frequency data (HTTP ${response.status}).`);
      }

      const jsonStartedAt = performance.now();
      const payload = await response.json();
      const jsonFinishedAt = performance.now();
      const rawRows = parseFrequencyResponse(payload);
      const normalizedRows = normalizeFrequencyRows(rawRows);
      const finishedAt = performance.now();
      const transferMetrics = getFetchTransferMetrics(
        response.url || requestUrl,
        fetchStartedAt,
        fetchFinishedAt
      );

      console.log(
        `frag-vis-reg freq fetch: ${(fetchFinishedAt - fetchStartedAt).toFixed(1)} ms | json: ${(jsonFinishedAt - jsonStartedAt).toFixed(1)} ms | total: ${(finishedAt - startedAt).toFixed(1)} ms | cache: MISS | ${formatTransferMetrics(
          transferMetrics
        )}`
      );
      setSessionCacheValue(
        FRAG_VIS_REG_FREQUENCY_SESSION_CACHE,
        cacheKey,
        { rawRows, normalizedRows },
        FRAG_VIS_REG_FREQUENCY_SESSION_CACHE_MAX_ENTRIES
      );

      setState((prevState) => ({
        ...prevState,
        lines: updateLineById(prevState.lines, lineToFetch.lineId, (line) => ({
          ...line,
          status: "loaded",
          rawRows,
          rows: normalizedRows,
          visible: true,
          error: undefined,
        })),
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error while fetching frequency data.";

      setState((prevState) => ({
        ...prevState,
        lines: updateLineById(prevState.lines, lineToFetch.lineId, (line) => ({
          ...line,
          status: "error",
          error: message,
        })),
      }));
    }
  };

  const applySelectedComparisonLine = async () => {
    if (state.plotType !== "Comparison") return;
    const lineToFetch = selectedComparisonLine;
    if (!lineToFetch) return;
    const startedAt = performance.now();

    setState((prevState) => ({
      ...prevState,
      comparisonLines: updateComparisonLineById(
        prevState.comparisonLines,
        lineToFetch.lineId,
        (line) => ({
          ...line,
          status: "loading",
          error: undefined,
        })
      ),
    }));

    try {
      const payloadPhaseState = FREQUENCY_PHASE_TO_PAYLOAD[lineToFetch.filters.phase_state];
      const payloadAncestry = FREQUENCY_ANCESTRY_TO_PAYLOAD[lineToFetch.filters.ancestry];

      if (!payloadAncestry) {
        throw new Error("Unsupported ancestry value for backend payload mapping.");
      }

      const requestPayload = {
        plot_type: "comparison",
        phase_state: payloadPhaseState,
        ancestry: payloadAncestry,
        mpp: Math.round(lineToFetch.filters.mpp * 100),
      } as const;
      const cacheKey = buildSessionCacheKey(FRAG_VIS_REG_ENDPOINT, requestPayload);
      const cachedEntry = FRAG_VIS_REG_COMPARISON_SESSION_CACHE.get(cacheKey);

      if (cachedEntry) {
        FRAG_VIS_REG_COMPARISON_SESSION_CACHE.delete(cacheKey);
        FRAG_VIS_REG_COMPARISON_SESSION_CACHE.set(cacheKey, cachedEntry);
        const finishedAt = performance.now();
        console.log(
          `frag-vis-reg comparison fetch: 0.0 ms | json: 0.0 ms | total: ${(finishedAt - startedAt).toFixed(1)} ms | cache: HIT | transfer: skipped`
        );

        setState((prevState) => ({
          ...prevState,
          comparisonLines: updateComparisonLineById(
            prevState.comparisonLines,
            lineToFetch.lineId,
            (line) => ({
              ...line,
              status: "loaded",
              rawRows: cachedEntry.rawRows,
              rows: cachedEntry.normalizedRows,
              visible: true,
              error: undefined,
            })
          ),
        }));
        return;
      }

      const requestUrl = apiUrl(FRAG_VIS_REG_ENDPOINT);
      const fetchStartedAt = performance.now();
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
      const fetchFinishedAt = performance.now();

      if (!response.ok) {
        throw new Error(`Failed to fetch comparison data (HTTP ${response.status}).`);
      }

      const jsonStartedAt = performance.now();
      const payload = await response.json();
      const jsonFinishedAt = performance.now();
      const rawRows = parseComparisonResponse(payload);
      const normalizedRows = normalizeComparisonRows(rawRows);
      const finishedAt = performance.now();
      const transferMetrics = getFetchTransferMetrics(
        response.url || requestUrl,
        fetchStartedAt,
        fetchFinishedAt
      );

      console.log(
        `frag-vis-reg comparison fetch: ${(fetchFinishedAt - fetchStartedAt).toFixed(1)} ms | json: ${(jsonFinishedAt - jsonStartedAt).toFixed(1)} ms | total: ${(finishedAt - startedAt).toFixed(1)} ms | cache: MISS | ${formatTransferMetrics(
          transferMetrics
        )}`
      );
      console.log(payload)
      setSessionCacheValue(
        FRAG_VIS_REG_COMPARISON_SESSION_CACHE,
        cacheKey,
        { rawRows, normalizedRows },
        FRAG_VIS_REG_COMPARISON_SESSION_CACHE_MAX_ENTRIES
      );

      setState((prevState) => ({
        ...prevState,
        comparisonLines: updateComparisonLineById(
          prevState.comparisonLines,
          lineToFetch.lineId,
          (line) => ({
            ...line,
            status: "loaded",
            rawRows,
            rows: normalizedRows,
            visible: true,
            error: undefined,
          })
        ),
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error while fetching comparison data.";

      setState((prevState) => ({
        ...prevState,
        comparisonLines: updateComparisonLineById(
          prevState.comparisonLines,
          lineToFetch.lineId,
          (line) => ({
            ...line,
            status: "error",
            error: message,
          })
        ),
      }));
    }
  };

  const applyCompositionFilters = async () => {
    if (state.plotType !== "Composition Plot") return;
    const filters = state.composition.filters;
    const startedAt = performance.now();

    setState((prevState) => ({
      ...prevState,
      composition: {
        ...prevState.composition,
        status: "loading",
        error: undefined,
      },
    }));

    try {
      const payloadPhaseState = FREQUENCY_PHASE_TO_PAYLOAD[filters.phase_state];
      const payloadAncestry = FREQUENCY_ANCESTRY_TO_PAYLOAD[filters.ancestry];

      if (!payloadAncestry) {
        throw new Error("Unsupported ancestry value for backend payload mapping.");
      }

      const requestPayload = {
        plot_type: "composition",
        phase_state: payloadPhaseState,
        ancestry: payloadAncestry,
        mpp: Math.round(filters.mpp * 100),
      } as const;
      const cacheKey = buildSessionCacheKey(FRAG_VIS_REG_ENDPOINT, requestPayload);
      const cachedEntry = FRAG_VIS_REG_COMPOSITION_SESSION_CACHE.get(cacheKey);

      if (cachedEntry) {
        FRAG_VIS_REG_COMPOSITION_SESSION_CACHE.delete(cacheKey);
        FRAG_VIS_REG_COMPOSITION_SESSION_CACHE.set(cacheKey, cachedEntry);
        const finishedAt = performance.now();
        console.log(
          `frag-vis-reg composition fetch: 0.0 ms | json: 0.0 ms | total: ${(finishedAt - startedAt).toFixed(1)} ms | cache: HIT | transfer: skipped`
        );
        setState((prevState) => ({
          ...prevState,
          composition: {
            ...prevState.composition,
            status: "loaded",
            rawRows: cachedEntry.rawRows,
            rows: cachedEntry.normalizedRows,
            error: undefined,
          },
        }));
        return;
      }

      const requestUrl = apiUrl(FRAG_VIS_REG_ENDPOINT);
      const fetchStartedAt = performance.now();
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
      const fetchFinishedAt = performance.now();

      if (!response.ok) {
        throw new Error(`Failed to fetch composition data (HTTP ${response.status}).`);
      }

      const jsonStartedAt = performance.now();
      const payload = await response.json();
      const jsonFinishedAt = performance.now();
      const rawRows = parseCompositionResponse(payload);
      const normalizedRows = normalizeCompositionRows(rawRows);
      const finishedAt = performance.now();
      const transferMetrics = getFetchTransferMetrics(
        response.url || requestUrl,
        fetchStartedAt,
        fetchFinishedAt
      );
      console.log(
        `frag-vis-reg composition fetch: ${(fetchFinishedAt - fetchStartedAt).toFixed(1)} ms | json: ${(jsonFinishedAt - jsonStartedAt).toFixed(1)} ms | total: ${(finishedAt - startedAt).toFixed(1)} ms | cache: MISS | ${formatTransferMetrics(
          transferMetrics
        )}`
      );
      setSessionCacheValue(
        FRAG_VIS_REG_COMPOSITION_SESSION_CACHE,
        cacheKey,
        { rawRows, normalizedRows },
        FRAG_VIS_REG_COMPOSITION_SESSION_CACHE_MAX_ENTRIES
      );

      setState((prevState) => ({
        ...prevState,
        composition: {
          ...prevState.composition,
          status: "loaded",
          rawRows,
          rows: normalizedRows,
          error: undefined,
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error while fetching composition data.";

      setState((prevState) => ({
        ...prevState,
        composition: {
          ...prevState.composition,
          status: "error",
          error: message,
        },
      }));
    }
  };

  const removeSelectedLine = () => {
    if (!selectedLine) return;
    setState((prevState) => ({
      ...prevState,
      lines: updateLineById(prevState.lines, selectedLine.lineId, (line) => ({
        ...line,
        status: "idle",
        rawRows: [],
        rows: [],
        visible: false,
        error: undefined,
      })),
    }));
  };

  const removeSelectedComparisonLine = () => {
    if (!selectedComparisonLine) return;
    setState((prevState) => ({
      ...prevState,
      comparisonLines: updateComparisonLineById(
        prevState.comparisonLines,
        selectedComparisonLine.lineId,
        (line) => ({
          ...line,
          status: "idle",
          rawRows: [],
          rows: [],
          visible: false,
          error: undefined,
        })
      ),
    }));
  };

  const updateCompositionFilters = (patch: Partial<CompositionFilters>) => {
    setState((prevState) => ({
      ...prevState,
      composition: {
        ...prevState.composition,
        filters: {
          ...prevState.composition.filters,
          ...patch,
        },
      },
    }));
  };

  const updateSelectedLineFilters = (patch: Partial<FrequencyLineFilters>) => {
    if (!selectedLine) return;
    setState((prevState) => ({
      ...prevState,
      lines: updateLineById(prevState.lines, selectedLine.lineId, (line) => ({
        ...line,
        filters: {
          ...line.filters,
          ...patch,
        },
      })),
    }));
  };

  const updateSelectedComparisonLineFilters = (patch: Partial<ComparisonLineFilters>) => {
    if (!selectedComparisonLine) return;
    setState((prevState) => ({
      ...prevState,
      comparisonLines: updateComparisonLineById(
        prevState.comparisonLines,
        selectedComparisonLine.lineId,
        (line) => ({
          ...line,
          filters: {
            ...line.filters,
            ...patch,
          },
        })
      ),
    }));
  };

  const plotTypeIcons: Record<FragVisRegPlotType, JSX.Element> = {
    Frequency: <ShowChartIcon fontSize="small" />,
    Comparison: <CompareArrowsIcon fontSize="small" />,
    "Composition Plot": <AutoGraphIcon fontSize="small" />,
  };

  return (
    <PageWithSidebar
      showSidebar={isSidebarVisible}
      sidebarClassName="side-filter-panel"
      sidebar={
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h5">1- Select Type of Plot:</Typography>
          </Grid>
          <Grid item xs={12}>
            <ToggleButtonGroup
              value={state.plotType}
              exclusive
              fullWidth
              orientation="vertical"
              onChange={(_event, newValue: FragVisRegPlotType | null) => {
                if (!newValue) return;
                setState((prevState) => ({
                  ...prevState,
                  plotType: newValue,
                }));
              }}
              sx={{
                "& .MuiToggleButtonGroup-grouped": {
                  color: "#003d73",
                  height: "40px",
                  "&.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "white",
                  },
                },
              }}
            >
              {FRAG_VIS_REG_PLOT_TYPES.map((plotType) => (
                <ToggleButton
                  key={plotType}
                  value={plotType}
                  aria-label={plotType}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  {plotTypeIcons[plotType]}
                  {plotType}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>

          {state.plotType === "Frequency" && selectedLine && (
            <>
              <Grid item xs={12}>
                <Typography variant="h5">2- Chromosome Filters:</Typography>
              </Grid>
              <Grid item xs={12}>
                <MultipleSelectChip
                  options={chrms_all.options}
                  label="Chromosomes"
                  selectedValues={state.chrms}
                  onChange={(chromosomes) =>
                    setState((prevState) => ({ ...prevState, chrms: chromosomes }))
                  }
                />
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 1,
                    mt: 1,
                  }}
                >
                  <Typography className="contrast-text" sx={{ mt: 2, textAlign: "center" }}>
                    Chromosome region (kbp limits)
                  </Typography>
                  <Slider
                    value={state.chrms_limits}
                    onChange={(_event, newValue) => {
                      setState((prevState) => ({
                        ...prevState,
                        chrms_limits: newValue as [number, number],
                      }));
                    }}
                    aria-labelledby="frag-vis-reg-chr-range-slider"
                    valueLabelDisplay="auto"
                    step={5000}
                    marks={chr_range_marks}
                    min={0}
                    max={250000}
                    sx={{ width: "85%" }}
                  />

                  <Typography className="contrast-text" sx={{ mt: 3, textAlign: "center" }}>
                    Smoothing window (kbp, max in window)
                  </Typography>
                  <Slider
                    value={state.smoothing_window_kbp}
                    onChange={(_event, newValue) => {
                      setState((prevState) => ({
                        ...prevState,
                        smoothing_window_kbp: newValue as number,
                      }));
                    }}
                    aria-labelledby="frag-vis-reg-smoothing-window-slider"
                    valueLabelDisplay="auto"
                    step={FREQUENCY_SMOOTHING_WINDOW_STEP_KBP}
                    marks={FREQUENCY_SMOOTHING_WINDOW_MARKS}
                    min={FREQUENCY_SMOOTHING_WINDOW_MIN_KBP}
                    max={FREQUENCY_SMOOTHING_WINDOW_MAX_KBP}
                    sx={{ width: "85%" }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 2, textAlign: "center" }}
                  >
                    Larger values reduce noise more strongly.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h5">3- Frequency Lines (1 to 10):</Typography>
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: 0.75,
                  }}
                >
                  {state.lines.map((line) => (
                    <ToggleButton
                      key={line.lineId}
                      value={line.lineId}
                      selected={state.selectedLineId === line.lineId}
                      aria-label={`line-${line.lineId}`}
                      onChange={() =>
                        setState((prevState) => ({
                          ...prevState,
                          selectedLineId: line.lineId,
                        }))
                      }
                      sx={{
                        height: "38px",
                        minWidth: 0,
                        color: "#003d73",
                        borderColor: "divider",
                        "&.Mui-selected": {
                          backgroundColor: "primary.main",
                          color: "white",
                          "&:hover": {
                            backgroundColor: "primary.dark",
                          },
                        },
                      }}
                    >
                      L{line.lineId}
                    </ToggleButton>
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Selected line status: <strong>{selectedLine.status}</strong>
                  {selectedLine.rows.length > 0 ? ` (${selectedLine.rows.length} rows)` : ""}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControl sx={{ mb: 1 }} fullWidth>
                  <InputLabel id="frag-vis-reg-phase-state">Phase state</InputLabel>
                  <Select
                    labelId="frag-vis-reg-phase-state"
                    value={selectedLine.filters.phase_state}
                    label="Phase state"
                    onChange={(event: SelectChangeEvent<string>) =>
                      updateSelectedLineFilters({
                        phase_state: event.target.value as FrequencyLineFilters["phase_state"],
                      })
                    }
                  >
                    {FREQUENCY_PHASE_OPTIONS.map((phaseState) => (
                      <MenuItem key={phaseState} value={phaseState}>
                        {phaseState}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ mb: 1 }} fullWidth>
                  <InputLabel id="frag-vis-reg-region">Region</InputLabel>
                  <Select
                    labelId="frag-vis-reg-region"
                    value={selectedLine.filters.region}
                    label="Region"
                    onChange={(event: SelectChangeEvent<string>) =>
                      updateSelectedLineFilters({
                        region: event.target.value as FrequencyLineFilters["region"],
                      })
                    }
                  >
                    {FREQUENCY_REGION_OPTIONS.map((region) => (
                      <MenuItem key={region} value={region}>
                        {region}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ mb: 1 }} fullWidth>
                  <InputLabel id="frag-vis-reg-ancestry">Ancestry</InputLabel>
                  <Select
                    labelId="frag-vis-reg-ancestry"
                    value={selectedLine.filters.ancestry}
                    label="Ancestry"
                    onChange={(event: SelectChangeEvent<string>) =>
                      updateSelectedLineFilters({
                        ancestry: event.target.value as FrequencyLineFilters["ancestry"],
                      })
                    }
                  >
                    {FREQUENCY_ANCESTRY_OPTIONS.map((ancestry) => (
                      <MenuItem key={ancestry} value={ancestry}>
                        {ancestry}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 1,
                    mt: 1,
                  }}
                >
                  <Typography className="contrast-text" sx={{ mt: 2, textAlign: "center" }}>
                    Mean Posterior Prob.
                  </Typography>
                  <Slider
                    value={selectedLine.filters.mpp}
                    onChange={(_event, newValue) =>
                      updateSelectedLineFilters({ mpp: newValue as number })
                    }
                    aria-labelledby="frag-vis-reg-mpp-slider"
                    valueLabelDisplay="auto"
                    step={0.05}
                    marks={mpp_marks}
                    min={0.5}
                    max={0.95}
                    sx={{ width: "85%" }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ flexGrow: 1 }}
                    onClick={applySelectedLine}
                    disabled={selectedLine.status === "loading"}
                  >
                    {selectedLine.status === "loading" ? "Loading..." : "Apply Selected Line"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    sx={{ flexGrow: 1, color: "primary.main", borderColor: "primary.main" }}
                    onClick={removeSelectedLine}
                  >
                    Remove Selected Line
                  </Button>
                </Box>
              </Grid>
              {selectedLine.error && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="error">
                    {selectedLine.error}
                  </Typography>
                </Grid>
              )}
            </>
          )}

          {state.plotType === "Comparison" && selectedComparisonLine && (
            <>
              <Grid item xs={12}>
                <Typography variant="h5">2- Chromosome Filters:</Typography>
              </Grid>
              <Grid item xs={12}>
                <MultipleSelectChip
                  options={chrms_all.options}
                  label="Chromosomes"
                  selectedValues={state.chrms}
                  onChange={(chromosomes) =>
                    setState((prevState) => ({ ...prevState, chrms: chromosomes }))
                  }
                />
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 1,
                    mt: 1,
                  }}
                >
                  <Typography className="contrast-text" sx={{ mt: 2, textAlign: "center" }}>
                    Chromosome region (kbp limits)
                  </Typography>
                  <Slider
                    value={state.chrms_limits}
                    onChange={(_event, newValue) => {
                      setState((prevState) => ({
                        ...prevState,
                        chrms_limits: newValue as [number, number],
                      }));
                    }}
                    aria-labelledby="frag-vis-reg-comparison-chr-range-slider"
                    valueLabelDisplay="auto"
                    step={5000}
                    marks={chr_range_marks}
                    min={0}
                    max={250000}
                    sx={{ width: "85%" }}
                  />

                  <Typography className="contrast-text" sx={{ mt: 3, textAlign: "center" }}>
                    Min fragment length (kbp)
                  </Typography>
                  <Slider
                    value={state.comparison_min_fragment_length_kbp}
                    onChange={(_event, newValue) =>
                      setState((prevState) => ({
                        ...prevState,
                        comparison_min_fragment_length_kbp: newValue as number,
                      }))
                    }
                    aria-labelledby="frag-vis-reg-comparison-min-fragment-slider"
                    valueLabelDisplay="auto"
                    step={COMPARISON_MIN_FRAGMENT_LENGTH_STEP_KBP}
                    marks={COMPARISON_MIN_FRAGMENT_LENGTH_MARKS}
                    min={COMPARISON_MIN_FRAGMENT_LENGTH_MIN_KBP}
                    max={COMPARISON_MIN_FRAGMENT_LENGTH_MAX_KBP}
                    sx={{ width: "85%" }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h5">3- Comparison Lines (1 to 10):</Typography>
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: 0.75,
                  }}
                >
                  {state.comparisonLines.map((line) => (
                    <ToggleButton
                      key={line.lineId}
                      value={line.lineId}
                      selected={state.selectedComparisonLineId === line.lineId}
                      aria-label={`comparison-line-${line.lineId}`}
                      onChange={() =>
                        setState((prevState) => ({
                          ...prevState,
                          selectedComparisonLineId: line.lineId,
                        }))
                      }
                      sx={{
                        height: "38px",
                        minWidth: 0,
                        color: "#003d73",
                        borderColor: "divider",
                        "&.Mui-selected": {
                          backgroundColor: "primary.main",
                          color: "white",
                          "&:hover": {
                            backgroundColor: "primary.dark",
                          },
                        },
                      }}
                    >
                      L{line.lineId}
                    </ToggleButton>
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Selected line status: <strong>{selectedComparisonLine.status}</strong>
                  {selectedComparisonLine.rows.length > 0
                    ? ` (${selectedComparisonLine.rows.length} rows fetched, ${selectedComparisonLineFilteredCount} rows after browser filters)`
                    : ""}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControl sx={{ mb: 1 }} fullWidth>
                  <InputLabel id="frag-vis-reg-comparison-phase-state">Phase state</InputLabel>
                  <Select
                    labelId="frag-vis-reg-comparison-phase-state"
                    value={selectedComparisonLine.filters.phase_state}
                    label="Phase state"
                    onChange={(event: SelectChangeEvent<string>) =>
                      updateSelectedComparisonLineFilters({
                        phase_state: event.target
                          .value as ComparisonLineFilters["phase_state"],
                      })
                    }
                  >
                    {FREQUENCY_PHASE_OPTIONS.map((phaseState) => (
                      <MenuItem key={phaseState} value={phaseState}>
                        {phaseState}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ mb: 1 }} fullWidth>
                  <InputLabel id="frag-vis-reg-comparison-ancestry">Ancestry</InputLabel>
                  <Select
                    labelId="frag-vis-reg-comparison-ancestry"
                    value={selectedComparisonLine.filters.ancestry}
                    label="Ancestry"
                    onChange={(event: SelectChangeEvent<string>) =>
                      updateSelectedComparisonLineFilters({
                        ancestry: event.target.value as ComparisonLineFilters["ancestry"],
                      })
                    }
                  >
                    {FREQUENCY_ANCESTRY_OPTIONS.map((ancestry) => (
                      <MenuItem key={ancestry} value={ancestry}>
                        {ancestry}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ mb: 1 }} fullWidth>
                  <InputLabel id="frag-vis-reg-comparison-set-mode">Set mode</InputLabel>
                  <Select
                    labelId="frag-vis-reg-comparison-set-mode"
                    value={selectedComparisonLine.filters.set_mode}
                    label="Set mode"
                    onChange={(event: SelectChangeEvent<string>) =>
                      updateSelectedComparisonLineFilters({
                        set_mode: event.target.value as ComparisonLineFilters["set_mode"],
                      })
                    }
                  >
                    {COMPARISON_SET_MODE_OPTIONS.map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <MultipleSelectChip
                  options={[...COMPARISON_REGION_OPTIONS]}
                  label="Regions"
                  selectedValues={selectedComparisonLine.filters.regions}
                  onChange={(regions) =>
                    updateSelectedComparisonLineFilters({
                      regions: regions as ComparisonLineFilters["regions"],
                    })
                  }
                />

                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 1,
                    mt: 1,
                  }}
                >
                  <Typography className="contrast-text" sx={{ mt: 2, textAlign: "center" }}>
                    Mean Posterior Prob.
                  </Typography>
                  <Slider
                    value={selectedComparisonLine.filters.mpp}
                    onChange={(_event, newValue) =>
                      updateSelectedComparisonLineFilters({ mpp: newValue as number })
                    }
                    aria-labelledby="frag-vis-reg-comparison-mpp-slider"
                    valueLabelDisplay="auto"
                    step={0.05}
                    marks={mpp_marks}
                    min={0.5}
                    max={0.95}
                    sx={{ width: "85%" }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ flexGrow: 1 }}
                    onClick={applySelectedComparisonLine}
                    disabled={selectedComparisonLine.status === "loading"}
                  >
                    {selectedComparisonLine.status === "loading"
                      ? "Loading..."
                      : "Apply Selected Line"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    sx={{ flexGrow: 1, color: "primary.main", borderColor: "primary.main" }}
                    onClick={removeSelectedComparisonLine}
                  >
                    Remove Selected Line
                  </Button>
                </Box>
              </Grid>

              {selectedComparisonLine.error && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="error">
                    {selectedComparisonLine.error}
                  </Typography>
                </Grid>
              )}
            </>
          )}

          {state.plotType === "Composition Plot" && (
            <>
              <Grid item xs={12}>
                <Typography variant="h5">2- Composition Filters:</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Status: <strong>{state.composition.status}</strong>
                  {state.composition.rows.length > 0
                    ? ` (${state.composition.rows.length} rows fetched)`
                    : ""}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControl sx={{ mb: 1 }} fullWidth>
                  <InputLabel id="frag-vis-reg-composition-phase-state">Phase state</InputLabel>
                  <Select
                    labelId="frag-vis-reg-composition-phase-state"
                    value={state.composition.filters.phase_state}
                    label="Phase state"
                    onChange={(event: SelectChangeEvent<string>) =>
                      updateCompositionFilters({
                        phase_state: event.target.value as CompositionFilters["phase_state"],
                      })
                    }
                  >
                    {COMPOSITION_PHASE_OPTIONS.map((phaseState) => (
                      <MenuItem key={phaseState} value={phaseState}>
                        {phaseState}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ mb: 1 }} fullWidth>
                  <InputLabel id="frag-vis-reg-composition-ancestry">Ancestry</InputLabel>
                  <Select
                    labelId="frag-vis-reg-composition-ancestry"
                    value={state.composition.filters.ancestry}
                    label="Ancestry"
                    onChange={(event: SelectChangeEvent<string>) =>
                      updateCompositionFilters({
                        ancestry: event.target.value as CompositionFilters["ancestry"],
                      })
                    }
                  >
                    {COMPOSITION_ANCESTRY_OPTIONS.map((ancestry) => (
                      <MenuItem key={ancestry} value={ancestry}>
                        {ancestry}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 1,
                    mt: 1,
                  }}
                >
                  <Typography className="contrast-text" sx={{ mt: 2, textAlign: "center" }}>
                    Mean Posterior Prob.
                  </Typography>
                  <Slider
                    value={state.composition.filters.mpp}
                    onChange={(_event, newValue) =>
                      updateCompositionFilters({ mpp: newValue as number })
                    }
                    aria-labelledby="frag-vis-reg-composition-mpp-slider"
                    valueLabelDisplay="auto"
                    step={0.05}
                    marks={mpp_marks}
                    min={0.5}
                    max={0.95}
                    sx={{ width: "85%" }}
                  />

                  <Typography className="contrast-text" sx={{ mt: 2, textAlign: "center" }}>
                    Bars shown
                  </Typography>
                  <Slider
                    value={state.composition.filters.barCount}
                    onChange={(_event, newValue) =>
                      updateCompositionFilters({ barCount: newValue as number })
                    }
                    aria-labelledby="frag-vis-reg-composition-bar-count-slider"
                    valueLabelDisplay="auto"
                    step={1}
                    min={COMPOSITION_BAR_COUNT_MIN}
                    max={COMPOSITION_BAR_COUNT_MAX}
                    marks={[
                      { value: COMPOSITION_BAR_COUNT_MIN, label: String(COMPOSITION_BAR_COUNT_MIN) },
                      { value: 50, label: "50" },
                      { value: COMPOSITION_BAR_COUNT_MAX, label: String(COMPOSITION_BAR_COUNT_MAX) },
                    ]}
                    sx={{ width: "85%" }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={applyCompositionFilters}
                  disabled={state.composition.status === "loading"}
                >
                  {state.composition.status === "loading" ? "Loading..." : "Apply Filters"}
                </Button>
              </Grid>

              {state.composition.error && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="error">
                    {state.composition.error}
                  </Typography>
                </Grid>
              )}
            </>
          )}
        </Grid>
      }
    >
      {state.plotType === "Frequency" ? (
        <Box
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
          }}
        >
          <Box className="plot-panel" ref={plotRef}>
            <FrequencyChromosomePlot
              lines={state.lines}
              chrms={state.chrms}
              chrmsLimits={state.chrms_limits}
              smoothingWindowKbp={state.smoothing_window_kbp}
              isSidebarVisible={isSidebarVisible}
            />
            <div className="plot-action-bar">
              <PlotDownloadButton plotRef={plotRef} fileName="frag_vis_reg_frequency" />
            </div>
          </Box>
          <Box
            sx={{
              mt: 1,
              border: "1px solid #d9dfec",
              borderRadius: "8px",
              bgcolor: "white",
              px: 1.25,
              py: 0.9,
              maxHeight: 112,
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 0.6 }}>
              Legend
            </Typography>
            {visibleLines.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Apply at least one line to draw data.
              </Typography>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 0.5,
              }}
            >
              {visibleLines.map((line) => (
                <Box
                  key={line.lineId}
                  sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "2px",
                      backgroundColor: getFrequencyLineColor(line.lineId),
                      border: "1px solid #0000001f",
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    title={`${getFrequencyLineLabel(line.lineId, line.filters)}${line.status === "loading" ? " (loading)" : ""
                      }`}
                  >
                    {getFrequencyLineLabel(line.lineId, line.filters)}
                    {line.status === "loading" ? " (loading)" : ""}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      ) : state.plotType === "Comparison" ? (
        <Box
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
          }}
        >
          <Box className="plot-panel" ref={plotRef}>
            <ComparisonChromosomePlot
              lines={browserFilteredComparisonLines}
              chrms={state.chrms}
              chrmsLimits={state.chrms_limits}
              isSidebarVisible={isSidebarVisible}
            />
            <div className="plot-action-bar">
              <PlotDownloadButton plotRef={plotRef} fileName="frag_vis_reg_comparison" />
            </div>
          </Box>
          <Box
            sx={{
              mt: 1,
              border: "1px solid #d9dfec",
              borderRadius: "8px",
              bgcolor: "white",
              px: 1.25,
              py: 0.9,
              maxHeight: 112,
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 0.6 }}>
              Legend
            </Typography>
            {visibleComparisonLines.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Apply at least one line to draw data.
              </Typography>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 0.5,
              }}
            >
              {visibleComparisonLines.map((line) => {
                const filteredLine = visibleBrowserFilteredComparisonLines.find(
                  (filtered) => filtered.lineId === line.lineId
                );
                const plottedRows = filteredLine?.rows.length ?? 0;
                return (
                  <Box
                    key={line.lineId}
                    sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "2px",
                        backgroundColor: getFrequencyLineColor(line.lineId),
                        border: "1px solid #0000001f",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={`${getComparisonLineLabel(line.lineId, line.filters)} | plotted rows: ${plottedRows}${line.status === "loading" ? " (loading)" : ""
                        }`}
                    >
                      {getComparisonLineLabel(line.lineId, line.filters)} | rows: {plottedRows}
                      {line.status === "loading" ? " (loading)" : ""}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      ) : state.plotType === "Composition Plot" ? (
        <Box
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
          }}
        >
          <Box className="plot-panel" ref={plotRef}>
            <CompositionPlot
              rows={compositionVisibleRows}
              isSidebarVisible={isSidebarVisible}
            />
            <div className="plot-action-bar">
              <PlotDownloadButton plotRef={plotRef} fileName="frag_vis_reg_composition" />
            </div>
          </Box>
          <Box
            sx={{
              mt: 1,
              border: "1px solid #d9dfec",
              borderRadius: "8px",
              bgcolor: "white",
              px: 1.25,
              py: 0.9,
              maxHeight: 112,
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 0.6 }}>
              Composition Summary
            </Typography>
            {state.composition.rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Apply filters to draw the composition plot.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Showing first {compositionVisibleRows.length} bars (sorted by index) out of{" "}
                {state.composition.rows.length} fetched rows.
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        <Box />
      )}
    </PageWithSidebar>
  );
}
