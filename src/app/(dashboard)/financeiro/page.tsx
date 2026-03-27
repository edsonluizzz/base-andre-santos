"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Offering = {
  id: string;
  amount: number;
  method: "CASH" | "PIX";
  date: string;
  notes: string | null;
  member: { id: string; name: string };
  event: { id: string; title: string; type: string } | null;
};

type Member = { id: string; name: string };
type Event = { id: string; title: string; type: string };

const METHOD_LABELS = { CASH: "Dinheiro", PIX: "PIX" };

export default function FinanceiroPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(currentMonth);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [total, setTotal] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchOfferings = useCallback(async () => {
    const res = await fetch(`/api/offerings?month=${month}`);
    const data = await res.json();
    setOfferings(data.offerings);
    setTotal(data.total);
  }, [month]);

  useEffect(() => {
    fetchOfferings();
  }, [fetchOfferings]);

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then((d) =>
      setMembers(d.filter((m: any) => m.status === "ACTIVE"))
    );
    fetch("/api/events").then((r) => r.json()).then(setEvents);
  }, []);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/offerings?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Registro removido");
      fetchOfferings();
    } else {
      toast.error("Erro ao remover");
    }
  }

  // Per-member totals
  const perMember: Record<string, { name: string; total: number; count: number }> = {};
  for (const o of offerings) {
    if (!perMember[o.member.id]) {
      perMember[o.member.id] = { name: o.member.name, total: 0, count: 0 };
    }
    perMember[o.member.id].total += o.amount;
    perMember[o.member.id].count++;
  }
  const sorted = Object.values(perMember).sort((a, b) => b.total - a.total);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl lg:text-3xl font-bold text-[#e8c97a]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Financeiro
          </h1>
          <p className="text-[#888] text-sm mt-1">Controle de ofertas por participante</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#c9a84c] hover:bg-[#e8c97a] text-black font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar
        </Button>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-3 mb-6">
        <Label className="text-[#888] text-sm whitespace-nowrap">Mês:</Label>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-44 bg-[#1e1e1e] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-wider text-[#888] mb-2">Total do Mês</p>
          <p className="text-3xl font-bold text-[#c9a84c]" style={{ fontFamily: "var(--font-heading)" }}>
            R$ {total.toFixed(2).replace(".", ",")}
          </p>
        </div>
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-wider text-[#888] mb-2">Registros</p>
          <p className="text-3xl font-bold text-[#c9a84c]" style={{ fontFamily: "var(--font-heading)" }}>
            {offerings.length}
          </p>
        </div>
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-wider text-[#888] mb-2">Contribuintes</p>
          <p className="text-3xl font-bold text-[#c9a84c]" style={{ fontFamily: "var(--font-heading)" }}>
            {Object.keys(perMember).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-member ranking */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-4 h-4 text-[#c9a84c]" />
            <span className="text-[11px] tracking-[3px] uppercase text-[#c9a84c]">Por participante</span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
          </div>
          <div className="space-y-2">
            {sorted.length === 0 && (
              <p className="text-[#888] text-sm py-8 text-center">Nenhum registro neste mês</p>
            )}
            {sorted.map((m, i) => (
              <div key={m.name} className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 flex items-center gap-3">
                <span className="text-[#888] text-xs font-bold w-5 text-center">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#f0ece4]">{m.name}</p>
                  <p className="text-xs text-[#888]">{m.count} contribuição{m.count > 1 ? "ões" : ""}</p>
                </div>
                <p className="text-sm font-bold text-[#c9a84c]">
                  R$ {m.total.toFixed(2).replace(".", ",")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] tracking-[3px] uppercase text-[#c9a84c]">Lançamentos recentes</span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
          </div>
          <div className="space-y-2">
            {offerings.length === 0 && (
              <p className="text-[#888] text-sm py-8 text-center">Nenhum lançamento</p>
            )}
            {offerings.slice(0, 20).map((o) => (
              <div key={o.id} className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 flex items-center gap-3 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f0ece4] truncate">{o.member.name}</p>
                  <p className="text-xs text-[#888]">
                    {format(new Date(o.date), "dd/MM/yyyy")}
                    {o.event && ` · ${o.event.title}`}
                    {" · "}
                    <span className={o.method === "PIX" ? "text-[#c9a84c]" : "text-[#888]"}>
                      {METHOD_LABELS[o.method]}
                    </span>
                  </p>
                </div>
                <p className="text-sm font-bold text-[#2ecc71] flex-shrink-0">
                  R$ {o.amount.toFixed(2).replace(".", ",")}
                </p>
                <button
                  onClick={() => handleDelete(o.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-[#888] hover:text-[#e74c3c] hover:bg-[#e74c3c11] rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddOfferingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={members}
        events={events}
        onSuccess={() => { fetchOfferings(); setDialogOpen(false); }}
      />
    </div>
  );
}

function AddOfferingDialog({
  open,
  onOpenChange,
  members,
  events,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: Member[];
  events: Event[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    memberId: "",
    eventId: "",
    amount: "",
    method: "CASH",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.memberId || !form.amount) {
      toast.error("Participante e valor são obrigatórios");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, eventId: form.eventId || null }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Oferta registrada!");
      setForm({ memberId: "", eventId: "", amount: "", method: "CASH", notes: "", date: new Date().toISOString().slice(0, 10) });
      onSuccess();
    } else {
      toast.error("Erro ao registrar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-[#2a2a2a] text-[#f0ece4] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#e8c97a]" style={{ fontFamily: "var(--font-heading)" }}>
            Registrar Oferta
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[#888] text-xs">Participante *</Label>
            <Select value={form.memberId} onValueChange={(v: string | null) => v && set("memberId", v)}>
              <SelectTrigger className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4]">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e1e] border-[#2a2a2a] max-h-52">
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[#888] text-xs">Valor (R$) *</Label>
              <Input type="number" min="0.01" step="0.01" value={form.amount}
                onChange={(e) => set("amount", e.target.value)} placeholder="0,00"
                className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#888] text-xs">Método</Label>
              <Select value={form.method} onValueChange={(v: string | null) => v && set("method", v)}>
                <SelectTrigger className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e1e] border-[#2a2a2a]">
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[#888] text-xs">Data</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
                className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#888] text-xs">Evento (opcional)</Label>
              <Select value={form.eventId} onValueChange={(v: string | null) => set("eventId", v ?? "")}>
                <SelectTrigger className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4]">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e1e] border-[#2a2a2a] max-h-48">
                  <SelectItem value="">Nenhum</SelectItem>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-[#2a2a2a] text-[#888] hover:bg-[#2a2a2a]">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}
              className="flex-1 bg-[#c9a84c] hover:bg-[#e8c97a] text-black font-semibold">
              {loading ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
