"use client";

import { createContext, useContext, useState, useEffect } from "react";

const KEY = "sidebar-collapsed";

const SidebarCtx = createContext<{ isCollapsed: boolean; toggle: () => void }>({
  isCollapsed: false,
  toggle: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(KEY) === "true");
  }, []);

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem(KEY, String(!v));
      return !v;
    });
  }

  return <SidebarCtx.Provider value={{ isCollapsed, toggle }}>{children}</SidebarCtx.Provider>;
}

export const useSidebar = () => useContext(SidebarCtx);
