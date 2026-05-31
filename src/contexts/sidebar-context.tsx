"use client";

import { createContext, useContext, useState, useEffect } from "react";

const KEY = "sidebar-collapsed";

interface SidebarState {
  isCollapsed: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarCtx = createContext<SidebarState>({
  isCollapsed: false,
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(KEY) === "true");
  }, []);

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem(KEY, String(!v));
      return !v;
    });
  }

  return (
    <SidebarCtx.Provider value={{ isCollapsed, toggle, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarCtx.Provider>
  );
}

export const useSidebar = () => useContext(SidebarCtx);
