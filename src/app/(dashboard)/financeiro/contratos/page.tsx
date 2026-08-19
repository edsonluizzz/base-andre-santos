"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Plus, Pencil, FileText, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceGuard } from "@/components/financeiro/finance-guard";
import { FinanceNav } from "@/components/financeiro/finance-nav";

type TemplateType = "PRESTACAO_SERVICOS_PJ" | "PRESTACAO_SERVICOS_PF" | "MILITANCIA" | "TERMO_DOACAO" | "TERMO_CESSAO";
type ContractStatusType = "GERADO" | "ASSINADO" | "CANCELADO";

type Contract = {
  id: string;
  code: string;
  templateType: TemplateType;
  status: ContractStatusType;
  counterpartyName: string;
  counterpartyDocument: string;
  totalValue: number | null;
  signatureDate: string;
  pdfUrl: string | null;
  supplier: { id: string; name: string } | null;
  payingEntity: { id: string; name: string } | null;
};

type Supplier = { id: string; name: string; active: boolean };
type PayingEntity = { id: string; name: string; active: boolean };

const TEMPLATE_LABEL: Record<TemplateType, string> = {
  PRESTACAO_SERVICOS_PJ: "Prestação de Serviços (PJ)",
  PRESTACAO_SERVICOS_PF: "Prestação de Serviços (PF)",
  MILITANCIA: "Militância (Cabo Eleitoral)",
  TERMO_DOACAO: "Termo de Doação Estimável",
  TERMO_CESSAO: "Termo de Cessão Estimável",
};

const STATUS_LABEL: Record<ContractStatusType, string> = { GERADO: "Gerado", ASSINADO: "Assinado", CANCELADO: "Cancelado" };
const STATUS_STYLE: Record<ContractStatusType, string> = {
  GERADO: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ASSINADO: "bg-green-500/15 text-green-400 border-green-500/30",
  CANCELADO: "bg-red-500/15 text-red-400 border-red-500/30",
};

const IS_PJ: Record<TemplateType, boolean> = {
  PRESTACAO_SERVICOS_PJ: true,
  PRESTACAO_SERVICOS_PF: false,
  MILITANCIA: false,
  TERMO_DOACAO: false,
  TERMO_CESSAO: false,
};

const DOCUMENT_LABEL: Record<TemplateType, string> = {
  PRESTACAO_SERVICOS_PJ: "CNPJ do Contratado",
  PRESTACAO_SERVICOS_PF: "CPF do Contratado",
  MILITANCIA: "CPF do Contratado",
  TERMO_DOACAO: "CPF do Doador(a)",
  TERMO_CESSAO: "CPF do Cedente",
};

const COUNTERPARTY_LABEL: Record<TemplateType, string> = {
  PRESTACAO_SERVICOS_PJ: "Razão social do Contratado",
  PRESTACAO_SERVICOS_PF: "Nome do Contratado",
  MILITANCIA: "Nome do Contratado (Cabo Eleitoral)",
  TERMO_DOACAO: "Nome do Doador(a)",
  TERMO_CESSAO: "Nome do Cedente",
};

const EVENT_ADDRESS_LABEL: Record<TemplateType, string | null> = {
  PRESTACAO_SERVICOS_PJ: "Local do serviço/evento",
  PRESTACAO_SERVICOS_PF: "Cidade onde os serviços serão prestados",
  MILITANCIA: "Local(is)/horário(s) de prestação",
  TERMO_DOACAO: null,
  TERMO_CESSAO: null,
};

const SHOW_DATES: Record<TemplateType, "range" | "start" | "none"> = {
  PRESTACAO_SERVICOS_PJ: "range",
  PRESTACAO_SERVICOS_PF: "range",
  MILITANCIA: "range",
  TERMO_DOACAO: "none",
  TERMO_CESSAO: "start",
};

const SHOW_PRICE_JUSTIFICATION: Record<TemplateType, boolean> = {
  PRESTACAO_SERVICOS_PJ: true,
  PRESTACAO_SERVICOS_PF: true,
  MILITANCIA: true,
  TERMO_DOACAO: false,
  TERMO_CESSAO: false,
};

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const emptyForm = {
  templateType: "PRESTACAO_SERVICOS_PJ" as TemplateType,
  counterpartyName: "",
  counterpartyDocument: "",
  counterpartyAddress: "",
  counterpartyCity: "",
  counterpartyUf: "",
  counterpartyPhone: "",
  counterpartyEmail: "",
  representativeName: "",
  representativeCpf: "",
  representativeAddress: "",
  objectDescription: "",
  eventAddress: "",
  startDate: "",
  endDate: "",
  totalValue: "",
  priceJustification: "",
  paymentTerms: "",
  forumCity: "",
  forumUf: "",
  supplierId: "",
  payingEntityId: "",
  notes: "",
};

