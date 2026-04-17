"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, CalendarDays, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

type EventInfo = {
  id: string;
  title: string;
  date: string;
  type: string;
  location: string | null;
};

type State = "loading" | "ready" | "submitting" | "success" | "already" | "error" | "notMember" | "noAccess";

const TYPE_LABELS: Record<string, string> = {
  CULTO: "Culto",
  ENSAIO: "Ensaio",
  REUNIAO: "Reunião",
  RETIRO: "Retiro",
  CELULA: "Célula",
  CONGRESSO: "Congresso",
  OUTRO: "Outro",
};

function safeFormat(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return "";
    return format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return "";
  }
}

export default function CheckinPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [state, setState] = useState<State>("loading");
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/qr/${eventId}`);
        if (res.status === 401) {
          window.location.href = `/login?callbackUrl=/checkin/${eventId}`;
          return;
        }
        if (res.status === 403) { setState("noAccess"); return; }
        if (res.status === 404) { setState("error"); setErrorMsg("Evento não encontrado"); return; }
        const data = await res.json();
        if (!res.ok) { setState("error"); setErrorMsg(data.error ?? "Erro ao carregar evento"); return; }

        setEvent(data.event);
        setMemberName(data.memberName);
        if (data.alreadyPresent) {
          setState("already");
        } else if (!data.memberName) {
          setState("notMember");
        } else {
          setState("ready");
        }
      } catch {
        setState("error");
        setErrorMsg("Falha na conexão");
      }
    }
    load();
  }, [eventId]);

  async function handleCheckin() {
    setState("submitting");
    try {
      const res = await fetch(`/api/qr/${eventId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMemberName(data.memberName);
        setState("success");
      } else {
        setState("error");
        setErrorMsg(data.error ?? "Erro ao registrar presença");
      }
    } catch {
      setState("error");
      setErrorMsg("Falha na conexão");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-7 h-7 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Ovile · Check-in</p>
        </div>

        {/* Loading */}
        {state === "loading" && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Carregando evento...</p>
          </div>
        )}

        {/* Event card + confirm button */}
        {(state === "ready" || state === "submitting") && event && (
          <div className="space-y-4">
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
              {event.type && (
                <span className="inline-block text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-medium">
                  {TYPE_LABELS[event.type] ?? event.type}
                </span>
              )}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="capitalize">{safeFormat(event.date)}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>

            {memberName && (
              <p className="text-center text-sm text-muted-foreground">
                Olá, <span className="font-semibold text-foreground">{memberName.split(" ")[0]}</span>!
              </p>
            )}

            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleCheckin}
              disabled={state === "submitting"}
            >
              {state === "submitting" ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando...</>
              ) : (
                "✓ Confirmar Presença"
              )}
            </Button>
          </div>
        )}

        {/* Success */}
        {state === "success" && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Presença registrada!</h2>
              {memberName && (
                <p className="text-muted-foreground text-sm">
                  Bem-vindo(a), <span className="font-semibold text-foreground">{memberName.split(" ")[0]}</span>!
                </p>
              )}
              {event && <p className="text-xs text-muted-foreground mt-2">{event.title}</p>}
            </div>
          </div>
        )}

        {/* Already registered */}
        {state === "already" && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Presença já registrada</h2>
              {memberName && (
                <p className="text-muted-foreground text-sm">
                  <span className="font-semibold text-foreground">{memberName.split(" ")[0]}</span>, você já está marcado(a) como presente.
                </p>
              )}
              {event && <p className="text-xs text-muted-foreground mt-2">{event.title}</p>}
            </div>
          </div>
        )}

        {/* Not a member */}
        {state === "notMember" && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Membro não encontrado</h2>
              <p className="text-muted-foreground text-sm">
                Sua conta Google não está vinculada a nenhum membro desta congregação. Peça ao seu líder para adicionar seu e-mail no cadastro.
              </p>
            </div>
          </div>
        )}

        {/* No access to this establishment */}
        {state === "noAccess" && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Sem acesso</h2>
              <p className="text-muted-foreground text-sm">
                Você não é membro desta congregação.
              </p>
            </div>
          </div>
        )}

        {/* Generic error */}
        {state === "error" && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Erro</h2>
              <p className="text-muted-foreground text-sm">{errorMsg || "Tente novamente."}</p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
