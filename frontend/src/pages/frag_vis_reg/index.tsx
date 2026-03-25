import { chr_range_marks, chrms_all, mpp_marks } from "@/assets/sharedOptions";
import { PageWithSidebar } from "@/layout/PageWithSidebar";
import { apiUrl } from "@/lib/api-url";
import FrequencyChromosomePlot from "@/pages/frag_vis_reg/components/FrequencyChromosomePlot";
import {
  DEFAULT_FRAG_VIS_REG_STATE,
  FRAG_VIS_REG_PLOT_TYPES,
  FREQUENCY_ANCESTRY_OPTIONS,
  FREQUENCY_ANCESTRY_TO_PAYLOAD,
  FREQUENCY_PHASE_OPTIONS,
  FREQUENCY_PHASE_TO_PAYLOAD,
  FREQUENCY_REGION_OPTIONS,
  FREQUENCY_REGION_TO_PAYLOAD,
  FragVisRegPlotType,
  FrequencyLineFilters,
  FrequencyLineState,
  FrequencyRow,
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

const normalizeFrequencyRow = (row: unknown): FrequencyRow | null => {
  let chromosomeValue: unknown;
  let startValue: unknown;
  let endValue: unknown;
  let nWithArchaicValue: unknown;
  let nTotalValue: unknown;
  let frequencyValue: unknown;

  if (Array.isArray(row)) {
    chromosomeValue = row[0];
    startValue = row[1];
    endValue = row[2];
    nWithArchaicValue = row[3];
    nTotalValue = row[4];
    frequencyValue = row[5];
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
    nWithArchaicValue = pickFirstValue(record, [
      "n_with_archaic",
      "n_archaic",
      "n_individuals_with_archaic",
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
    frequencyValue = pickFirstValue(record, ["frequency", "freq", "Frequency", "column_6", "5"]);
  } else {
    return null;
  }

  const chromosome = normalizeChromosome(chromosomeValue);
  const start = toFiniteNumber(startValue);
  const end = toFiniteNumber(endValue);
  const frequency = toFiniteNumber(frequencyValue);
  const nWithArchaic = toFiniteNumber(nWithArchaicValue) ?? 0;
  const nTotal = toFiniteNumber(nTotalValue) ?? 0;

  if (!chromosome || start === null || end === null || frequency === null || frequency < 0) {
    return null;
  }

  return {
    chromosome,
    start: Math.min(start, end),
    end: Math.max(start, end),
    n_with_archaic: nWithArchaic,
    n_total: nTotal,
    frequency,
  };
};

const normalizeFrequencyRows = (rawRows: unknown[]) =>
  rawRows.map(normalizeFrequencyRow).filter((row): row is FrequencyRow => row !== null);

const parseFrequencyResponse = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const maybeRows = (payload as { rows?: unknown }).rows;
    if (Array.isArray(maybeRows)) return maybeRows;
  }
  throw new Error("Unexpected response format from /api/fragvisreg-data.");
};

const updateLineById = (
  lines: FrequencyLineState[],
  lineId: number,
  updater: (line: FrequencyLineState) => FrequencyLineState
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

  const visibleLines = useMemo(
    () => state.lines.filter((line) => line.visible),
    [state.lines]
  );

  const applySelectedLine = async () => {
    if (state.plotType !== "Frequency") return;
    const lineToFetch = selectedLine;
    if (!lineToFetch) return;

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

      const response = await fetch(apiUrl("/api/fragvisreg-data"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plot_type: "freq",
          phase_state: payloadPhaseState,
          region: payloadRegion,
          ancestry: payloadAncestry,
          mpp: Math.round(lineToFetch.filters.mpp * 100),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch frequency data (HTTP ${response.status}).`);
      }
      console.log(payloadPhaseState,
        payloadRegion,
        payloadAncestry,
        Math.round(lineToFetch.filters.mpp * 100))

      const payload = await response.json();
      const rawRows = parseFrequencyResponse(payload);
      const normalizedRows = normalizeFrequencyRows(rawRows);

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

  const plotTypeIcons: Record<FragVisRegPlotType, JSX.Element> = {
    Frequency: <ShowChartIcon fontSize="small" />,
    Comparison: <CompareArrowsIcon fontSize="small" />,
    Correlation: <AutoGraphIcon fontSize="small" />,
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
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h5">3- Frequency Lines (1 to 10):</Typography>
              </Grid>
              <Grid item xs={12}>
                <ToggleButtonGroup
                  value={state.selectedLineId}
                  exclusive
                  fullWidth
                  onChange={(_event, newValue: number | null) => {
                    if (newValue === null) return;
                    setState((prevState) => ({
                      ...prevState,
                      selectedLineId: newValue,
                    }));
                  }}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    "& .MuiToggleButtonGroup-grouped": {
                      height: "38px",
                      color: "#003d73",
                      "&.Mui-selected": {
                        backgroundColor: "primary.main",
                        color: "white",
                      },
                    },
                  }}
                >
                  {state.lines.map((line) => (
                    <ToggleButton key={line.lineId} value={line.lineId} aria-label={`line-${line.lineId}`}>
                      L{line.lineId}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
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
                    color="secondary"
                    sx={{ flexGrow: 1 }}
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

          {state.plotType !== "Frequency" && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                {state.plotType} is not implemented yet. Frequency mode is fully functional.
              </Typography>
            </Grid>
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
              isSidebarVisible={isSidebarVisible}
            />
            <Box
              sx={{
                position: "absolute",
                left: 12,
                top: 12,
                border: "1px solid #d9dfec",
                borderRadius: "8px",
                bgcolor: "rgba(255,255,255,0.95)",
                px: 1,
                py: 0.5,
                maxWidth: "70%",
                maxHeight: "35%",
                overflowY: "auto",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Active Lines
              </Typography>
              {visibleLines.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Apply at least one line to draw data.
                </Typography>
              )}
              {visibleLines.map((line) => (
                <Box
                  key={line.lineId}
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "2px",
                      backgroundColor: getFrequencyLineColor(line.filters),
                      border: "1px solid #0000001f",
                    }}
                  />
                  <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
                    {getFrequencyLineLabel(line.lineId, line.filters)}
                    {line.status === "loading" ? " (loading)" : ""}
                  </Typography>
                </Box>
              ))}
            </Box>
            <div className="plot-action-bar">
              <PlotDownloadButton plotRef={plotRef} fileName="frag_vis_reg_frequency" />
            </div>
          </Box>
        </Box>
      ) : (
        <Box
          className="page-panel"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Typography variant="h5">{state.plotType} Plot</Typography>
          <Typography variant="body1" color="text.secondary">
            Not implemented yet.
          </Typography>
        </Box>
      )}
    </PageWithSidebar>
  );
}
