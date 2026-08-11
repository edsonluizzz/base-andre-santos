"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Plus, Pencil, Archive, ArchiveRestore, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FinanceGuard } from "@/components/financeiro/finance-guard";
import { FinanceNav } from "@/components/financeiro/finance-nav";

type Supplier = {
  id: string;
  name: string;
  document: string | null;
  category: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
};

const emptyForm = { name: "", document: "", category: "", contactName: "", phone: "", email: "", notes: "" };

function FornecedoresContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/financeiro/suppliers");
    if (res.ok) { const j = await res.json(); setSuppliers(j.data ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name, document: s.document ?? "", category: s.category ?? "",
      contactName: s.contactName ?? "", phone: s.phone ?? "", email: s.email ?? "", notes: s.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const res = editingId
      ? await fetch(`/api/financeiro/suppliers/${editingId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        })
      : await fetch("/api/financeiro/suppliers", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
    setSaving(false);
    if (res.ok) { toast.success("Fornecedor salvo"); setOpen(false); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao salvar"); }
  }

  async function toggleActive(s: Supplier) {
    const res = await fetch(`/api/financeiro/suppliers/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !s.active }),
    });
    if (res.ok) { toast.success(s.active ? "Fornecedor arquivado" : "Fornecedor reativado"); load(); }
    else toast.error("Erro ao atualizar");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-4">
      <div className="page-header">
        <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" /> Financeiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Fornecedores da campanha</p>
      </div>

      <FinanceNav />

      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Fornecedores</h2>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={openNew}>
            <Plus className="w-3.5 h-3.5" /> Novo fornecedor
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : suppliers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum fornecedor cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] px-3 py-2.5 ${!s.active ? "opacity-50" : ""}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.name}{!s.active && <span className="ml-2 text-[10px] text-muted-foreground">(arquivado)</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[s.category, s.document, s.phone].filter(Boolean).join(" — ") || "Sem detalhes"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => openEdit(s)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => toggleActive(s)} title={s.active ? "Arquivar" : "Reativar"}>
                    {s.active ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Casa dos Banners" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>CNPJ ou CPF</Label>
                <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="font-mono text-xs" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Material gráfico, mídia paga..." />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Contato</Label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

export default function FornecedoresPage() {
  return (
    <FinanceGuard>
      <FornecedoresContent />
    </FinanceGuard>
  );
}
