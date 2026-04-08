import { icons } from "@/assets/icons";
import { checkboxBoxStyles } from "@/assets/styles";
import { DEFAULTS_BY_PLOT, INITIAL_SUMM_FRAG_FILTERS } from "@/pages/sum_stats_frag/config/defaultFilters";
import {
  SUMM_STAT_FRAG_PLOT_OPTIONS_DOUBLE,
  SUMM_STAT_FRAG_PLOT_OPTIONS_SINGLE,
  type SummStatFragPlotType,
} from "@/pages/sum_stats_frag/config/options";
import { isContinuousColumn } from "@/pages/sum_stats_frag/domain/columns";
import {
  ancestries,
  bandwidthDivisorMarks,
  binMarks,
  chromosomes,
  mppMarks,
  optionsAxis,
  tdBandwidthDivisorMarks,
  tdThresholdDivisorMarks,
  variables,
} from "@/pages/sum_stats_frag/static/ssiStatic";
import MultipleSelectChip from "@/shared/MultipleSelect/multipleselect";
import { GmailTreeViewWithText } from "@/shared/TreeSelect/TreeSelect";
import type { SummStatFragFilterState } from "@/types/filter-state";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { ChangeEvent, MouseEvent as ReactMouseEvent, SetStateAction } from "react";

interface SideFilterProps {
  tabValue: number;
  setTabValue: (value: number) => void;
  filters: SummStatFragFilterState;
  setFilters: (value: SetStateAction<SummStatFragFilterState>) => void;
  applyFilters: () => Promise<void>;
  isApplyDirty: boolean;
  loading: boolean;
}

const normalizeOptionName = (option: string) => option.toLowerCase().replace(/\s+/g, "_");

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  if (typeof value === "string") return value ? value.split(",") : [];
  return [];
};

const defaultPlotForDimension = (dimension: number): SummStatFragPlotType =>
  dimension === 0 ? "Histogram" : "Points";

const getPlotDefault = <K extends keyof SummStatFragFilterState>(
  plotType: SummStatFragPlotType,
  key: K,
): SummStatFragFilterState[K] => {
  const defaults = DEFAULTS_BY_PLOT[plotType];
  return (defaults?.[key] ?? INITIAL_SUMM_FRAG_FILTERS[key]) as SummStatFragFilterState[K];
};

const hasSelectedPlotOptions = (filters: SummStatFragFilterState): boolean => {
  return (
    filters.var_1.length > 0 ||
    filters.var_2_1.length > 0 ||
    filters.var_2_2.length > 0 ||
    filters.tree_lin.length > 0 ||
    filters.ancs.length > 0 ||
    filters.chrms.length > 0 ||
    filters.col.length > 0 ||
    filters.fac_x.length > 0 ||
    filters.fac_y.length > 0 ||
    filters.mpp !== INITIAL_SUMM_FRAG_FILTERS.mpp
  );
};

