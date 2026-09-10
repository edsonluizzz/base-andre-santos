"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { formatCpf, normalizeCpf, isValidCpf } from "@/lib/cpf";
import { MATERIAL_CATALOG } from "@/lib/material-catalog";

type ChurchOption = { id: string; name: string; regional: string | null; memberCount: number | null };
type Kind = "individual" | "church";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
};

const EMPTY = {
  name: "", cpf: "", phone: "", email: "",
  cep: "", logradouro: "", numero: "", complemento: "", neighborhood: "", city: "", uf: "",
};

export function NewMaterialRequestDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [kind, setKind] = useState<Kind>("individual");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [churchId, setChurchId] = useState("");
  const [consent, setConsent] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setKind("individual");
    setQty({});
    setChurchId("");
    setConsent(false);
    setError("");
    setCepError("");
  }, [open]);

  useEffect(() => {
    if (!open || churches.length > 0) return;
    fetch("/api/churches")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (Array.isArray(d?.data)) setChurches(d.data); })
      .catch(() => {});
  }, [open, churches.length]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function formatPhone(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function formatCep(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  async function lookupCep(rawCep: string) {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    setCepError("");
    try {
      const res = await fetch(`/api/cep/${digits}`);
      if (!res.ok) { setCepError("CEP não encontrado"); return; }
      const d = await res.json();
      if (d.city) set("city", d.city);
      if (d.neighborhood) set("neighborhood", d.neighborhood);
      if (d.street) set("logradouro", d.street);
      if (d.state) set("uf", d.state);
    } catch {
      setCepError("Erro ao consultar CEP");
    } finally {
      setCepLoading(false);
    }
  }

  function toggleItem(id: string) {
    setQty((q) => {
      const next = { ...q };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  const selectedItems = Object.entries(qty).map(([item, q]) => ({ item, qty: q }));
  const selectedChurch = churches.find((c) => c.id === churchId) ?? null;

  const churchGroups = churches.reduce<Record<string, ChurchOption[]>>((acc, c) => {
    const key = c.regional ?? "Outras";
    (acc[key] ??= []).push(c);
    return acc;
  }, {});

  function validate(): string | null {
    if (!form.name.trim() || form.name.trim().length < 2) return "Informe o nome completo";
    if (!isValidCpf(form.cpf)) return "Informe um CPF válido";
    if (form.phone.replace(/\D/g, "").length < 10) return "Informe um WhatsApp válido";
    if (form.cep.replace(/\D/g, "").length !== 8) return "Informe um CEP válido";
    if (!form.logradouro.trim()) return "Informe a rua/logradouro";
    if (!form.numero.trim()) return "Informe o número";
    if (!form.neighborhood.trim()) return "Informe o bairro";
    if (!form.city.trim()) return "Informe a cidade";
    if (form.uf.trim().length !== 2) return "Informe a UF";
    if (kind === "church" && !churchId) return "Selecione a congregação";
    if (kind === "individual" && selectedItems.length === 0) return "Selecione ao menos um material";
    if (!consent) return "Confirme que obteve o consentimento da pessoa";
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/materiais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cpf: normalizeCpf(form.cpf),
          items: kind === "individual" ? selectedItems : [],
          ...(kind === "church" ? { churchId } : {}),
          consentConfirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar"); setSaving(false); return; }
      onSuccess();
      onOpenChange(false);
    } catch {
      setError("Erro de conexão");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo pedido de material</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground bg-white/[0.03] rounded-lg px-3 py-2">
            Use pra registrar um pedido recebido por telefone, WhatsApp ou presencialmente.
            O Termo de Apoiador é gerado normalmente com os dados abaixo.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome completo *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>CPF *</Label>
              <Input
                value={form.cpf}
                onChange={(e) => set("cpf", formatCpf(e.target.value.replace(/\D/g, "").slice(0, 11)))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
              />
            </div>
            <div>
              <Label>WhatsApp *</Label>
              <Input value={form.phone} onChange={(e) => set("phone", formatPhone(e.target.value))} placeholder="(41) 99999-9999" inputMode="numeric" />
            </div>
            <div className="col-span-2">
              <Label>E-mail <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" placeholder="email@dominio.com" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>CEP *</Label>
              <Input
                value={form.cep}
                onChange={(e) => {
                  const v = formatCep(e.target.value);
                  set("cep", v);
                  if (v.replace(/\D/g, "").length === 8) lookupCep(v);
                }}
                placeholder="00000-000"
                inputMode="numeric"
                maxLength={9}
              />
              {cepLoading && <p className="text-[11px] text-muted-foreground mt-1">Buscando...</p>}
              {cepError && <p className="text-[11px] text-destructive mt-1">{cepError}</p>}
            </div>
            <div className="col-span-2">
              <Label>Rua *</Label>
              <Input value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} placeholder="Nome da rua" />
            </div>
            <div>
              <Label>Número *</Label>
              <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="123" />
            </div>
            <div className="col-span-2">
              <Label>Complemento</Label>
              <Input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Apto, bloco..." />
            </div>
            <div>
              <Label>Bairro *</Label>
              <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Bairro" />
            </div>
            <div>
              <Label>Cidade *</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cidade" />
            </div>
            <div>
              <Label>UF *</Label>
              <Input value={form.uf} onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))} placeholder="PR" maxLength={2} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de pedido</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setKind("individual")}
                className={`flex-1 rounded-lg py-2 text-sm border ${kind === "individual" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}>
                Individual (escolher itens)
              </button>
              <button type="button" onClick={() => setKind("church")}
                className={`flex-1 rounded-lg py-2 text-sm border ${kind === "church" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}>
                Congregação (kit)
              </button>
            </div>
          </div>

          {kind === "individual" ? (
            <div className="space-y-2">
              {MATERIAL_CATALOG.map((it) => {
                const checked = qty[it.id] !== undefined;
                return (
                  <div key={it.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${checked ? "bg-primary/5 border-primary/25" : "border-border"}`}>
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => toggleItem(it.id)} className="w-4 h-4" />
                      {it.label}
                    </label>
                    {checked && (
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={qty[it.id]}
                        onChange={(e) => setQty((q) => ({ ...q, [it.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-16 rounded-md px-2 py-1 text-sm bg-secondary border border-border text-center outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Congregação *</Label>
              <select
                value={churchId}
                onChange={(e) => setChurchId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
              >
                <option value="">Selecione a congregação...</option>
                {Object.entries(churchGroups).map(([regional, options]) => (
                  <optgroup key={regional} label={regional}>
                    {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ))}
              </select>
              {selectedChurch && (
                <p className="text-xs rounded-lg px-3 py-2 bg-primary/5 border border-primary/20 text-primary">
                  {selectedChurch.memberCount != null
                    ? `${selectedChurch.memberCount} membros cadastrados — o kit fica a critério da equipe.`
                    : "Número de membros não cadastrado pra essa congregação."}
                </p>
              )}
            </div>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer rounded-lg px-3 py-2 border border-border">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="w-4 h-4 mt-0.5" />
            <span className="text-xs text-muted-foreground">
              Confirmo que obtive o consentimento dessa pessoa pra receber material de campanha em seu nome —
              serve como base do Termo de Apoiador gerado a partir deste cadastro.
            </span>
          </label>

          {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Salvando..." : "Criar pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
