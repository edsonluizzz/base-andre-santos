"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Copy, Zap, Database } from "lucide-react";
import { cn } from "@/lib/utils";

type FormData = {
  id: string; name: string; slug: string; dbUrl: string;
  adminEmail: string; candidateName: string; party: string;
  district: string; electionYear: string;
  primaryColor: string; secondaryColor: string; plan: string;
};

const EMPTY: FormData = {
  id: "", name: "", slug: "", dbUrl: "", adminEmail: "",
  candidateName: "", party: "", district: "", electionYear: "2026",
  primaryColor: "#1E40AF", secondaryColor: "#0d1b2a", plan: "free",
};

type Mode = "auto" | "manual";
type Step = "idle" | "neon" | "schema" | "record" | "done";

const STEP_LABELS: Record<Step, string> = {
  idle:   "",
  neon:   "Criando projeto Neon...",
  schema: "Aplicando schema no banco...",
  record: "Registrando campanha...",
  done:   "Concluído!",
};

export function NovaCampanhaForm() {
  const router = useRouter();
  const [mode, setMode]       = useState<Mode>("auto");
  const [form, setForm]       = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState<Step>("idle");
  const [error, setError]     = useState("");
  const [created, setCreated] = useState<{ id: string; dbUrl: string } | null>(null);

  function set(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function slugify(v: string) {
    return v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "auto") {
        // Provisionamento automático: Neon API → schema → Campaign record
        setStep("neon");
        const res = await fetch("/api/admin/campaigns/provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro no provisionamento");
        setStep("done");
        setCreated({ id: data.campaign.id, dbUrl: data.dbUrl });
      } else {
        // Manual: apenas cria o Campaign record (banco já inicializado)
        setStep("record");
        const res = await fetch("/api/admin/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao criar campanha");
        setStep("done");
        setCreated({ id: data.campaign.id, dbUrl: form.dbUrl });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setStep("idle");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    const initCmd = `DATABASE_URL="${created.dbUrl}" npx prisma db push`;
    return (
      <div className="space-y-5">
        <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
            <span className="font-semibold text-green-400">Campanha criada com sucesso!</span>
          </div>
          <div className="text-sm text-muted-foreground">
            ID: <code className="text-foreground font-mono">{created.id}</code>
          </div>
          {mode === "auto" && (
            <div className="text-sm text-green-400 mt-1">
              Banco Neon criado e schema aplicado automaticamente.
            </div>
          )}
        </div>

        {mode === "manual" && (
          <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <p className="text-sm font-semibold text-amber-400">Próximo passo — inicializar o banco</p>
            <p className="text-sm text-muted-foreground">
              Execute este comando localmente para criar as tabelas:
            </p>
            <div className="flex items-start gap-2">
              <code className="flex-1 text-xs bg-black/30 p-3 rounded-lg break-all font-mono text-foreground">
                {initCmd}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(initCmd)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
                title="Copiar"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {form.adminEmail && (
          <p className="text-sm text-muted-foreground">
            Próximo: convide o admin em <strong>/super-admin</strong> com o e-mail{" "}
            <strong>{form.adminEmail}</strong>
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setCreated(null); setForm(EMPTY); setStep("idle"); }}>
            Criar outra
          </Button>
          <Button onClick={() => router.push("/campanhas")}>
            Ver campanhas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Modo */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("auto")}
          className={cn(
            "p-4 rounded-xl border text-left transition-all",
            mode === "auto"
              ? "bg-primary/10 border-primary/40 text-foreground"
              : "bg-white/[0.02] border-white/10 text-muted-foreground hover:border-white/20"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Automático</span>
          </div>
          <p className="text-xs opacity-70">Neon API cria o banco e aplica o schema automaticamente.</p>
          <p className="text-xs opacity-50 mt-1">Requer NEON_API_KEY no Vercel</p>
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={cn(
            "p-4 rounded-xl border text-left transition-all",
            mode === "manual"
              ? "bg-primary/10 border-primary/40 text-foreground"
              : "bg-white/[0.02] border-white/10 text-muted-foreground hover:border-white/20"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4" />
            <span className="text-sm font-semibold">Manual</span>
          </div>
          <p className="text-xs opacity-70">Você cria o Neon e cola a URL. Roda o schema localmente.</p>
        </button>
      </div>

      {/* Identificação */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificação</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">ID único *</label>
            <Input
              placeholder="joao-silva-2026"
              value={form.id}
              onChange={e => { set("id", slugify(e.target.value)); set("slug", slugify(e.target.value)); }}
              className="bg-white/[0.03] border-white/10 font-mono"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Nome da campanha *</label>
            <Input
              placeholder="Base João Silva"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              className="bg-white/[0.03] border-white/10"
              required
            />
          </div>
        </div>

        {mode === "manual" && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">DATABASE_URL (Neon) *</label>
            <Input
              placeholder="postgresql://neondb_owner:...@ep-xxx.neon.tech/neondb?sslmode=require"
              value={form.dbUrl}
              onChange={e => set("dbUrl", e.target.value)}
              className="bg-white/[0.03] border-white/10 font-mono text-xs"
              required={mode === "manual"}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">E-mail do admin</label>
          <Input
            type="email"
            placeholder="admin@campanha.com.br"
            value={form.adminEmail}
            onChange={e => set("adminEmail", e.target.value)}
            className="bg-white/[0.03] border-white/10"
          />
        </div>
      </section>

      {/* Candidato */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Candidato</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input placeholder="João Silva" value={form.candidateName} onChange={e => set("candidateName", e.target.value)} className="bg-white/[0.03] border-white/10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Partido</label>
            <Input placeholder="PSD" value={form.party} onChange={e => set("party", e.target.value)} className="bg-white/[0.03] border-white/10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Estado</label>
            <Input placeholder="Paraná" value={form.district} onChange={e => set("district", e.target.value)} className="bg-white/[0.03] border-white/10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Ano</label>
            <Input type="number" placeholder="2026" value={form.electionYear} onChange={e => set("electionYear", e.target.value)} className="bg-white/[0.03] border-white/10" />
          </div>
        </div>
      </section>

      {/* Visual */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visual</h2>
        <div className="grid grid-cols-2 gap-4">
          {[["primaryColor", "Cor primária"], ["secondaryColor", "Cor secundária"]].map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{label}</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form[key as keyof FormData]} onChange={e => set(key as keyof FormData, e.target.value)} className="h-9 w-12 rounded cursor-pointer border border-white/10 bg-transparent" />
                <Input value={form[key as keyof FormData]} onChange={e => set(key as keyof FormData, e.target.value)} className="bg-white/[0.03] border-white/10 font-mono" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Plano</label>
          <select value={form.plan} onChange={e => set("plan", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/10 text-foreground">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-400 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{error}</p>
      )}

      <Button type="submit" disabled={loading} className="w-full gap-2">
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />{STEP_LABELS[step]}</>
        ) : mode === "auto" ? (
          <><Zap className="h-4 w-4" />Criar e provisionar automaticamente</>
        ) : (
          "Criar Campanha"
        )}
      </Button>
    </form>
  );
}
