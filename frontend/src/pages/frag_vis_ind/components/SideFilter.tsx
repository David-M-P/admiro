import {
  ancestries_noAll,
  chr_range_marks,
  chrms_all,
  color_chrms,
  min_chr_len_marks,
  mpp_marks,
  variables,
} from "@/assets/sharedOptions";
import MultipleSelectChip from "@/shared/MultipleSelect/multipleselect";
import { GmailTreeViewWithText } from "@/shared/TreeSelect/TreeSelect";
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Typography,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import React from "react";

interface FilterState {
  tree_lin: string[];
  chrms: string[];
  ancs: string[];
  mpp: number;
  chrms_limits: [number, number];
  min_length: number;
  color: string;
}

interface SideFilterProps {
  filters: FilterState; // Use your FilterState type here
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>; // Function to set the filters
  applyFilters: () => Promise<void>;
}

type MappingKey = keyof typeof variables.mappingToShort;

const SideFilter: React.FC<SideFilterProps> = ({
  filters,
  setFilters,
  applyFilters,
}) => {
  const handleSingleChangeMapped = (key: keyof FilterState, value: string) => {
    // Use the mapping based on the key
    const mappedValue = variables.mappingToShort[value as MappingKey];

    // Set the original and mapped values in the state
    setFilters((prevFilters: FilterState) => ({
      ...prevFilters,
      [key]: value, // Store the original value for display
      [`${key}_mapped`]: mappedValue, // Store the mapped value for backend
    }));
  };

  const handleSingleChangeUnmapped = (key: keyof FilterState) => {
    return (
      event:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | SelectChangeEvent<string>,
      child?: React.ReactNode
    ) => {
      // Check if the event is a SelectChangeEvent
      const value = "target" in event ? event.target.value : event;

      setFilters((prevFilters: FilterState) => ({
        ...prevFilters,
        [key]: value, // update the specific key in the state
      }));
    };
  };
  const handleMultipleChangeUnmapped = (
    key: keyof FilterState,
    newValues: string[]
  ) => {
    setFilters((prevFilters: FilterState) => ({
      ...prevFilters,
      [key]: newValues, // update the specific key with the new selected values
    }));
  };
  const handleMultipleChangeMapped = (
    key: keyof FilterState,
    newValues: string[],
    mapping: { [key: string]: string }
  ) => {
    // Map the selected values to their corresponding mapped values
    const mappedValues = newValues.map((value) => mapping[value]);

    // Set the original and mapped values in the state
    setFilters((prevFilters: FilterState) => ({
      ...prevFilters,
      [key]: newValues, // Store the original selected values
      [`${key}_mapped`]: mappedValues, // Store the mapped values for backend or processing
    }));
  };

  const handleNumberChange = (key: keyof FilterState, value: number) => {
    setFilters((prevFilters: FilterState) => ({
      ...prevFilters,
      [key]: value,
    }));
  };
  const handleNumberRangeChange = (
    key: keyof FilterState,
    newValue: number[]
  ) => {
    setFilters((prevFilters: FilterState) => ({
      ...prevFilters,
      [key]: newValue, // Update the key (e.g., chrms_limits) with the new range
    }));
  };
  const handleTreeSelectionChange = (selectedItems: string[]) => {
    // Update tree_lin with selected tree items
    setFilters((prevFilters: FilterState) => ({
      ...prevFilters,
      tree_lin: selectedItems,
    }));
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h5">1- Select Individuals:</Typography>
      </Grid>
      <Grid item xs={12}>
        <GmailTreeViewWithText
          selectedItems={filters.tree_lin}
          onSelectedItemsChange={handleTreeSelectionChange} // Handle multiselect in tree
        />
      </Grid>
      <Grid item xs={12}>
        <MultipleSelectChip
          sx={{ mb: 1, mt: 1 }}
          options={chrms_all.options}
          label="Chromosomes"
          selectedValues={filters.chrms}
          onChange={(newValues) =>
            handleMultipleChangeMapped("chrms", newValues, chrms_all.mapping)
          }
        />
        <MultipleSelectChip
          sx={{ mb: 1, mt: 1 }}
          options={ancestries_noAll.options}
          label="Ancestries"
          selectedValues={filters.ancs}
          onChange={(newValues) =>
            handleMultipleChangeMapped(
              "ancs",
              newValues,
              ancestries_noAll.mapping
            )
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
          <Typography
            className="contrast-text"
            sx={{ mt: 2, textAlign: "center" }}
          >
            Mean Posterior Prob.
          </Typography>
          <Slider
            value={filters.mpp}
            onChange={(event, newValue) =>
              handleNumberChange("mpp", newValue as number)
            }
            aria-labelledby="discrete-slider"
            valueLabelDisplay="auto"
            step={0.05}
            marks={mpp_marks}
            min={0.5}
            max={0.95}
            sx={{ width: "85%" }}
          />
        </Box>

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
          {/* Text label for Chromosome region */}
          <Typography
            className="contrast-text"
            sx={{ mt: 2, textAlign: "center" }}
          >
            Chromosome region (kbp limits)
          </Typography>

          {/* Range slider for controlling chrms_limits */}
          <Slider
            value={filters.chrms_limits} // Bind the slider to chrms_limits from FilterState
            onChange={(event, newValue) =>
              handleNumberRangeChange("chrms_limits", newValue as number[])
            }
            aria-labelledby="range-slider"
            valueLabelDisplay="auto"
            step={5000} // Assuming the range will change by 1
            marks={chr_range_marks} // Marks for the slider
            min={0} // Minimum value from chrms_limits
            max={250000} // Maximum value from chrms_limits
            sx={{ width: "85%" }}
          />
        </Box>
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
            Minimum fragment length (kbp)
          </Typography>
          <Slider
            value={filters.min_length}
            onChange={(event, newValue) =>
              handleNumberChange("min_length", newValue as number)
            }
            aria-labelledby="discrete-slider"
            valueLabelDisplay="auto"
            step={10}
            marks={min_chr_len_marks}
            min={0}
            max={1000}
            sx={{ width: "85%" }}
          />
        </Box>
        <FormControl sx={{ mb: 1, mt: 1 }} fullWidth>
          <InputLabel id="color">Color by</InputLabel>
          <Select
            labelId="color"
            id="color"
            value={filters.color} // Bind to the plot state
            label="Color by"
            onChange={handleSingleChangeUnmapped("color")} // Updated handler
          >
            {color_chrms.options.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            sx={{ flexGrow: 1, minWidth: "50%" }}
            onClick={applyFilters}
          >
            Apply Filters
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
};

export default SideFilter;
