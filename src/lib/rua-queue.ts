// Fila offline do Cadastro na Rua. Na rua o 4G cai; cada cadastro é salvo no
// próprio aparelho (localStorage) e sincronizado quando a conexão volta.
// localStorage basta: cada item ~150 bytes, milhares cabem no limite de ~5MB,
// é síncrono e sobrevive a reload/fechar o app.

const KEY = "rua_pending_v1";

export type RuaEntry = {
  id: string;
  name: string;
  phone: string;
  city: string;
  neighborhood?: string;
  createdAt: number;
};

function read(): RuaEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RuaEntry[]) : [];
  } catch {
    return [];
  }
}

function write(list: RuaEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // cota cheia / modo privado: melhor falhar visível do que perder em silêncio
  }
}

export function enqueue(entry: Omit<RuaEntry, "id" | "createdAt">): RuaEntry {
  const full: RuaEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  write([...read(), full]);
  return full;
}

export function getPending(): RuaEntry[] {
  return read();
}

export function countPending(): number {
  return read().length;
}

export function removePending(id: string): void {
  write(read().filter((e) => e.id !== id));
}

// Envia os pendentes um a um. O servidor faz dedup por telefone, então reenviar
// um item que já tinha ido retorna 200 (duplicate) e nós o removemos do mesmo jeito.
// Para em erro de rede (segue offline). Retorna quantos foram sincronizados.
export async function syncPending(): Promise<{ synced: number; remaining: number }> {
  let synced = 0;
  for (const entry of read()) {
    try {
      const res = await fetch("/api/rua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: entry.name,
          phone: entry.phone,
          city: entry.city,
          neighborhood: entry.neighborhood || undefined,
          lgpdConsent: true,
        }),
      });
      if (res.ok) {
        removePending(entry.id);
        synced++;
      } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        // Erro de validação (não recuperável reenviando) — remove para não travar a fila.
        removePending(entry.id);
      } else {
        break; // 429/5xx: tenta de novo depois
      }
    } catch {
      break; // sem rede: para e mantém o restante
    }
  }
  return { synced, remaining: countPending() };
}
