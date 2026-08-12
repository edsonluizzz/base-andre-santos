"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { CONTRIBUTION_OPTIONS } from "@/lib/contribution";
import { normalizeCpf, formatCpf, isValidCpf } from "@/lib/cpf";

const ROLES = [
  { value: "COORD_GERAL",    label: "Coord. Geral"      },
  { value: "COORD_REGIONAL", label: "Coord. Regional"   },
  { value: "LIDER_MUNICIPAL",label: "Líder Municipal"   },
  { value: "LIDER_BAIRRO",   label: "Líder de Bairro"   },
  { value: "VOLUNTARIO",     label: "Voluntário"        },
];

const PROFILES = [
  { value: "APOIADOR",              label: "Apoiador"             },
  { value: "PASTOR",                label: "Pastor"               },
  { value: "LIDER_RELIGIOSO",       label: "Líder Religioso"      },
  { value: "PRESIDENTE_ASSOCIACAO", label: "Pres. Associação"     },
  { value: "LIDER_POLITICO",        label: "Líder Político"       },
  { value: "VEREADOR",              label: "Vereador"             },
  { value: "EMPRESARIO",            label: "Empresário"           },
  { value: "LIDERANCA_COMUNITARIA", label: "Liderança Comunit."   },
  { value: "EDUCADOR",              label: "Educador"             },
  { value: "JOVEM",                 label: "Jovem"                },
  { value: "FAMILIA",               label: "Família"              },
];

const CHANNELS = [
  { value: "NONE",      label: "Não informado"    },
  { value: "INSTAGRAM", label: "Instagram"        },
  { value: "WHATSAPP",  label: "WhatsApp"         },
  { value: "EVENTO",    label: "Evento"           },
  { value: "LINK",      label: "Link de cadastro" },
  { value: "OUTRO",     label: "Outro"            },
];

const SUPPORT_STATUSES = [
  { value: "NEUTRO",     label: "Neutro"     },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "NEGOCIANDO", label: "Negociando" },
  { value: "ADVERSARIO", label: "Adversário" },
];

type Collaborator = {
  id?: string; name?: string; email?: string; phone?: string; cpf?: string | null; city?: string;
  neighborhood?: string; campaignRole?: string; status?: string; notes?: string;
  birthday?: string; profile?: string; supportStatus?: string; channel?: string;
  contributionTypes?: string[];
  registeredBy?: { name: string | null; email: string | null } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collaborator?: Collaborator | null;
  onSuccess: () => void;
};

