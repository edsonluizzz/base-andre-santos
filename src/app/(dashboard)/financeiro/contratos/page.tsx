"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Plus, Pencil, FileText, Search, ExternalLink, CircleDollarSign, Send, Trash2 } from "lucide-react";
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
type PaymentMethod = "PIX" | "DINHEIRO" | "TRANSFERENCIA" | "BOLETO" | "CARTAO" | "OUTRO";
type EntryStatus = "PAGO" | "PENDENTE" | "AGENDADO";

type Contract = {
  id: string;
  code: string;
  templateType: TemplateType;
  status: ContractStatusType;
  counterpartyName: string;
  counterpartyDocument: string;
  counterpartyAddress: string | null;
  counterpartyCity: string | null;
  counterpartyUf: string | null;
  counterpartyEmail: string | null;
  counterpartyPhone: string | null;
  representativeName: string | null;
  representativeCpf: string | null;
  representativeAddress: string | null;
  objectDescription: string;
  eventAddress: string | null;
  startDate: string | null;
  endDate: string | null;
  totalValue: number | null;
  priceJustification: string | null;
  paymentTerms: string | null;
  additionalClauses: string | null;
  signatureDate: string;
  forumCity: string | null;
  forumUf: string | null;
  notes: string | null;
  pdfUrl: string | null;
  supplier: { id: string; name: string } | null;
  payingEntity: { id: string; name: string } | null;
  paidAmount: number;
  pendingAmount: number;
  paymentCount: number;
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "PIX", DINHEIRO: "Dinheiro", TRANSFERENCIA: "Transferência", BOLETO: "Boleto", CARTAO: "Cartão", OUTRO: "Outro",
};

const emptyPaymentForm = {
  amount: "", paymentMethod: "PIX" as PaymentMethod, status: "PAGO" as EntryStatus,
  date: new Date().toISOString().slice(0, 10), label: "",
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
  additionalClauses: "",
  forumCity: "",
  forumUf: "",
  supplierId: "",
  payingEntityId: "",
  notes: "",
  status: "GERADO" as ContractStatusType,
};

