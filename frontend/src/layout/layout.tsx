import { NavBar } from "@/shared/NavBar/NavBar";
import { SidebarProvider } from "@/shared/SideBarContext/SideBarContext";
import React from "react";
import { Outlet } from "react-router-dom";

export const Layout: React.FC<NonNullable<unknown>> = () => {
  return (
    <SidebarProvider>
      <NavBar />
      <Outlet />
    </SidebarProvider>
  );
};
