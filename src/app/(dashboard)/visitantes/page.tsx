"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserPlus, Phone, Mail, CalendarDays, Search, QrCode, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Visitor = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  event: { id: string; title: string; date: string } | null;
};

type PageData = {
  visitors: Visitor[];
  total: number;
  page: number;
  pages: number;
};


export default function VisitantesPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  const eid = session?.user?.establishmentId ?? "";
  const visitorUrl = typeof window !== "undefined"
    ? `${window.location.origin}/visita?e=${eid}`
    : `https://ovile.com.br/visita?e=${eid}`;

  useEffect(() => {
    fetch("/api/visitors")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = (data?.visitors ?? []).filter(
    (v) => !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.phone?.includes(search) || v.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Visitantes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `${data.total} registros` : "Carregando..."}
          </p>
        </div>
        <button
          onClick={() => setQrOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-all text-sm"
        >
          <QrCode className="w-4 h-4" />
          QR Code de Visita
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar visitante..."
          className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="glass-card divide-y divide-white/[0.05]">
          {[1,2,3,4].map(i => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {search ? "Nenhum visitante encontrado." : "Nenhum visitante registrado ainda. Compartilhe o QR Code!"}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="text-left px-5 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden sm:table-cell">Contato</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden md:table-cell">Evento</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const initials = v.name.split(" ").slice(0,2).map(n => n[0]).join("").toUpperCase();
                return (
                  <tr key={v.id} className={`border-b border-white/[0.04] last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <span className="font-medium text-foreground">{v.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {v.phone && (
                          <a
                            href={`https://wa.me/55${v.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            <Phone className="w-3 h-3" />
                            {v.phone}
                          </a>
                        )}
                        {v.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {v.email}
                          </div>
                        )}
                        {!v.phone && !v.email && <span className="text-xs text-muted-foreground/50">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {v.event ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="w-3 h-3" />
                          {v.event.title}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(v.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Modal */}
      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="glass-card p-6 w-full max-w-xs text-center space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-xs tracking-[3px] uppercase text-primary/70 mb-1">QR Code · Visitantes</p>
              <p className="text-sm text-muted-foreground">Exiba este QR para os visitantes se cadastrarem</p>
            </div>
            <div className="bg-white p-4 rounded-2xl inline-block">
              <QRCodeSVG value={visitorUrl} size={200} />
            </div>
            <p className="text-xs text-muted-foreground break-all">{visitorUrl}</p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => { navigator.clipboard.writeText(visitorUrl); toast.success("Link copiado!"); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar link
              </button>
              <button
                onClick={() => setQrOpen(false)}
                className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