function ContratosContent() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payingEntities, setPayingEntities] = useState<PayingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [wizardStage, setWizardStage] = useState<"root" | "servico" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const [registerPayment, setRegisterPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  const [paymentDialogContract, setPaymentDialogContract] = useState<Contract | null>(null);
  const [extraPaymentForm, setExtraPaymentForm] = useState(emptyPaymentForm);
  const [savingPayment, setSavingPayment] = useState(false);

  const [sendDialogContract, setSendDialogContract] = useState<Contract | null>(null);
  const [sendChannel, setSendChannel] = useState<"email" | "whatsapp">("whatsapp");
  const [sendTo, setSendTo] = useState("");
  const [sending, setSending] = useState(false);

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
    setRegisterPayment(false);
    setPaymentForm(emptyPaymentForm);
    setWizardStage("root");
  }

  function pickTemplate(t: TemplateType) {
    setForm((f) => ({ ...f, templateType: t }));
    setWizardStage(null);
    setOpen(true);
  }

  function skipWizard() {
    setWizardStage(null);
    setOpen(true);
  }

  function openEdit(c: Contract) {
    setEditingId(c.id);
    setForm({
      templateType: c.templateType,
      counterpartyName: c.counterpartyName,
      counterpartyDocument: c.counterpartyDocument,
      counterpartyAddress: c.counterpartyAddress ?? "",
      counterpartyCity: c.counterpartyCity ?? "",
      counterpartyUf: c.counterpartyUf ?? "",
      counterpartyPhone: c.counterpartyPhone ?? "",
      counterpartyEmail: c.counterpartyEmail ?? "",
      representativeName: c.representativeName ?? "",
      representativeCpf: c.representativeCpf ?? "",
      representativeAddress: c.representativeAddress ?? "",
      objectDescription: c.objectDescription,
      eventAddress: c.eventAddress ?? "",
      startDate: c.startDate ? c.startDate.slice(0, 10) : "",
      endDate: c.endDate ? c.endDate.slice(0, 10) : "",
      totalValue: c.totalValue != null ? String(c.totalValue) : "",
      priceJustification: c.priceJustification ?? "",
      paymentTerms: c.paymentTerms ?? "",
      additionalClauses: c.additionalClauses ?? "",
      forumCity: c.forumCity ?? "",
      forumUf: c.forumUf ?? "",
      supplierId: c.supplier?.id ?? "",
      payingEntityId: c.payingEntity?.id ?? "",
      notes: c.notes ?? "",
      status: c.status,
    });
    setOpen(true);
  }

  async function remove(c: Contract) {
    if (!window.confirm(`Excluir o contrato ${c.code} (${c.counterpartyName})? Essa ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/financeiro/contratos/${c.id}`, { method: "DELETE" });
    if (res.ok) { toast.success(`Contrato ${c.code} excluído`); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao excluir contrato"); }
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
      additionalClauses: form.additionalClauses || undefined,
      forumCity: form.forumCity || undefined,
      forumUf: form.forumUf || undefined,
      supplierId: form.supplierId || undefined,
      payingEntityId: form.payingEntityId || null,
      notes: form.notes || undefined,
      status: editingId ? form.status : undefined,
      payment: (!editingId && registerPayment && paymentForm.amount)
        ? {
            amount: Number(paymentForm.amount.replace(",", ".")),
            paymentMethod: paymentForm.paymentMethod,
            status: paymentForm.status,
            date: new Date(paymentForm.date).toISOString(),
            label: paymentForm.label || undefined,
          }
        : undefined,
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

  function openPaymentDialog(c: Contract) {
    setPaymentDialogContract(c);
    const remaining = c.totalValue != null ? Math.max(c.totalValue - c.paidAmount - c.pendingAmount, 0) : 0;
    setExtraPaymentForm({ ...emptyPaymentForm, amount: remaining ? String(remaining) : "" });
  }

  async function savePayment() {
    if (!paymentDialogContract) return;
    const amount = Number(extraPaymentForm.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Valor inválido"); return; }
    setSavingPayment(true);
    const res = await fetch(`/api/financeiro/contratos/${paymentDialogContract.id}/pagamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        paymentMethod: extraPaymentForm.paymentMethod,
        status: extraPaymentForm.status,
        date: new Date(extraPaymentForm.date).toISOString(),
        label: extraPaymentForm.label || undefined,
      }),
    });
    setSavingPayment(false);
    if (res.ok) {
      toast.success("Pagamento registrado");
      setPaymentDialogContract(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao registrar pagamento");
    }
  }

  function openSendDialog(c: Contract) {
    setSendDialogContract(c);
    const channel = c.counterpartyPhone ? "whatsapp" : "email";
    setSendChannel(channel);
    setSendTo((channel === "whatsapp" ? c.counterpartyPhone : c.counterpartyEmail) ?? "");
  }

  async function doSend() {
    if (!sendDialogContract) return;
    if (!sendTo.trim()) { toast.error(sendChannel === "email" ? "Informe o e-mail" : "Informe o telefone"); return; }
    setSending(true);
    const res = await fetch(`/api/financeiro/contratos/${sendDialogContract.id}/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: sendChannel, to: sendTo }),
    });
    setSending(false);
    if (res.ok) {
      toast.success(sendChannel === "email" ? "Contrato enviado por e-mail" : "Contrato enviado por WhatsApp");
      setSendDialogContract(null);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao enviar contrato");
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
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Pagamento</th>
                <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum contrato gerado ainda.</td></tr>
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
                    <td className="px-4 py-2.5">
                      {c.paymentCount === 0 ? (
                        <span className="text-[11px] text-muted-foreground">Sem pagamento</span>
                      ) : (
                        <div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            c.totalValue != null && c.paidAmount >= c.totalValue
                              ? "bg-green-500/15 text-green-400 border-green-500/30"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          }`}>
                            {fmt(c.paidAmount)}{c.totalValue != null ? ` / ${fmt(c.totalValue)}` : ""}
                          </span>
                          {c.pendingAmount > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">+{fmt(c.pendingAmount)} pendente</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.pdfUrl && (
                          <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" title="Abrir/imprimir PDF">
                            <Button size="sm" variant="ghost"><ExternalLink className="w-3.5 h-3.5" /></Button>
                          </a>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openPaymentDialog(c)} title="Registrar pagamento">
                          <CircleDollarSign className="w-3.5 h-3.5" />
                        </Button>
                        {c.pdfUrl && (
                          <Button size="sm" variant="ghost" onClick={() => openSendDialog(c)} title="Enviar para assinatura">
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(c)} title="Excluir contrato">
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
      </div>

      <Dialog open={wizardStage !== null} onOpenChange={(v) => !v && setWizardStage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo contrato</DialogTitle></DialogHeader>
          {wizardStage === "root" && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground mb-1">O que você precisa registrar?</p>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3 whitespace-normal" onClick={() => setWizardStage("servico")}>
                Vou pagar por um serviço prestado (produção, design, consultoria, etc.)
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3 whitespace-normal" onClick={() => pickTemplate("MILITANCIA")}>
                Vou pagar um cabo eleitoral (militância)
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3 whitespace-normal" onClick={() => pickTemplate("TERMO_DOACAO")}>
                Alguém vai doar um bem ou serviço pra campanha
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3 whitespace-normal" onClick={() => pickTemplate("TERMO_CESSAO")}>
                Vou usar um bem cedido temporariamente (carro de som, espaço, equipamento)
              </Button>
              <button type="button" onClick={skipWizard} className="text-xs text-muted-foreground hover:underline pt-1 block">
                Prefiro escolher o modelo manualmente
              </button>
            </div>
          )}
          {wizardStage === "servico" && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground mb-1">Quem vai prestar o serviço tem CNPJ ou é pessoa física?</p>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3 whitespace-normal" onClick={() => pickTemplate("PRESTACAO_SERVICOS_PJ")}>
                Empresa (CNPJ)
              </Button>
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3 whitespace-normal" onClick={() => pickTemplate("PRESTACAO_SERVICOS_PF")}>
                Pessoa física (CPF)
              </Button>
              <button type="button" onClick={() => setWizardStage("root")} className="text-xs text-muted-foreground hover:underline pt-1 block">
                ← Voltar
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar contrato" : "Novo contrato"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {editingId && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: (v as ContractStatusType) ?? "GERADO" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as ContractStatusType[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

            <div>
              <Label>Cláusulas adicionais (opcional)</Label>
              <Textarea
                value={form.additionalClauses}
                onChange={(e) => setForm({ ...form, additionalClauses: e.target.value })}
                rows={3}
                placeholder="Ex: direitos de uso do material entregue, política de revisões, produto final a ser entregue..."
              />
            </div>

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

            {!editingId && (
              <div className="rounded-lg border border-white/[0.08] p-3 space-y-3">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={registerPayment}
                    onChange={(e) => setRegisterPayment(e.target.checked)}
                  />
                  Já registrar um pagamento (entrada, à vista, etc.)
                </label>
                {registerPayment && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor pago (R$)</Label>
                        <Input value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} inputMode="decimal" placeholder="0,00" />
                      </div>
                      <div>
                        <Label>Data</Label>
                        <Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Forma de pagamento</Label>
                        <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: (v as PaymentMethod) ?? "PIX" })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                              <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={paymentForm.status} onValueChange={(v) => setPaymentForm({ ...paymentForm, status: (v as EntryStatus) ?? "PAGO" })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PAGO">Pago</SelectItem>
                            <SelectItem value="PENDENTE">Pendente</SelectItem>
                            <SelectItem value="AGENDADO">Agendado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Rótulo (opcional)</Label>
                      <Input value={paymentForm.label} onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })} placeholder="Ex: Entrada, Pagamento integral..." />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Gerando..." : editingId ? "Salvar e regerar PDF" : "Gerar contrato"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentDialogContract} onOpenChange={(v) => !v && setPaymentDialogContract(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pagamento — {paymentDialogContract?.code}</DialogTitle>
          </DialogHeader>
          {paymentDialogContract && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                {paymentDialogContract.counterpartyName} · Total do contrato: {fmt(paymentDialogContract.totalValue)}
                {paymentDialogContract.paymentCount > 0 && (
                  <> · Já pago: {fmt(paymentDialogContract.paidAmount)}</>
                )}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input value={extraPaymentForm.amount} onChange={(e) => setExtraPaymentForm({ ...extraPaymentForm, amount: e.target.value })} inputMode="decimal" placeholder="0,00" />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={extraPaymentForm.date} onChange={(e) => setExtraPaymentForm({ ...extraPaymentForm, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forma de pagamento</Label>
                  <Select value={extraPaymentForm.paymentMethod} onValueChange={(v) => setExtraPaymentForm({ ...extraPaymentForm, paymentMethod: (v as PaymentMethod) ?? "PIX" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                        <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={extraPaymentForm.status} onValueChange={(v) => setExtraPaymentForm({ ...extraPaymentForm, status: (v as EntryStatus) ?? "PAGO" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAGO">Pago</SelectItem>
                      <SelectItem value="PENDENTE">Pendente</SelectItem>
                      <SelectItem value="AGENDADO">Agendado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Rótulo (opcional)</Label>
                <Input value={extraPaymentForm.label} onChange={(e) => setExtraPaymentForm({ ...extraPaymentForm, label: e.target.value })} placeholder="Ex: Entrada, Saldo, Pagamento integral..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPaymentDialogContract(null)}>Cancelar</Button>
                <Button onClick={savePayment} disabled={savingPayment} className="bg-primary text-primary-foreground">
                  {savingPayment ? "Salvando..." : "Registrar pagamento"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!sendDialogContract} onOpenChange={(v) => !v && setSendDialogContract(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar contrato — {sendDialogContract?.code}</DialogTitle>
          </DialogHeader>
          {sendDialogContract && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Envia o PDF do contrato para {sendDialogContract.counterpartyName} assinar via
                assinador.iti.gov.br (conta gov.br) e devolver assinado.
              </p>
              <div>
                <Label>Canal</Label>
                <Select
                  value={sendChannel}
                  onValueChange={(v) => {
                    const channel = (v as "email" | "whatsapp") ?? "whatsapp";
                    setSendChannel(channel);
                    setSendTo((channel === "whatsapp" ? sendDialogContract.counterpartyPhone : sendDialogContract.counterpartyEmail) ?? "");
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{sendChannel === "email" ? "E-mail" : "Telefone (com DDD)"}</Label>
                <Input value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder={sendChannel === "email" ? "nome@exemplo.com" : "41999999999"} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSendDialogContract(null)}>Cancelar</Button>
                <Button onClick={doSend} disabled={sending} className="bg-primary text-primary-foreground gap-1.5">
                  {sending ? "Enviando..." : <><Send className="w-3.5 h-3.5" /> Enviar</>}
                </Button>
              </div>
            </div>
          )}
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