const applyPlotSwitchRules = (
  prevFilters: SummStatFragFilterState,
  plotType: SummStatFragPlotType,
): SummStatFragFilterState => {
  const defaults = DEFAULTS_BY_PLOT[plotType] ?? {};
  const applyFullDefaults = !hasSelectedPlotOptions(prevFilters);

  let nextFilters: SummStatFragFilterState = applyFullDefaults
    ? ({ ...prevFilters, plot: plotType, ...defaults } as SummStatFragFilterState)
    : { ...prevFilters, plot: plotType };

  if (plotType === "Histogram" || plotType === "Density" || plotType === "Violin") {
    if (!nextFilters.var_1) {
      nextFilters.var_1 = getPlotDefault(plotType, "var_1");
    }
  }

  if (plotType === "Points" || plotType === "2D Density") {
    if (!nextFilters.var_2_1) nextFilters.var_2_1 = getPlotDefault(plotType, "var_2_1");
    if (!nextFilters.var_2_2) nextFilters.var_2_2 = getPlotDefault(plotType, "var_2_2");
  }

  switch (plotType) {
    case "Violin":
      nextFilters.var_1 = isContinuousColumn(nextFilters.var_1)
        ? nextFilters.var_1
        : getPlotDefault("Violin", "var_1");
      return {
        ...nextFilters,
        // Violin does not expose x-axis controls; keep it neutral and reset bounds.
        x_axis: "Shared Axis",
        min_x_axis: INITIAL_SUMM_FRAG_FILTERS.min_x_axis,
        max_x_axis: INITIAL_SUMM_FRAG_FILTERS.max_x_axis,
        y_axis: "Shared Axis",
        min_y_axis: getPlotDefault("Violin", "min_y_axis"),
        max_y_axis: getPlotDefault("Violin", "max_y_axis"),
        fac_y: [],
        bandwidth_divisor: getPlotDefault("Violin", "bandwidth_divisor"),
      };
    case "Histogram":
      return {
        ...nextFilters,
        x_axis: "Shared Axis",
        min_x_axis: getPlotDefault("Histogram", "min_x_axis"),
        max_x_axis: getPlotDefault("Histogram", "max_x_axis"),
        y_axis: "Free Axis",
        min_y_axis: getPlotDefault("Histogram", "min_y_axis"),
        max_y_axis: getPlotDefault("Histogram", "max_y_axis"),
      };
    case "Density":
      nextFilters.var_1 = isContinuousColumn(nextFilters.var_1)
        ? nextFilters.var_1
        : getPlotDefault("Density", "var_1");
      return {
        ...nextFilters,
        x_axis: "Shared Axis",
        min_x_axis: getPlotDefault("Density", "min_x_axis"),
        max_x_axis: getPlotDefault("Density", "max_x_axis"),
        y_axis: "Free Axis",
        min_y_axis: getPlotDefault("Density", "min_y_axis"),
        max_y_axis: getPlotDefault("Density", "max_y_axis"),
        bandwidth_divisor: getPlotDefault("Density", "bandwidth_divisor"),
      };
    case "Points":
      return {
        ...nextFilters,
        x_axis: "Shared Axis",
        min_x_axis: getPlotDefault("Points", "min_x_axis"),
        max_x_axis: getPlotDefault("Points", "max_x_axis"),
        y_axis: "Shared Axis",
        min_y_axis: getPlotDefault("Points", "min_y_axis"),
        max_y_axis: getPlotDefault("Points", "max_y_axis"),
      };
    case "2D Density":
      return {
        ...nextFilters,
        x_axis: "Shared Axis",
        min_x_axis: getPlotDefault("2D Density", "min_x_axis"),
        max_x_axis: getPlotDefault("2D Density", "max_x_axis"),
        y_axis: "Shared Axis",
        min_y_axis: getPlotDefault("2D Density", "min_y_axis"),
        max_y_axis: getPlotDefault("2D Density", "max_y_axis"),
        bandwidth_divisor: getPlotDefault("2D Density", "bandwidth_divisor"),
        thresholds: getPlotDefault("2D Density", "thresholds"),
      };
    default:
      return nextFilters;
  }
};

