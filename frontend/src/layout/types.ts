import { ReactNode } from "react";

export interface AppShellProps {
  children: ReactNode;
}

export interface PageWithSidebarProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showSidebar?: boolean;
  sidebarClassName?: string;
  contentClassName?: string;
}
