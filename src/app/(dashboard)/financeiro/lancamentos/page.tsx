"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet, Plus, Pencil, Trash2, FileDown, FileText, Paperclip, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceGuard } from "@/components/financeiro/finance-guard";
import { FinanceNav } from "@/components/financeiro/finance-nav";

type EntryType = "DESPESA" | "RECEITA";
type EntryStatus = "PAGO" | "PENDENTE" | "AGENDADO";
type PaymentMethod = "PIX" | "DINHEIRO" | "TRANSFERENCIA" | "BOLETO" | "CARTAO" | "OUTRO";

type Entry = {
  id: string; type: EntryType; amount: number; description: string; category: string | null;
  date: string; paymentMethod: PaymentMethod | null; status: EntryStatus;
  supplierId: string | null; payingEntityId: string | null; contractId: string | null; receiptUrl: string | null; notes: string | null;
  supplier: { id: string; name: string } | null;
  payingEntity: { id: string; name: string } | null;
};
type Supplier = { id: string; name: string; active: boolean };
type PayingEntity = { id: string; name: string; active: boolean };
type ContractOption = { id: string; code: string; counterpartyName: string };

const STATUS_LABEL: Record<EntryStatus, string> = { PAGO: "Pago", PENDENTE: "Pendente", AGENDADO: "Agendado" };
const STATUS_STYLE: Record<EntryStatus, string> = {
  PAGO: "bg-green-500/15 text-green-400 border-green-500/30",
  PENDENTE: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  AGENDADO: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};
const METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "PIX", DINHEIRO: "Dinheiro", TRANSFERENCIA: "Transferência", BOLETO: "Boleto", CARTAO: "Cartão", OUTRO: "Outro",
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const emptyForm = {
  type: "DESPESA" as EntryType,
  amount: "", description: "", category: "",
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "" as PaymentMethod | "",
  status: "PENDENTE" as EntryStatus,
  supplierId: "", payingEntityId: "", contractId: "", receiptUrl: "", notes: "",
};

function LancamentosContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payingEntities, setPayingEntities] = useState<PayingEntity[]>([]);
  const [contractOptions, setContractOptions] = useState<ContractOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<string>(() => searchParams.get("type") ?? "");
  const [filterStatus, setFilterStatus] = useState<string>(() => searchParams.get("status") ?? "");
  const [filterEntity, setFilterEntity] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterStatus) params.set("status", filterStatus);
    if (filterEntity) params.set("payingEntityId", filterEntity);
    const res = await fetch(`/api/financeiro/entries?${params.toString()}`);
    if (res.ok) { const j = await res.json(); setEntries(j.data ?? []); }
    setLoading(false);
  }, [filterType, filterStatus, filterEntity]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/financeiro/suppliers").then((r) => r.json()).then((j) => setSuppliers(j.data ?? [])).catch(() => {});
    fetch("/api/paying-entities").then((r) => r.json()).then((j) => setPayingEntities(j.data ?? [])).catch(() => {});
    fetch("/api/financeiro/contratos").then((r) => r.json()).then((j) => setContractOptions(j.data ?? [])).catch(() => {});
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(e: Entry) {
    setEditingId(e.id);
    setForm({
      type: e.type, amount: String(e.amount), description: e.description, category: e.category ?? "",
      date: e.date.slice(0, 10), paymentMethod: e.paymentMethod ?? "", status: e.status,
      supplierId: e.supplierId ?? "", payingEntityId: e.payingEntityId ?? "", contractId: e.contractId ?? "",
      receiptUrl: e.receiptUrl ?? "", notes: e.notes ?? "",
    });
    setOpen(true);
  }

  async function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/financeiro/entries/upload-receipt", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) { const j = await res.json(); setForm((f) => ({ ...f, receiptUrl: j.url })); toast.success("Comprovante enviado"); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro no upload"); }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    const amount = Number(form.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Valor inválido"); return; }
    if (!form.description.trim()) { toast.error("Descrição é obrigatória"); return; }
    setSaving(true);
    const payload = {
      type: form.type,
      amount,
      description: form.description,
      category: form.category || undefined,
      date: new Date(form.date).toISOString(),
      paymentMethod: form.paymentMethod || undefined,
      status: form.status,
      supplierId: form.supplierId || undefined,
      payingEntityId: form.payingEntityId || null,
      contractId: form.contractId || null,
      receiptUrl: form.receiptUrl || undefined,
      notes: form.notes || undefined,
    };
    const res = editingId
      ? await fetch(`/api/financeiro/entries/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/financeiro/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { toast.success("Lançamento salvo"); setOpen(false); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao salvar"); }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/financeiro/entries/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Lançamento excluído"); load(); }
    else toast.error("Erro ao excluir");
  }

  const exportParams = new URLSearchParams();
  if (filterType) exportParams.set("type", filterType);
  if (filterStatus) exportParams.set("status", filterStatus);
  if (filterEntity) exportParams.set("payingEntityId", filterEntity);
  const exportUrl = `/api/financeiro/entries/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;
  const exportPdfUrl = `/api/financeiro/entries/export-pdf${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-4">
      <div className="flex items-end justify-between gap-3">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Lançamentos de despesas e receitas</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a href={exportUrl} download>
            <Button size="sm" variant="outline" className="gap-1.5"><FileDown className="w-3.5 h-3.5" /> XLSX</Button>
          </a>
          <a href={exportPdfUrl} download>
            <Button size="sm" variant="outline" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> PDF</Button>
          </a>
          <Button size="sm" onClick={openNew} className="gap-1.5 bg-primary text-primary-foreground">
            <Plus className="w-3.5 h-3.5" /> Novo lançamento
          </Button>
        </div>
      </div>

      <FinanceNav />

      <div className="flex flex-wrap gap-3">
        <Select value={filterType || "ALL"} onValueChange={(v) => setFilterType(v === "ALL" ? "" : v ?? "")}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="DESPESA">Despesa</SelectItem>
            <SelectItem value="RECEITA">Receita</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus || "ALL"} onValueChange={(v) => setFilterStatus(v === "ALL" ? "" : v ?? "")}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="PAGO">Pago</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="AGENDADO">Agendado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEntity || "ALL"} onValueChange={(v) => setFilterEntity(v === "ALL" ? "" : v ?? "")}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Fonte pagadora" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as fontes</SelectItem>
            <SelectItem value="DEFAULT">Padrão (candidato da campanha)</SelectItem>
            {payingEntities.filter((e) => e.active).map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Data</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Descrição</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Fonte</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Status</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Valor</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum lançamento ainda.</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-foreground">
                    <div className="flex items-center gap-2">
                      <span>{e.description}</span>
                      {e.receiptUrl && (
                        <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Ver comprovante">
                          <Paperclip className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {e.supplier && <p className="text-[11px] text-muted-foreground">{e.supplier.name}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.payingEntity?.name ?? "Padrão"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium ${e.type === "RECEITA" ? "text-green-400" : "text-foreground"}`}>
                    {e.type === "RECEITA" ? "+" : "-"}{fmt(e.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(e.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar lançamento" : "Novo lançamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: (v as EntryType) ?? "DESPESA" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESPESA">Despesa</SelectItem>
                    <SelectItem value="RECEITA">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} inputMode="decimal" placeholder="0,00" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Impressão de santinhos" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Material gráfico..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: (v as EntryStatus) ?? "PENDENTE" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAGO">Pago</SelectItem>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="AGENDADO">Agendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={form.paymentMethod || "NONE"} onValueChange={(v) => setForm({ ...form, paymentMethod: v === "NONE" ? "" : (v as PaymentMethod) })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">—</SelectItem>
                    {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={form.supplierId || "NONE"} onValueChange={(v) => setForm({ ...form, supplierId: v === "NONE" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhum</SelectItem>
                  {suppliers.filter((s) => s.active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contrato vinculado</Label>
              <Select value={form.contractId || "NONE"} onValueChange={(v) => setForm({ ...form, contractId: v === "NONE" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhum</SelectItem>
                  {contractOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.counterpartyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fonte pagadora</Label>
              <Select value={form.payingEntityId || "NONE"} onValueChange={(v) => setForm({ ...form, payingEntityId: v === "NONE" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="Padrão (candidato da campanha)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Padrão (candidato da campanha)</SelectItem>
                  {payingEntities.filter((e) => e.active).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comprovante</Label>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
                  <Paperclip className="w-3.5 h-3.5" /> {uploading ? "Enviando..." : form.receiptUrl ? "Trocar arquivo" : "Anexar arquivo"}
                </Button>
                {form.receiptUrl && (
                  <a href={form.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                    Ver <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
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

export default function LancamentosPage() {
  return (
    <FinanceGuard>
      <Suspense fallback={null}>
        <LancamentosContent />
      </Suspense>
    </FinanceGuard>
  );
}
