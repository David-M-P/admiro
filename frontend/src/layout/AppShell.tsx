import { NavBar } from "@/shared/NavBar/NavBar";
import { AppShellProps } from "@/layout/types";

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <NavBar />
      <div className="app-shell__nav-spacer" aria-hidden />
      <main className="app-shell__content">{children}</main>
    </div>
  );
}
