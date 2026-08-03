"use client";

import { useRouter } from "next/navigation";

export function CityFilterSelect({
  cities, value,
}: {
  cities: string[];
  value: string | null;
}) {
  const router = useRouter();

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const url = new URL(window.location.href);
        if (e.target.value) url.searchParams.set("cidade", e.target.value);
        else url.searchParams.delete("cidade");
        router.push(`${url.pathname}${url.search}`);
      }}
      className="text-xs px-2.5 py-1.5 rounded-full border bg-secondary border-white/[0.08] text-muted-foreground hover:border-white/[0.2] outline-none max-w-[180px]"
    >
      <option value="">Todas as cidades</option>
      {cities.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}
