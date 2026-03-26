import {
  ancestries_noAll,
  chr_range_marks,
  chrms_all,
  color_chrms,
  min_chr_len_marks,
  mpp_marks,
} from "@/assets/sharedOptions";
import MultipleSelectChip from "@/shared/MultipleSelect/multipleselect";
import { GmailTreeViewWithText } from "@/shared/TreeSelect/TreeSelect";
import { FragVisFilterState } from "@/types/filter-state";
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
import { SetStateAction } from "react";

interface SideFilterProps {
  filters: FragVisFilterState;
  setFilters: (value: SetStateAction<FragVisFilterState>) => void;
  applyFilters: () => Promise<void>;
}

const SideFilter = ({ filters, setFilters, applyFilters }: SideFilterProps) => {
  const handleSingleChange = (key: keyof FragVisFilterState) => {
    return (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      setFilters((prevFilters) => ({
        ...prevFilters,
        [key]: value,
      }));
    };
  };

  const handleMultipleChange = (
    key: keyof FragVisFilterState,
    newValues: string[]
  ) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [key]: newValues,
    }));
  };

  const handleNumberChange = (
    key: keyof FragVisFilterState,
    value: number | [number, number]
  ) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [key]: value,
    }));
  };

  const handleTreeSelectionChange = (selectedItems: string[]) => {
    setFilters((prevFilters) => ({
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
          onSelectedItemsChange={handleTreeSelectionChange}
        />
      </Grid>
      <Grid item xs={12}>
        <MultipleSelectChip
          sx={{ mb: 1, mt: 1 }}
          options={chrms_all.options}
          label="Chromosomes"
          selectedValues={filters.chrms}
          onChange={(newValues) => handleMultipleChange("chrms", newValues)}
        />
        <MultipleSelectChip
          sx={{ mb: 1, mt: 1 }}
          options={ancestries_noAll.options}
          label="Ancestries"
          selectedValues={filters.ancs}
          onChange={(newValues) => handleMultipleChange("ancs", newValues)}
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
            value={filters.mpp}
            onChange={(_, newValue) => handleNumberChange("mpp", newValue as number)}
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
          <Typography className="contrast-text" sx={{ mt: 2, textAlign: "center" }}>
            Chromosome region (kbp limits)
          </Typography>
          <Slider
            value={filters.chrms_limits}
            onChange={(_, newValue) =>
              handleNumberChange("chrms_limits", newValue as [number, number])
            }
            aria-labelledby="range-slider"
            valueLabelDisplay="auto"
            step={5000}
            marks={chr_range_marks}
            min={0}
            max={250000}
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
          <Typography className="contrast-text" sx={{ mt: 2, textAlign: "center" }}>
            Minimum fragment length (kbp)
          </Typography>
          <Slider
            value={filters.min_length}
            onChange={(_, newValue) =>
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
            value={filters.color}
            label="Color by"
            onChange={handleSingleChange("color")}
          >
            {color_chrms.options.map((option) => (
              <MenuItem key={option} value={option}>
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
