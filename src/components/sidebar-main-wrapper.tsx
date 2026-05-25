"use client";

import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";

export function SidebarMainWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  return (
    <main
      className={cn(
        "flex-1 min-w-0 overflow-x-hidden transition-all duration-300",
        isCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}
    >
      <div className="pt-16 px-4 pb-24 lg:p-8 animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out fill-mode-both">
        {children}
      </div>
    </main>
  );
}
