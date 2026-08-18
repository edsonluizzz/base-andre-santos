"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/financeiro", label: "Visão geral" },
  { href: "/financeiro/lancamentos", label: "Lançamentos" },
  { href: "/financeiro/contratos", label: "Contratos" },
  { href: "/financeiro/fornecedores", label: "Fornecedores" },
  { href: "/financeiro/cabos-eleitorais", label: "Cabos Eleitorais (TSE)" },
];

export function FinanceNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 border-b border-white/[0.08] pb-3">
      {TABS.map((tab) => {
        const active = tab.href === "/financeiro" ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm border transition-colors",
              active
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-white/[0.08] text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
