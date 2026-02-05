import { createTheme, ThemeProvider } from "@mui/material/styles";


const theme = createTheme({
  palette: {
    primary: {
      main: "#003d73",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#555",
    },
    background: {
      default: "#222",
    },
    text: {
      primary: "#000000",
    },
  },
  typography: {
    fontFamily: "'InstitutionFont', sans-serif",
    h6: {
      fontSize: "1.5rem",
    },
  },
  components: {
    MuiChip: {
      styleOverrides: {
        root: {
          color: "#000000", // Ensures all Chip components use black text color
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          color: "#FFFFFF",
          fontWeight: "bold",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          minHeight: '32px',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: "#000000",
        },
      },
    },
  },
});
export default theme;