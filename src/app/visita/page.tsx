"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Church } from "lucide-react";

type State = "loading" | "form" | "submitting" | "success" | "error";

function VisitaForm() {
  const searchParams = useSearchParams();
  const eid = searchParams.get("e") ?? searchParams.get("eid") ?? "";
  const eventId = searchParams.get("ev") ?? null; // event-specific QR from chamada

  const [state, setState] = useState<State>("loading");
  const [churchName, setChurchName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!eid) { setState("error"); setErrorMsg("Link inválido. Solicite um novo QR code."); return; }
    setState("form");
  }, [eid]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setState("submitting");
    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ establishmentId: eid, eventId, name, phone, email }),
      });
      const data = await res.json();
      if (res.ok) {
        setChurchName(data.churchName ?? "");
        setState("success");
      } else {
        setErrorMsg(data.error ?? "Erro ao cadastrar");
        setState("error");
      }
    } catch {
      setErrorMsg("Erro de conexão. Tente novamente.");
      setState("error");
    }
  }

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo(a)! 🙌</h1>
          <p className="text-muted-foreground mt-2 max-w-xs">
            Seu cadastro foi registrado com sucesso
            {churchName ? ` em ${churchName}` : ""}.
            Obrigado por visitar!
          </p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
        <p className="text-destructive font-medium">{errorMsg}</p>
        {state === "error" && errorMsg !== "Link inválido. Solicite um novo QR code." && (
          <button onClick={() => setState("form")} className="text-sm text-primary underline">
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Church className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo(a)!</h1>
          <p className="text-muted-foreground text-sm mt-1">Deixe seu contato para ficarmos em toque</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Nome completo <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              required
              autoFocus
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              WhatsApp / Telefone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(47) 9 9999-9999"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
            />
          </div>

          <button
            type="submit"
            disabled={state === "submitting" || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all mt-2"
          >
            {state === "submitting" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</>
            ) : (
              "Cadastrar"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          Ovile Gestão · seus dados são tratados com privacidade
        </p>
      </div>
    </div>
  );
}

export default function VisitaPage() {
  return (
    <Suspense>
      <VisitaForm />
    </Suspense>
  );
}
