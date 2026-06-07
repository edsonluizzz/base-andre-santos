import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Chave de deduplicação de telefone: últimos 8 dígitos (número sem DDD/país).
 * Gravada no campo indexado `Collaborator.phoneNormalized` para dedup O(log n)
 * em vez de `phone: { contains }` (full-scan). Retorna null se < 8 dígitos.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  return d.length >= 8 ? d.slice(-8) : null;
}

export function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const trimmed = city.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
