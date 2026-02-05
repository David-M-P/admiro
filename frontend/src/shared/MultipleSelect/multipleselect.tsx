import * as React from "react";
import { Theme, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Chip from "@mui/material/Chip";
import { useId } from "react";
import Divider from "@mui/material/Divider"; // Import Divider

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const DEFAULT_MENU_WIDTH = 250;

const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
    },
  },
};

function getStyles(
  name: string,
  selectedValues: readonly string[],
  theme: Theme
) {
  return {
    fontWeight:
      selectedValues.indexOf(name) === -1
        ? theme.typography.fontWeightRegular
        : theme.typography.fontWeightMedium,
  };
}

interface MultipleSelectChipProps {
  options: string[];
  label: string;
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  variant?: "text" | "outlined" | "contained"; // Variant to match MUI Button
  sx?: object;
  menuWidth?: number;
}

const MultipleSelectChip: React.FC<MultipleSelectChipProps> = ({
  options,
  label,
  selectedValues,
  onChange,
  variant = "outlined", // Default to "outlined" like a button
  sx = {},
  menuWidth = DEFAULT_MENU_WIDTH,
}) => {
  const theme = useTheme();

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;

    const rawValues = typeof value === "string" ? value.split(",") : value;

    let newSelectedValues = rawValues.filter(
      (val) => val !== "__all" && val !== "__none"
    );

    if (rawValues.includes("__all")) {
      newSelectedValues = options;
    } else if (rawValues.includes("__none")) {
      newSelectedValues = [];
    }

    onChange(newSelectedValues);
  };

  const labelId = useId();
  const selectId = useId();
  const inputId = useId();

  return (
    <FormControl sx={{ width: "100%", ...sx }}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        id={selectId}
        multiple
        value={selectedValues}
        onChange={handleChange}
        input={
          <OutlinedInput
            id={inputId}
            label={label}
            sx={{
              padding: 0,
              borderRadius: 1,
              "& .MuiOutlinedInput-notchedOutline": {
                border: variant === "text" ? "none" : undefined,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.primary.main,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.primary.main,
              },
              backgroundColor:
                variant === "contained"
                  ? theme.palette.primary.main
                  : undefined,
              color:
                variant === "contained"
                  ? theme.palette.primary.contrastText
                  : undefined,
            }}
          />
        }
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selected.map((value) => (
              <Chip
                key={value}
                label={value}
                sx={{
                  backgroundColor:
                    variant === "contained"
                      ? theme.palette.primary.light
                      : theme.palette.action.selected,
                  color: theme.palette.text.primary,
                }}
              />
            ))}
          </Box>
        )}
        MenuProps={{
          ...MenuProps,
          PaperProps: {
            ...MenuProps.PaperProps,
            style: {
              ...MenuProps.PaperProps.style,
              width: menuWidth,
            },
          },
        }}
      >
        <MenuItem value="__all">Select All</MenuItem>
        <MenuItem value="__none">Deselect All</MenuItem>
        <Divider />
        {options.map((option) => (
          <MenuItem
            key={option}
            value={option}
            style={getStyles(option, selectedValues, theme)}
          >
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default MultipleSelectChip;
