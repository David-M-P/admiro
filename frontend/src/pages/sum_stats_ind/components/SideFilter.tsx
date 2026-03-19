import { icons } from "@/assets/icons";
import { checkboxBoxStyles } from "@/assets/styles";
import { DEFAULTS_BY_PLOT } from "@/pages/sum_stats_ind/config/defaultFilters";
import {
  SUMM_STAT_PLOT_OPTIONS_DOUBLE,
  SUMM_STAT_PLOT_OPTIONS_SINGLE,
  SummStatPlotType,
} from "@/pages/sum_stats_ind/config/options";
import { ancestries, bandwidthDivisorMarks, binMarks, chromosomes, mapJitMarks, mppMarks, optionsAxis, phases, regions, tdBandwidthDivisorMarks, tdThresholdDivisorMarks, variables } from "@/pages/sum_stats_ind/static/ssiStatic";
import MultipleSelectChip from "@/shared/MultipleSelect/multipleselect";
import { GmailTreeViewWithText } from "@/shared/TreeSelect/TreeSelect";
import { SummStatFilterState } from "@/types/filter-state";
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
import { SelectChangeEvent } from "@mui/material/Select";
import {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";


interface SideFilterProps {
  tabValue: number;
  setTabValue: (value: number) => void;
  filters: SummStatFilterState;
  setFilters: (value: SetStateAction<SummStatFilterState>) => void;
  applyFilters: () => Promise<void>;
}

const SideFilter = ({
  tabValue,
  setTabValue,
  filters,
  setFilters,
  applyFilters,
}: SideFilterProps) => {
  const {
    tree_lin,
    var_1,
    var_2_1,
    var_2_2,
    data_1,
    ancs_1,
    chrms_1,
    reg_1,
    col,
    fac_x,
    fac_y,
    mpp_1,
  } = filters;
  const [isDirty, setIsDirty] = useState(false);
  const hasMounted = useRef(false);

  // mark dirty on any filter change after initial mount
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
    } else {
      setIsDirty(true);
    }
  }, [
    tree_lin,
    var_1,
    var_2_1,
    var_2_2,
    data_1,
    ancs_1,
    chrms_1,
    reg_1,
    col,
    fac_x,
    fac_y,
    mpp_1,
  ]);


  const onApply = async () => {
    await applyFilters();
    setIsDirty(false);
  };
  const normalizeOptionName = (option: string) =>
    option.toLowerCase().replace(/\s+/g, "_");


  const handleSingle =
    (key: keyof SummStatFilterState) => (event: SelectChangeEvent<string>) => {
      const value = event.target.value;

      setFilters((prevFilters: SummStatFilterState) => ({
        ...prevFilters,
        [key]: value,
      }));
    };


  const toStringArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    if (typeof v === "string") return v ? v.split(",") : [];
    return [];
  };

  const handleMulti =
    (key: keyof SummStatFilterState) =>
      (selectedValues: unknown) => {
        setFilters((prev) => ({ ...prev, [key]: toStringArray(selectedValues) }));
      };


  const handleCheckbox =
    (key: keyof SummStatFilterState) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        setFilters((prevFilters) => ({
          ...prevFilters,
          [key]: event.target.checked,
        }));
      };

  const handleSlider =
    (key: keyof SummStatFilterState) =>
      (_event: Event, newValue: number | number[]) => {
        setFilters((prevFilters) => ({
          ...prevFilters,
          [key]: newValue as number,
        }));
      };

  const handleColor = (selectedValues: string[]) => {

    const selectedDiscrete = selectedValues.filter((v) =>
      variables.discreteOptions.includes(v)
    );

    const selectedContinuous = selectedValues.filter((v) =>
      variables.continousOptions.includes(v)
    );

    if (selectedContinuous.length > 1) {
      alert("You can only color by one continuous variable at a time.");
      return;
    }

    if (selectedDiscrete.length > 0 && selectedContinuous.length > 0) {
      alert(
        "You cannot color by both discrete and continuous variables at the same time."
      );
      return;
    }

    const disableMeanMedian = selectedContinuous.length > 0;

    setFilters((prevFilters) => ({
      ...prevFilters,
      col: selectedValues, // Original values for display
      mea_med_1: disableMeanMedian ? false : prevFilters.mea_med_1, // Reset to false if continuous
      mea_med_x: disableMeanMedian ? false : prevFilters.mea_med_x,
      mea_med_y: disableMeanMedian ? false : prevFilters.mea_med_y,
    }));
  };

  const options =
    tabValue === 0 ? SUMM_STAT_PLOT_OPTIONS_SINGLE : SUMM_STAT_PLOT_OPTIONS_DOUBLE;

  const handleNumberInput =
    (key: keyof SummStatFilterState) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        const numericValue = Number(value);

        setFilters((prevFilters: SummStatFilterState) => ({
          ...prevFilters,
          [key]: numericValue,
        }));
      };

  const handleToggle = (
    _event: ReactMouseEvent<HTMLElement>,
    newValue: number
  ) => {
    if (newValue !== null) {
      setTabValue(newValue);
      setFilters((prevFilters) => ({
        ...prevFilters,
        plot: "",
      }));
    }
  };
  const handleTreeSelection = (selectedItems: string[]) => {
    // Update tree_lin with selected tree items
    setFilters((prevFilters: SummStatFilterState) => ({
      ...prevFilters,
      tree_lin: selectedItems,
    }));
  };
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
          onChange={handleToggle}
          aria-label="dimension toggle"
          fullWidth
          sx={{
            "& .MuiToggleButtonGroup-grouped": {
              borderColor: "primary.main",
              color: "primary.main",
              height: "56px", // Set the height to match the default Select height
              padding: "0 16px", // Adjust padding to match Select's padding
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
          onChange={(event, newPlot) => {
            if (newPlot !== null) {
              const plotType = newPlot as SummStatPlotType;
              const defaultValues = DEFAULTS_BY_PLOT[plotType] ?? {};
              setFilters((prevFilters) => ({
                ...prevFilters,
                plot: plotType,
                ...defaultValues,
              }));
            }
          }}
          aria-label="plot type"
          orientation="vertical"
          fullWidth
          sx={{
            "& .MuiToggleButtonGroup-grouped": {
              height: "40px",
              color: "#003d73", // Default text and SVG color
              "&.Mui-selected": {
                backgroundColor: "primary.main",
                color: "white", // Change text and SVG color
              },
            },
          }}
        >
          {options.map((option, index) => (
            <ToggleButton
              key={index}
              value={option}
              aria-label={option}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#003d73", // Default color
                "&.Mui-selected": {
                  color: "white", // Selected color
                },
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  marginRight: 1,
                }}
              >
                {icons.get(normalizeOptionName(option)) || null}{" "}
                {/* Fetch the appropriate SVG */}
              </Box>
              {option}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Grid>
      <>
        <Grid item xs={12}>
          <Typography variant="h5">2- Data Filters:</Typography>
        </Grid>
        <Grid item xs={12}>
          <MultipleSelectChip
            sx={{ mb: 1 }}
            options={phases.options}
            label="Select phase(s)"
            selectedValues={filters.phases}
            onChange={handleMulti("phases")}
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

            <Typography
              className="contrast-text"
              sx={{ mt: 2, textAlign: "center" }}
            >
              Mean Posterior Prob.
            </Typography>
            <Slider
              value={filters.mpp_1}
              onChange={handleSlider("mpp_1")}
              aria-labelledby="discrete-slider"
              valueLabelDisplay="auto"
              step={0.05}
              marks={mppMarks}
              min={0.5}
              max={0.95}
              sx={{ width: "85%" }}
            />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              onClick={onApply}
              variant="contained"
              disabled={!isDirty}
              sx={{
                flexGrow: 1,
                minWidth: "50%",
                // when disabled, override MUI’s default gray
                "&.Mui-disabled": {
                  backgroundColor: "grey.300",
                  color: "black",
                },
                // when enabled + dirty, optional pulse
                ...(isDirty && {
                  animation: "pulse 1.2s ease-in-out infinite",
                  "@keyframes pulse": {
                    "0%": { boxShadow: "0 0 0 0 rgb(0, 60, 255)" },
                    "70%": { boxShadow: "0 0 0 10px rgba(255,165,0, 0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(255,165,0, 0)" },
                  }
                })
              }}
            >
              Apply Filters
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h5">3- Exclude Individuals:</Typography>
        </Grid>
        <Grid item xs={12}>
          <GmailTreeViewWithText
            selectedItems={filters.tree_lin}
            onSelectedItemsChange={handleTreeSelection} // Handle multiselect in tree
          />
        </Grid>
      </>
      <Grid item xs={12}>
        <Typography variant="h5">4- Plot Options:</Typography>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={1}>
          {tabValue === 0 && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="var_1_select-label">Variable</InputLabel>
                <Select
                  labelId="var_1_select-label"
                  id="var_1_select"
                  value={filters.var_1} // Bind to the original value for display
                  label="Variable_1"
                  onChange={handleSingle("var_1")}
                >
                  {filters.plot === "Density" || filters.plot === "Violin"
                    ? variables.continousOptions.map((option, index) => (
                      <MenuItem key={index} value={option}>
                        {option}
                      </MenuItem>
                    ))
                    : variables.allOptions.map((option, index) => (
                      <MenuItem key={index} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          {tabValue === 1 && (
            <>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel id="var_2_1_select-label">
                    Variable in X
                  </InputLabel>
                  <Select
                    labelId="var_2_1_select-label"
                    id="var_2_1_select"
                    value={filters.var_2_1}
                    label="Variable_2_1"
                    onChange={handleSingle("var_2_1")}
                  >
                    {variables.continousOptions.map((option, index) => (
                      <MenuItem key={index} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel id="var_2_2_select-label">
                    Variable in Y
                  </InputLabel>
                  <Select
                    labelId="var_2_2_select-label"
                    id="var_2_2_select"
                    value={filters.var_2_2}
                    label="Variable_2_2"
                    onChange={handleSingle("var_2_2")}
                  >
                    {variables.continousOptions.map((option, index) => (
                      <MenuItem key={index} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

              </Grid>
            </>
          )}
          <Grid item xs={12}>

            <MultipleSelectChip
              sx={{ mb: 1, mt: 1 }}
              options={ancestries.options}
              label="Ancestries"
              selectedValues={filters.ancs_1}
              onChange={handleMulti("ancs_1")}
            />
            <MultipleSelectChip
              sx={{ mb: 1, mt: 1 }}
              options={chromosomes.options}
              label="Chromosomes"
              selectedValues={filters.chrms_1}
              onChange={handleMulti("chrms_1")}
            />
            <MultipleSelectChip
              sx={{ mb: 1, mt: 1 }}
              options={regions.options}
              label="Region"
              selectedValues={filters.reg_1}
              onChange={handleMulti("reg_1")}
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
              {filters.plot !== "Map" && (
                <>
                  <MultipleSelectChip
                    sx={{ mb: 1 }}
                    options={
                      filters.plot !== "Violin" && filters.plot !== "Density"
                        ? variables.allOptions
                        : variables.discreteOptions
                    }
                    label="Color by"
                    selectedValues={filters.col}
                    onChange={handleColor}
                  />

                  <MultipleSelectChip
                    sx={{ mb: 1, mt: 1 }}
                    options={variables.discreteOptions}
                    label="Facet in X"
                    selectedValues={filters.fac_x}
                    onChange={handleMulti("fac_x")}
                  />

                  {filters.plot !== "Violin" && (
                    <MultipleSelectChip
                      sx={{ mt: 1 }}
                      options={variables.discreteOptions}
                      label="Facet in Y"
                      selectedValues={filters.fac_y}
                      onChange={handleMulti("fac_y")}
                    />
                  )}
                </>
              )}
            </Box>

            {filters.plot !== "Map" && (
              <>
                {tabValue !== 1 ? (
                  <Box sx={checkboxBoxStyles}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filters.mea_med_1}
                          size="small"
                          onChange={handleCheckbox("mea_med_1")}
                          disabled={filters.col.some((col) =>
                            variables.continousOptions.includes(col)
                          )} // Disable when continuous variable is selected
                        />
                      }
                      label="Mean/Median"
                    />
                  </Box>
                ) : (
                  <>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Box sx={checkboxBoxStyles}>
                          <FormControlLabel
                            value="bottom"
                            control={
                              <Checkbox
                                checked={filters.mea_med_x}
                                size="small"
                                onChange={handleCheckbox("mea_med_x")}
                                disabled={filters.col.some((col) =>
                                  variables.continousOptions.includes(col)
                                )} // Disable when continuous variable is selected
                              />
                            }
                            label="Mea/Med X"
                            labelPlacement="end"
                            sx={{ width: "95%" }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={checkboxBoxStyles}>
                          <FormControlLabel
                            value="bottom"
                            control={
                              <Checkbox
                                checked={filters.mea_med_y}
                                size="small"
                                onChange={handleCheckbox("mea_med_y")}
                                disabled={filters.col.some((col) =>
                                  variables.continousOptions.includes(col)
                                )} // Disable when continuous variable is selected
                              />
                            }
                            label="Mea/Med Y"
                            labelPlacement="end"
                            sx={{ width: "95%" }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </>
                )}

                {filters.plot !== "Violin" && (
                  <FormControl sx={{ mb: 1, mt: 1 }} fullWidth>
                    <InputLabel id="x_axis_options">X Axis Options</InputLabel>
                    <Select
                      labelId="x_axis_options"
                      id="x_axis_options"
                      value={filters.x_axis} // Bind to the plot state
                      label="X Axis Options"
                      onChange={handleSingle("x_axis")} // Updated handler
                    >
                      {optionsAxis.map((option, index) => (
                        <MenuItem key={index} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {filters.x_axis === "Define Range" && filters.plot !== "Violin"
                  && (
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
                  )}
                {filters.plot !== "Histogram" && filters.plot !== "Density" &&
                  (<FormControl sx={{ mb: 1, mt: 1 }} fullWidth>
                    <InputLabel id="y_axis_options">Y Axis Options</InputLabel>
                    <Select
                      labelId="y_axis_options"
                      id="y_axis_options"
                      value={filters.y_axis} // Bind to the plot state
                      label="Y Axis Options"
                      onChange={handleSingle("y_axis")} // Updated handler
                    >
                      {/* Dynamically determine the options */}
                      {(
                        filters.plot === "Violin"
                          ? ["Shared Axis", "Define Range"]
                          : ["Free Axis", "Shared Axis", "Define Range"]
                      ).map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>)}

                {filters.y_axis === "Define Range" && (
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      mb: 1,
                      mt: 1,
                      justifyContent: "space-between",
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
                )}
                {(filters.plot === "Violin" || filters.plot === "Density") && (
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
                    <Typography
                      className="contrast-text"
                      sx={{ mt: 0, textAlign: "center" }}
                    >
                      Plot smoothness
                    </Typography>
                    <Slider
                      value={filters.bandwidth_divisor}
                      onChange={handleSlider("bandwidth_divisor")}
                      aria-labelledby="discrete-slider"
                      valueLabelDisplay="off"
                      step={1}
                      marks={bandwidthDivisorMarks}
                      min={1}
                      max={100}
                      sx={{ width: "85%" }}
                    />
                  </Box>
                )}
                {(filters.plot === "2D Density") && (
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
                    <Typography
                      className="contrast-text"
                      sx={{ mt: 0, textAlign: "center" }}
                    >
                      Plot smoothness
                    </Typography>
                    <Slider
                      value={filters.bandwidth_divisor}
                      onChange={handleSlider("bandwidth_divisor")}
                      aria-labelledby="discrete-slider"
                      valueLabelDisplay="off"
                      step={1}
                      marks={tdBandwidthDivisorMarks}
                      min={1}
                      max={50}
                      sx={{ width: "85%" }}
                    />
                  </Box>
                )}
                {(filters.plot === "2D Density") && (
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
                    <Typography
                      className="contrast-text"
                      sx={{ mt: 0, textAlign: "center" }}
                    >
                      Number of steps
                    </Typography>
                    <Slider
                      value={filters.thresholds}
                      onChange={handleSlider("thresholds")}
                      aria-labelledby="discrete-slider"
                      valueLabelDisplay="off"
                      step={1}
                      marks={tdThresholdDivisorMarks}
                      min={10}
                      max={45}
                      sx={{ width: "85%" }}
                    />
                  </Box>
                )}
                {filters.plot === "Histogram" && (
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      className="contrast-text"
                      sx={{ textAlign: "center" }}
                    >
                      Number of bins
                    </Typography>
                    <Slider
                      value={filters.n_bins}
                      onChange={handleSlider("n_bins")}
                      aria-labelledby="discrete-slider"
                      valueLabelDisplay="auto"
                      step={1}
                      marks={binMarks}
                      min={0}
                      max={100}
                      sx={{ width: "85%" }}
                    />
                  </Box>
                )}
              </>
            )}
            {filters.plot === "Map" && (
              <>
                <Box sx={checkboxBoxStyles}>
                  <FormControlLabel
                    value="bottom"
                    control={
                      <Checkbox
                        checked={filters.map_data}
                        size="small"
                        onChange={handleCheckbox("map_data")}
                      />
                    }
                    label="Points for Dataset"
                    labelPlacement="end"
                    sx={{ width: "100%" }}
                  />
                </Box>
                {filters.map_data === true && (
                  <TextField
                    sx={{ width: "100%", mb: 1, mt: 1 }}
                    label="Radius for Dataset points"
                    inputProps={{ type: "number" }}
                    value={filters.map_data_rad}
                    onChange={handleNumberInput("map_data_rad")}
                  />
                )}
                <Box sx={checkboxBoxStyles}>
                  <FormControlLabel
                    value="bottom"
                    control={
                      <Checkbox
                        checked={filters.map_reg}
                        size="small"
                        onChange={handleCheckbox("map_reg")}
                      />
                    }
                    label="Points for Region"
                    labelPlacement="end"
                    sx={{ width: "100%" }}
                  />
                </Box>
                {filters.map_reg === true && (
                  <TextField
                    sx={{ width: "100%", mb: 1, mt: 1 }}
                    label="Radius for Region points"
                    inputProps={{ type: "number" }}
                    value={filters.map_reg_rad}
                    onChange={handleNumberInput("map_reg_rad")}
                  />
                )}
                <Box sx={checkboxBoxStyles}>
                  <FormControlLabel
                    value="bottom"
                    control={
                      <Checkbox
                        checked={filters.map_pop}
                        size="small"
                        onChange={handleCheckbox("map_pop")}
                      />
                    }
                    label="Points for Population"
                    labelPlacement="end"
                    sx={{ width: "100%" }}
                  />
                </Box>
                {filters.map_pop === true && (
                  <TextField
                    sx={{ width: "100%", mb: 1, mt: 1 }}
                    label="Radius for Population points"
                    inputProps={{ type: "number" }}
                    value={filters.map_pop_rad}
                    onChange={handleNumberInput("map_pop_rad")}
                  />
                )}
                <TextField
                  sx={{ width: "100%", mb: 1, mt: 1 }}
                  label="Radius for Individual points"
                  inputProps={{ type: "number" }}
                  value={filters.map_ind_rad}
                  onChange={handleNumberInput("map_ind_rad")}
                />{" "}
                <Typography
                  className="contrast-text"
                  sx={{ mt: 1, textAlign: "center" }}
                >
                  Point Jitter
                </Typography>
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

                  <Box
                    sx={{
                      width: "45%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      className="contrast-text"
                      sx={{ textAlign: "center" }}
                    >
                      Latitude
                    </Typography>
                    <Slider
                      value={filters.map_lat_jit}
                      onChange={handleSlider("map_lat_jit")}
                      aria-labelledby="discrete-slider"
                      valueLabelDisplay="auto"
                      step={1}
                      marks={mapJitMarks}
                      min={0}
                      max={10}
                      sx={{ width: "85%" }}
                    />
                  </Box>
                  <Box
                    sx={{
                      width: "45%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      className="contrast-text"
                      sx={{ textAlign: "center" }}
                    >
                      Longitude
                    </Typography>
                    <Slider
                      value={filters.map_lon_jit}
                      onChange={handleSlider("map_lon_jit")}
                      aria-labelledby="discrete-slider"
                      valueLabelDisplay="auto"
                      step={1}
                      marks={mapJitMarks}
                      min={0}
                      max={10}
                      sx={{ width: "85%" }}
                    />
                  </Box>
                </Box>
              </>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default SideFilter;