const SideFilter = ({
  tabValue,
  setTabValue,
  filters,
  setFilters,
  applyFilters,
  isApplyDirty,
  loading,
}: SideFilterProps) => {
  const handleSingle =
    (key: keyof SummStatFragFilterState) => (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      setFilters((prevFilters) => ({
        ...prevFilters,
        [key]: value,
      }));
    };

  const handleMulti =
    (key: keyof SummStatFragFilterState) =>
    (selectedValues: unknown) => {
      setFilters((prev) => ({ ...prev, [key]: toStringArray(selectedValues) }));
    };

  const handleCheckbox =
    (key: keyof SummStatFragFilterState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFilters((prevFilters) => ({
        ...prevFilters,
        [key]: event.target.checked,
      }));
    };

  const handleSlider =
    (key: keyof SummStatFragFilterState) =>
    (_event: Event, newValue: number | number[]) => {
      setFilters((prevFilters) => ({
        ...prevFilters,
        [key]: newValue as number,
      }));
    };

  const handleNumberInput =
    (key: keyof SummStatFragFilterState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      const numericValue = Number(value);
      setFilters((prevFilters) => ({
        ...prevFilters,
        [key]: numericValue,
      }));
    };

  const handleDimensionToggle = (
    _event: ReactMouseEvent<HTMLElement>,
    newValue: number | null,
  ) => {
    if (newValue === null) return;

    setTabValue(newValue);
    const nextPlot = defaultPlotForDimension(newValue);
    setFilters((prevFilters) => applyPlotSwitchRules(prevFilters, nextPlot));
  };

  const handlePlotChange = (_event: ReactMouseEvent<HTMLElement>, newPlot: string | null) => {
    if (newPlot == null) return;
    const plotType = newPlot as SummStatFragPlotType;
    setFilters((prevFilters) => applyPlotSwitchRules(prevFilters, plotType));
  };

  const handleTreeSelection = (selectedItems: string[]) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      tree_lin: selectedItems,
    }));
  };

  const handleColor = (selectedValues: string[]) => {
    const selectedDiscrete = selectedValues.filter((value) => variables.discreteOptions.includes(value));
    const selectedContinuous = selectedValues.filter((value) => variables.continuousOptions.includes(value));

    if (selectedContinuous.length > 1) {
      alert("You can only color by one continuous variable at a time.");
      return;
    }

    if (selectedDiscrete.length > 0 && selectedContinuous.length > 0) {
      alert("You cannot color by both discrete and continuous variables at the same time.");
      return;
    }

    const disableMeanMedian = selectedContinuous.length > 0;

    setFilters((prevFilters) => ({
      ...prevFilters,
      col: selectedValues,
      mea_med_1: disableMeanMedian ? false : prevFilters.mea_med_1,
      mea_med_x: disableMeanMedian ? false : prevFilters.mea_med_x,
      mea_med_y: disableMeanMedian ? false : prevFilters.mea_med_y,
    }));
  };

  const handleVariable1Change = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setFilters((prevFilters) => ({
      ...prevFilters,
      var_1: value,
      mea_med_1: isContinuousColumn(value) ? prevFilters.mea_med_1 : false,
    }));
  };

  const colorHasContinuousSelection = filters.col.some((value) => variables.continuousOptions.includes(value));
  const isSingleVariableContinuous = isContinuousColumn(filters.var_1);
  const options =
    tabValue === 0 ? SUMM_STAT_FRAG_PLOT_OPTIONS_SINGLE : SUMM_STAT_FRAG_PLOT_OPTIONS_DOUBLE;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h5">1- Select Type of Plot:</Typography>
      </Grid>
      <Grid item xs={12}>
        <ToggleButtonGroup
          value={tabValue}
          id="dimension-toggle"
          exclusive
          onChange={handleDimensionToggle}
          aria-label="dimension toggle"
          fullWidth
          sx={{
            "& .MuiToggleButtonGroup-grouped": {
              borderColor: "primary.main",
              color: "primary.main",
              height: "56px",
              padding: "0 16px",
              "&.Mui-selected": {
                backgroundColor: "primary.main",
                color: "white",
              },
              "&:hover": {
                backgroundColor: "primary.light",
              },
            },
          }}
        >
          <ToggleButton value={0} aria-label="1 dimension">
            1 Dimension
          </ToggleButton>
          <ToggleButton value={1} aria-label="2 dimensions">
            2 Dimensions
          </ToggleButton>
        </ToggleButtonGroup>
      </Grid>
      <Grid item xs={12}>
        <ToggleButtonGroup
          value={filters.plot}
          exclusive
          onChange={handlePlotChange}
          aria-label="plot type"
          orientation="vertical"
          fullWidth
          sx={{
            "& .MuiToggleButtonGroup-grouped": {
              height: "40px",
              color: "#003d73",
              "&.Mui-selected": {
                backgroundColor: "primary.main",
                color: "white",
              },
            },
          }}
        >
          {options.map((option) => (
            <ToggleButton
              key={option}
              value={option}
              aria-label={option}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#003d73",
                "&.Mui-selected": {
                  color: "white",
                },
              }}
            >
              <Box sx={{ width: 24, height: 24, marginRight: 1 }}>
                {icons.get(normalizeOptionName(option)) || null}
              </Box>
              {option}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h5">2- Data Filters:</Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography sx={{ mb: 1 }}>Individuals to include</Typography>
        <GmailTreeViewWithText
          selectedItems={filters.tree_lin}
          onSelectedItemsChange={handleTreeSelection}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          onClick={applyFilters}
          variant="contained"
          disabled={!isApplyDirty || loading}
          sx={{
            width: "100%",
            "&.Mui-disabled": {
              backgroundColor: "grey.300",
              color: "black",
            },
          }}
        >
          {loading ? "Loading..." : "Apply Filters"}
        </Button>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h5">3- Browser Filters:</Typography>
      </Grid>
      <Grid item xs={12}>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography className="contrast-text" sx={{ mt: 1, textAlign: "center" }}>
            Mean Posterior Probability
          </Typography>
          <Slider
            value={filters.mpp}
            onChange={handleSlider("mpp")}
            valueLabelDisplay="auto"
            step={5}
            marks={mppMarks}
            min={50}
            max={95}
            sx={{ width: "85%" }}
          />
        </Box>
        <MultipleSelectChip
          sx={{ mb: 1, mt: 1 }}
          options={ancestries.options}
          label="Ancestries"
          selectedValues={filters.ancs}
          onChange={handleMulti("ancs")}
        />
        <MultipleSelectChip
          sx={{ mb: 1, mt: 1 }}
          options={chromosomes.options}
          label="Chromosomes"
          selectedValues={filters.chrms}
          onChange={handleMulti("chrms")}
        />
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h5">4- Plot Options:</Typography>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={1}>
          {tabValue === 0 ? (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="var_1_select-label">Variable</InputLabel>
                <Select
                  labelId="var_1_select-label"
                  id="var_1_select"
                  value={filters.var_1}
                  label="Variable"
                  onChange={handleVariable1Change}
                >
                  {(filters.plot === "Density" || filters.plot === "Violin"
                    ? variables.continuousOptions
                    : variables.allOptions
                  ).map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ) : (
            <>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel id="var_2_1_select-label">Variable in X</InputLabel>
                  <Select
                    labelId="var_2_1_select-label"
                    id="var_2_1_select"
                    value={filters.var_2_1}
                    label="Variable in X"
                    onChange={handleSingle("var_2_1")}
                  >
                    {variables.continuousOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel id="var_2_2_select-label">Variable in Y</InputLabel>
                  <Select
                    labelId="var_2_2_select-label"
                    id="var_2_2_select"
                    value={filters.var_2_2}
                    label="Variable in Y"
                    onChange={handleSingle("var_2_2")}
                  >
                    {variables.continuousOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {filters.plot !== "2D Density" && (
            <Grid item xs={12}>
              <MultipleSelectChip
                sx={{ mb: 1, mt: 1 }}
                options={
                  filters.plot === "Violin" || filters.plot === "Density"
                    ? variables.discreteOptions
                    : variables.allOptions
                }
                label="Color by"
                selectedValues={filters.col}
                onChange={handleColor}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <MultipleSelectChip
              sx={{ mb: 1, mt: 1 }}
              options={variables.discreteOptions}
              label="Facet in X"
              selectedValues={filters.fac_x}
              onChange={handleMulti("fac_x")}
            />
          </Grid>

          {filters.plot !== "Violin" && filters.plot !== "2D Density" && (
            <Grid item xs={12}>
              <MultipleSelectChip
                sx={{ mb: 1, mt: 1 }}
                options={variables.discreteOptions}
                label="Facet in Y"
                selectedValues={filters.fac_y}
                onChange={handleMulti("fac_y")}
              />
            </Grid>
          )}

          {tabValue === 0 ? (
            <Grid item xs={12}>
              <Box sx={checkboxBoxStyles}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.mea_med_1}
                      size="small"
                      onChange={handleCheckbox("mea_med_1")}
                      disabled={colorHasContinuousSelection || !isSingleVariableContinuous}
                    />
                  }
                  label="Mean/Median"
                />
              </Box>
            </Grid>
          ) : (
            <>
              <Grid item xs={6}>
                <Box sx={checkboxBoxStyles}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.mea_med_x}
                        size="small"
                        onChange={handleCheckbox("mea_med_x")}
                        disabled={colorHasContinuousSelection}
                      />
                    }
                    label="Mea/Med X"
                    sx={{ width: "95%" }}
                  />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={checkboxBoxStyles}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.mea_med_y}
                        size="small"
                        onChange={handleCheckbox("mea_med_y")}
                        disabled={colorHasContinuousSelection}
                      />
                    }
                    label="Mea/Med Y"
                    sx={{ width: "95%" }}
                  />
                </Box>
              </Grid>
            </>
          )}

          {filters.plot !== "Violin" && (
            <Grid item xs={12}>
              <FormControl sx={{ mb: 1, mt: 1 }} fullWidth>
                <InputLabel id="x_axis_options">X Axis Options</InputLabel>
                <Select
                  labelId="x_axis_options"
                  id="x_axis_options"
                  value={filters.x_axis}
                  label="X Axis Options"
                  onChange={handleSingle("x_axis")}
                >
                  {optionsAxis.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {filters.x_axis === "Define Range" && filters.plot !== "Violin" && (
            <Grid item xs={12}>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                  mt: 1,
                }}
              >
                <TextField
                  sx={{ width: "49%" }}
                  label="Min X"
                  inputProps={{ type: "number" }}
                  value={filters.min_x_axis}
                  onChange={handleNumberInput("min_x_axis")}
                />
                <TextField
                  sx={{ width: "49%" }}
                  label="Max X"
                  inputProps={{ type: "number" }}
                  value={filters.max_x_axis}
                  onChange={handleNumberInput("max_x_axis")}
                />
              </Box>
            </Grid>
          )}

          {filters.plot !== "Histogram" && filters.plot !== "Density" && (
            <Grid item xs={12}>
              <FormControl sx={{ mb: 1, mt: 1 }} fullWidth>
                <InputLabel id="y_axis_options">Y Axis Options</InputLabel>
                <Select
                  labelId="y_axis_options"
                  id="y_axis_options"
                  value={filters.y_axis}
                  label="Y Axis Options"
                  onChange={handleSingle("y_axis")}
                >
                  {(filters.plot === "Violin"
                    ? ["Shared Axis", "Define Range"]
                    : ["Free Axis", "Shared Axis", "Define Range"]
                  ).map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {filters.y_axis === "Define Range" && filters.plot !== "Histogram" && filters.plot !== "Density" && (
            <Grid item xs={12}>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                  mt: 1,
                }}
              >
                <TextField
                  sx={{ width: "49%" }}
                  label="Min Y"
                  inputProps={{ type: "number" }}
                  value={filters.min_y_axis}
                  onChange={handleNumberInput("min_y_axis")}
                />
                <TextField
                  sx={{ width: "49%" }}
                  label="Max Y"
                  inputProps={{ type: "number" }}
                  value={filters.max_y_axis}
                  onChange={handleNumberInput("max_y_axis")}
                />
              </Box>
            </Grid>
          )}

          {(filters.plot === "Violin" || filters.plot === "Density") && (
            <Grid item xs={12}>
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
                <Typography className="contrast-text" sx={{ textAlign: "center" }}>
                  Plot smoothness
                </Typography>
                <Slider
                  value={filters.bandwidth_divisor}
                  onChange={handleSlider("bandwidth_divisor")}
                  valueLabelDisplay="off"
                  step={1}
                  marks={bandwidthDivisorMarks}
                  min={1}
                  max={100}
                  sx={{ width: "85%" }}
                />
              </Box>
            </Grid>
          )}

          {filters.plot === "2D Density" && (
            <>
              <Grid item xs={12}>
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
                  <Typography className="contrast-text" sx={{ textAlign: "center" }}>
                    Plot smoothness
                  </Typography>
                  <Slider
                    value={filters.bandwidth_divisor}
                    onChange={handleSlider("bandwidth_divisor")}
                    valueLabelDisplay="off"
                    step={1}
                    marks={tdBandwidthDivisorMarks}
                    min={1}
                    max={50}
                    sx={{ width: "85%" }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
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
                  <Typography className="contrast-text" sx={{ textAlign: "center" }}>
                    Number of steps
                  </Typography>
                  <Slider
                    value={filters.thresholds}
                    onChange={handleSlider("thresholds")}
                    valueLabelDisplay="off"
                    step={1}
                    marks={tdThresholdDivisorMarks}
                    min={10}
                    max={45}
                    sx={{ width: "85%" }}
                  />
                </Box>
              </Grid>
            </>
          )}

          {filters.plot === "Histogram" && (
            <Grid item xs={12}>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Typography className="contrast-text" sx={{ textAlign: "center" }}>
                  Number of bins
                </Typography>
                <Slider
                  value={filters.n_bins}
                  onChange={handleSlider("n_bins")}
                  valueLabelDisplay="auto"
                  step={1}
                  marks={binMarks}
                  min={0}
                  max={100}
                  sx={{ width: "85%" }}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Grid>
  );
};

export default SideFilter;
