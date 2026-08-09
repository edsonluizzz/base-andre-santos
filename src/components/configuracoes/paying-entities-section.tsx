"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Archive, ArchiveRestore, Landmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCnpj } from "@/lib/cnpj";

type PayingEntity = {
  id: string;
  name: string;
  candidateName: string | null;
  office: string | null;
  party: string | null;
  electionYear: number | null;
  cnpj: string | null;
  razaoSocial: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string | null;
  active: boolean;
};

const emptyForm = {
  name: "", candidateName: "", office: "", party: "", electionYear: "",
  cnpj: "", razaoSocial: "", logradouro: "", numero: "", complemento: "",
  bairro: "", cep: "", municipio: "", uf: "",
};

export function PayingEntitiesSection() {
  const [entities, setEntities] = useState<PayingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/paying-entities");
    if (res.ok) { const j = await res.json(); setEntities(j.data ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(e: PayingEntity) {
    setEditingId(e.id);
    setForm({
      name: e.name, candidateName: e.candidateName ?? "", office: e.office ?? "",
      party: e.party ?? "", electionYear: e.electionYear ? String(e.electionYear) : "",
      cnpj: e.cnpj ?? "", razaoSocial: e.razaoSocial ?? "", logradouro: e.logradouro ?? "",
      numero: e.numero ?? "", complemento: e.complemento ?? "", bairro: e.bairro ?? "",
      cep: e.cep ?? "", municipio: e.municipio ?? "", uf: e.uf ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const payload = {
      ...form,
      electionYear: form.electionYear ? Number(form.electionYear) : null,
    };
    const res = editingId
      ? await fetch(`/api/paying-entities/${editingId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        })
      : await fetch("/api/paying-entities", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
    setSaving(false);
    if (res.ok) { toast.success("Fonte pagadora salva"); setOpen(false); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao salvar"); }
  }

  async function toggleActive(e: PayingEntity) {
    const res = await fetch(`/api/paying-entities/${e.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !e.active }),
    });
    if (res.ok) { toast.success(e.active ? "Fonte arquivada" : "Fonte reativada"); load(); }
    else toast.error("Erro ao atualizar");
  }

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Fontes Pagadoras</h2>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={openNew}>
          <Plus className="w-3.5 h-3.5" /> Nova fonte
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Comitês financeiros de outros candidatos em chapa conjunta, usados para atribuir quem paga cada
        entrega e separar recibos/relatórios por CNPJ, conforme prestação de contas do TSE. A fonte padrão
        (candidato desta campanha) usa os dados de &quot;Dados Cadastrais (CNPJ)&quot; acima.
      </p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : entities.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma fonte pagadora adicional cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {entities.map((e) => (
            <div
              key={e.id}
              className={`flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] px-3 py-2.5 ${!e.active ? "opacity-50" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.name}{!e.active && <span className="ml-2 text-[10px] text-muted-foreground">(arquivada)</span>}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {e.cnpj ? formatCnpj(e.cnpj) : "CNPJ não informado"}
                  {e.razaoSocial ? ` — ${e.razaoSocial}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => openEdit(e)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => toggleActive(e)} title={e.active ? "Arquivar" : "Reativar"}>
                  {e.active ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar fonte pagadora" : "Nova fonte pagadora"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nome (rótulo interno)</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Indiara Barbosa Custódio" />
              </div>
              <div>
                <Label>Nome do candidato (no recibo)</Label>
                <Input value={form.candidateName} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Cargo</Label>
                <Input value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value })} placeholder="Deputado Federal" />
              </div>
              <div>
                <Label>Partido</Label>
                <Input value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} />
              </div>
              <div>
                <Label>Ano da eleição</Label>
                <Input value={form.electionYear} onChange={(e) => setForm({ ...form, electionYear: e.target.value.replace(/\D/g, "") })} placeholder="2026" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0001-00" className="font-mono text-xs" />
              </div>
              <div>
                <Label>Razão Social</Label>
                <Input value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3">
                <Label>Logradouro</Label>
                <Input value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} />
              </div>
              <div>
                <Label>Número</Label>
                <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Complemento</Label>
                <Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
              </div>
              <div>
                <Label>CEP</Label>
                <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} className="font-mono text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3">
                <Label>Município</Label>
                <Input value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} className="uppercase" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
