import { AppShell } from "@/layout/AppShell";
import { SidebarProvider } from "@/shared/SideBarContext/SideBarContext";
import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <SidebarProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </SidebarProvider>
  );
}
