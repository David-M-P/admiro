import React from "react";
import { Container, Button } from "@mui/material";

export const PlotIndex: React.FC<NonNullable<unknown>> = () => {
  return (
    <Container sx={{ mt: 9 }} maxWidth="xl">
      <Button fullWidth variant="contained">
        About
      </Button>
    </Container>
  );
};