export function CollaboratorDialog({ open, onOpenChange, collaborator, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", cpf: "", city: "", neighborhood: "",
    campaignRole: "VOLUNTARIO", status: "ACTIVE", notes: "", birthday: "",
    profile: "APOIADOR", supportStatus: "NEUTRO", channel: "NONE",
  });
  const [cpfError, setCpfError] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const citiesLoadedRef = useRef(false);

  // Carrega lista de municípios uma vez
  useEffect(() => {
    if (citiesLoadedRef.current) return;
    citiesLoadedRef.current = true;
    fetch("/api/municipios")
      .then((r) => r.ok ? r.json() : [])
      .then(setCities)
      .catch(() => {});
  }, []);

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
      if (d.neighborhood && !form.neighborhood) set("neighborhood", d.neighborhood);
    } catch {
      setCepError("Erro ao consultar CEP");
    } finally {
      setCepLoading(false);
    }
  }

  function formatCep(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  useEffect(() => {
    if (collaborator) {
      setForm({
        name: collaborator.name ?? "",
        email: collaborator.email ?? "",
        phone: collaborator.phone ?? "",
        cpf: collaborator.cpf ? formatCpf(collaborator.cpf) : "",
        city: collaborator.city ?? "",
        neighborhood: collaborator.neighborhood ?? "",
        campaignRole: collaborator.campaignRole ?? "VOLUNTARIO",
        status: collaborator.status ?? "ACTIVE",
        notes: collaborator.notes ?? "",
        birthday: collaborator.birthday ?? "",
        profile: collaborator.profile ?? "APOIADOR",
        supportStatus: collaborator.supportStatus ?? "NEUTRO",
        channel: collaborator.channel ?? "NONE",
      });
      setSelectedTypes(collaborator.contributionTypes ?? []);
    } else {
      setForm({ name: "", email: "", phone: "", cpf: "", city: "", neighborhood: "", campaignRole: "VOLUNTARIO", status: "ACTIVE", notes: "", birthday: "", profile: "APOIADOR", supportStatus: "NEUTRO", channel: "NONE" });
      setSelectedTypes([]);
    }
    setError("");
    setCpfError("");
    setCep("");
    setCepError("");
  }, [collaborator, open]);

  const set = (k: string, v: string | null) => { if (v !== null) setForm((f) => ({ ...f, [k]: v })); };

  function toggleType(value: string) {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Nome obrigatório"); return; }
    if (form.cpf.trim() && !isValidCpf(form.cpf)) { setCpfError("CPF inválido"); return; }
    setCpfError("");
    setSaving(true);
    const method = collaborator?.id ? "PUT" : "POST";
    const url = collaborator?.id ? `/api/collaborators/${collaborator.id}` : "/api/collaborators";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cpf: form.cpf.trim() ? normalizeCpf(form.cpf) : null,
        channel: form.channel === "NONE" ? null : form.channel,
        contributionTypes: selectedTypes,
      }),
    });
    setSaving(false);
    if (res.ok) { onSuccess(); }
    else { const d = await res.json(); setError(d.error ?? "Erro ao salvar"); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{collaborator?.id ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Cadastrado por */}
          {collaborator?.registeredBy && (
            <p className="text-xs text-muted-foreground bg-white/[0.03] rounded-lg px-3 py-2">
              Cadastrado por: <span className="text-foreground">{collaborator.registeredBy.name ?? collaborator.registeredBy.email}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(41) 99999-9999" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" placeholder="email@dominio.com" />
            </div>
            <div>
              <Label>CPF <span className="text-muted-foreground font-normal">(necessário pro recibo eleitoral)</span></Label>
              <Input
                value={form.cpf}
                onChange={(e) => { set("cpf", formatCpf(e.target.value.replace(/\D/g, "").slice(0, 11))); setCpfError(""); }}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
              />
              {cpfError && <p className="text-[11px] text-destructive mt-0.5">{cpfError}</p>}
            </div>
            <div className="col-span-2">
              <Label>CEP <span className="text-muted-foreground font-normal">(preenche cidade e bairro)</span></Label>
              <div className="relative">
                <Input
                  value={cep}
                  onChange={(e) => {
                    const v = formatCep(e.target.value);
                    setCep(v);
                    if (v.replace(/\D/g, "").length === 8) lookupCep(v);
                  }}
                  placeholder="00000-000"
                  inputMode="numeric"
                  maxLength={9}
                  className="pr-8"
                />
                {cepLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>
              {cepError && <p className="text-[11px] text-destructive mt-0.5">{cepError}</p>}
            </div>
            <div>
              <Label>Município</Label>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Curitiba"
                list="pr-cities-list"
              />
              {cities.length > 0 && (
                <datalist id="pr-cities-list">
                  {cities.map((c) => <option key={c} value={c} />)}
                </datalist>
              )}
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Centro" />
            </div>
            <div>
              <Label>Cargo</Label>
              <Select items={ROLES} value={form.campaignRole} onValueChange={(v) => set("campaignRole", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select items={{ ACTIVE: "Ativo", LEAD: "Lead", INACTIVE: "Inativo" }} value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aniversário</Label>
              <Input value={form.birthday} onChange={(e) => set("birthday", e.target.value)} type="date" />
            </div>
            <div>
              <Label>Perfil</Label>
              <Select items={PROFILES} value={form.profile} onValueChange={(v) => set("profile", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROFILES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Apoio ao André</Label>
              <Select items={SUPPORT_STATUSES} value={form.supportStatus} onValueChange={(v) => set("supportStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUPPORT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Canal de origem</Label>
              <Select items={CHANNELS} value={form.channel} onValueChange={(v) => set("channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notas internas..." />
            </div>
          </div>

          {/* Formas de contribuição */}
          <div>
            <Label className="mb-2 block">Formas de contribuição</Label>
            <div className="grid grid-cols-2 gap-2">
              {CONTRIBUTION_OPTIONS.map((opt) => {
                const active = selectedTypes.includes(opt.value);
                return (
                  <button key={opt.value} type="button" onClick={() => toggleType(opt.value)}
                    className={`rounded-lg px-3 py-2 text-xs text-left border transition-colors ${
                      active
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-white/[0.02] text-muted-foreground border-white/[0.08] hover:border-white/[0.15]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
