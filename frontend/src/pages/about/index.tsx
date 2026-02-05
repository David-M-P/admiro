import React from "react";
import { Container, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const AboutPage: React.FC<NonNullable<unknown>> = () => {
  const navigate = useNavigate(); // Hook to programmatically navigate

  return (
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh", // Ensure it takes up the full viewport height
        textAlign: "center",
      }}
      maxWidth="xl"
    >
      <Typography variant="h4" gutterBottom>
        Page under construction: working hard to get it done! (I promise :)
      </Typography>
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 4 }}
        onClick={() => navigate("/")} // Redirect to homepage
      >
        Take me home
      </Button>
    </Container>
  );
};
