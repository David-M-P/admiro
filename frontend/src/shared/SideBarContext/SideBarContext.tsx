import { ReactNode, createContext, useContext, useEffect, useState } from "react";

interface SidebarContextType {
  isSidebarVisible: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsSidebarVisible(true);
      }
    };

    if (mediaQuery.matches) {
      setIsSidebarVisible(true);
    }

    mediaQuery.addEventListener("change", handleViewportChange);
    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarVisible((prev) => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isSidebarVisible, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};