function ContratosContent() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payingEntities, setPayingEntities] = useState<PayingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/financeiro/contratos");
    if (res.ok) { const j = await res.json(); setContracts(j.data ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/financeiro/suppliers").then((r) => r.json()).then((j) => setSuppliers(j.data ?? [])).catch(() => {});
    fetch("/api/paying-entities").then((r) => r.json()).then((j) => setPayingEntities(j.data ?? [])).catch(() => {});
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Contract) {
    setEditingId(c.id);
    setForm({
      ...emptyForm,
      templateType: c.templateType,
      counterpartyName: c.counterpartyName,
      counterpartyDocument: c.counterpartyDocument,
      totalValue: c.totalValue != null ? String(c.totalValue) : "",
      supplierId: c.supplier?.id ?? "",
      payingEntityId: c.payingEntity?.id ?? "",
    });
    setOpen(true);
  }

  async function lookupCnpj() {
    if (!form.counterpartyDocument.trim()) { toast.error("Informe o CNPJ"); return; }
    setLookingUp(true);
    const res = await fetch(`/api/financeiro/contratos/lookup-cnpj?cnpj=${encodeURIComponent(form.counterpartyDocument)}`);
    setLookingUp(false);
    if (res.ok) {
      const j = await res.json();
      setForm((f) => ({
        ...f,
        counterpartyName: j.razaoSocial || f.counterpartyName,
        counterpartyDocument: j.document || f.counterpartyDocument,
        counterpartyAddress: j.address || f.counterpartyAddress,
        counterpartyCity: j.municipio || f.counterpartyCity,
        counterpartyUf: j.uf || f.counterpartyUf,
        counterpartyPhone: j.phone || f.counterpartyPhone,
        counterpartyEmail: j.email || f.counterpartyEmail,
      }));
      toast.success("Dados do CNPJ preenchidos");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "CNPJ não encontrado");
    }
  }

  async function save() {
    if (!form.counterpartyName.trim()) { toast.error(`${COUNTERPARTY_LABEL[form.templateType]} é obrigatório`); return; }
    if (!form.counterpartyDocument.trim()) { toast.error(`${DOCUMENT_LABEL[form.templateType]} é obrigatório`); return; }
    if (!form.objectDescription.trim()) { toast.error("Objeto é obrigatório"); return; }

    setSaving(true);
    const payload = {
      templateType: form.templateType,
      counterpartyName: form.counterpartyName,
      counterpartyDocument: form.counterpartyDocument,
      counterpartyAddress: form.counterpartyAddress || undefined,
      counterpartyCity: form.counterpartyCity || undefined,
      counterpartyUf: form.counterpartyUf || undefined,
      counterpartyPhone: form.counterpartyPhone || undefined,
      counterpartyEmail: form.counterpartyEmail || undefined,
      representativeName: IS_PJ[form.templateType] ? (form.representativeName || undefined) : undefined,
      representativeCpf: IS_PJ[form.templateType] ? (form.representativeCpf || undefined) : undefined,
      representativeAddress: IS_PJ[form.templateType] ? (form.representativeAddress || undefined) : undefined,
      objectDescription: form.objectDescription,
      eventAddress: form.eventAddress || undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      totalValue: form.totalValue ? Number(form.totalValue.replace(",", ".")) : undefined,
      priceJustification: form.priceJustification || undefined,
      paymentTerms: form.paymentTerms || undefined,
      forumCity: form.forumCity || undefined,
      forumUf: form.forumUf || undefined,
      supplierId: form.supplierId || undefined,
      payingEntityId: form.payingEntityId || null,
      notes: form.notes || undefined,
    };

    const res = editingId
      ? await fetch(`/api/financeiro/contratos/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/financeiro/contratos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      const j = await res.json();
      toast.success(editingId ? "Contrato atualizado" : `Contrato ${j.code} gerado`);
      setOpen(false);
      load();
      if (j.pdfUrl) window.open(j.pdfUrl, "_blank");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao salvar contrato");
    }
  }

  const showDates = SHOW_DATES[form.templateType];
  const eventAddressLabel = EVENT_ADDRESS_LABEL[form.templateType];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-4">
      <div className="page-header">
        <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" /> Financeiro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Contratos e termos da campanha</p>
      </div>

      <FinanceNav />

      <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Contratos</h2>
          </div>
          <Button size="sm" onClick={openNew} className="gap-1.5 bg-primary text-primary-foreground">
            <Plus className="w-3.5 h-3.5" /> Novo contrato
          </Button>
        </div>

        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Código</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Modelo</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Contraparte</th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Status</th>
                <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Valor</th>
                <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum contrato gerado ainda.</td></tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{c.code}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{TEMPLATE_LABEL[c.templateType]}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm">{c.counterpartyName}</p>
                      <p className="text-[11px] text-muted-foreground">{c.counterpartyDocument}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmt(c.totalValue)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.pdfUrl && (
                          <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" title="Abrir/imprimir PDF">
                            <Button size="sm" variant="ghost"><ExternalLink className="w-3.5 h-3.5" /></Button>
                          </a>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar contrato" : "Novo contrato"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Modelo</Label>
              <Select
                value={form.templateType}
                onValueChange={(v) => setForm({ ...form, templateType: (v as TemplateType) ?? "PRESTACAO_SERVICOS_PJ" })}
                disabled={!!editingId}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TEMPLATE_LABEL) as TemplateType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TEMPLATE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <Label>{DOCUMENT_LABEL[form.templateType]}</Label>
                <Input value={form.counterpartyDocument} onChange={(e) => setForm({ ...form, counterpartyDocument: e.target.value })} className="font-mono text-xs" placeholder="00.000.000/0000-00" />
              </div>
              {IS_PJ[form.templateType] && (
                <Button type="button" variant="outline" size="sm" disabled={lookingUp} onClick={lookupCnpj} className="gap-1.5 text-xs">
                  <Search className="w-3.5 h-3.5" /> {lookingUp ? "Buscando..." : "Buscar"}
                </Button>
              )}
            </div>

            <div>
              <Label>{COUNTERPARTY_LABEL[form.templateType]}</Label>
              <Input value={form.counterpartyName} onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Endereço</Label>
                <Input value={form.counterpartyAddress} onChange={(e) => setForm({ ...form, counterpartyAddress: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Cidade</Label>
                  <Input value={form.counterpartyCity} onChange={(e) => setForm({ ...form, counterpartyCity: e.target.value })} />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input value={form.counterpartyUf} onChange={(e) => setForm({ ...form, counterpartyUf: e.target.value })} maxLength={2} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input value={form.counterpartyPhone} onChange={(e) => setForm({ ...form, counterpartyPhone: e.target.value })} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={form.counterpartyEmail} onChange={(e) => setForm({ ...form, counterpartyEmail: e.target.value })} />
              </div>
            </div>

            {IS_PJ[form.templateType] && (
              <div className="rounded-lg border border-white/[0.08] p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Representante / sócio</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome</Label>
                    <Input value={form.representativeName} onChange={(e) => setForm({ ...form, representativeName: e.target.value })} />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input value={form.representativeCpf} onChange={(e) => setForm({ ...form, representativeCpf: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <Label>Endereço do representante</Label>
                  <Input value={form.representativeAddress} onChange={(e) => setForm({ ...form, representativeAddress: e.target.value })} />
                </div>
              </div>
            )}

            <div>
              <Label>Objeto</Label>
              <Textarea value={form.objectDescription} onChange={(e) => setForm({ ...form, objectDescription: e.target.value })} rows={3} placeholder="Descrição detalhada do serviço/bem" />
            </div>

            {eventAddressLabel && (
              <div>
                <Label>{eventAddressLabel}</Label>
                <Input value={form.eventAddress} onChange={(e) => setForm({ ...form, eventAddress: e.target.value })} />
              </div>
            )}

            {showDates !== "none" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{showDates === "start" ? "Data de início de vigência" : "Data de início"}</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                {showDates === "range" && (
                  <div>
                    <Label>Data de término</Label>
                    <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor {form.templateType === "TERMO_DOACAO" || form.templateType === "TERMO_CESSAO" ? "estimado" : "do contrato"} (R$)</Label>
                <Input value={form.totalValue} onChange={(e) => setForm({ ...form, totalValue: e.target.value })} inputMode="decimal" placeholder="0,00" />
              </div>
              {SHOW_PRICE_JUSTIFICATION[form.templateType] && (
                <div>
                  <Label>Justificativa do preço</Label>
                  <Input value={form.priceJustification} onChange={(e) => setForm({ ...form, priceJustification: e.target.value })} placeholder="Ex: orçamento apresentado pelo prestador" />
                </div>
              )}
            </div>

            {SHOW_PRICE_JUSTIFICATION[form.templateType] && (
              <div>
                <Label>Condições de pagamento</Label>
                <Textarea
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  rows={2}
                  placeholder="Ex: que deverá ser integralmente adimplido até a data de 30/09/2026 — ou descreva um parcelamento (entrada + saldo)"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Foro — Cidade</Label>
                <Input value={form.forumCity} onChange={(e) => setForm({ ...form, forumCity: e.target.value })} placeholder="Padrão: cidade do comitê" />
              </div>
              <div>
                <Label>Foro — UF</Label>
                <Input value={form.forumUf} onChange={(e) => setForm({ ...form, forumUf: e.target.value })} maxLength={2} />
              </div>
            </div>

            <div>
              <Label>Fornecedor vinculado</Label>
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
              <Label>Notas internas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Gerando..." : editingId ? "Salvar e regerar PDF" : "Gerar contrato"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ContratosPage() {
  return (
    <FinanceGuard>
      <ContratosContent />
    </FinanceGuard>
  );
}
