"use client";

import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export function SidebarMainWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed, setMobileOpen } = useSidebar();
  return (
    <>
      <main
        className={cn(
          "flex-1 min-w-0 transition-all duration-300",
          // overflow-x: clip contém overflow horizontal sem criar scroll
          // container vertical (que bloquearia o scroll do viewport)
          "[overflow-x:clip]",
          isCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        {/*
          Mobile: header offset (h-14 do hambúrguer) + bottom nav offset (h-14)
                  + safe-area inset bottom (pb-safe).
          Desktop: padding 8 generoso, sem bottom nav.
        */}
        <div className="pt-4 px-3 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] lg:pt-8 lg:px-8 lg:pb-8 page-transition">
          {children}
        </div>
      </main>
      <MobileBottomNav onOpenMenu={() => setMobileOpen(true)} />
    </>
  );
}
