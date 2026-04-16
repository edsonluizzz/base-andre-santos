"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Megaphone, Plus, Send, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Broadcast = {
  id: string;
  title: string;
  message: string;
  audience: string;
  sentCount: number;
  createdAt: string;
};

type Ministry = {
  id: string;
  name: string;
};

export default function ComunicadosPage() {
  const { data: session } = useSession();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("ALL");

  const isAdminOrLeader = ["ADMIN", "LEADER"].includes(session?.user?.role ?? "");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, mRes] = await Promise.all([
        fetch("/api/broadcasts"),
        fetch("/api/ministries"),
      ]);
      if (bRes.ok) setBroadcasts(await bRes.json());
      if (mRes.ok) setMinistries(await mRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSend() {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, audience }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setTitle("");
        setMessage("");
        setAudience("ALL");
        fetchData();
      }
    } finally {
      setSending(false);
    }
  }

  function audienceLabel(aud: string) {
    if (aud === "ALL") return "Todos os membros";
    if (aud.startsWith("MINISTRY:")) {
      const mid = aud.replace("MINISTRY:", "");
      const m = ministries.find((x) => x.id === mid);
      return m ? `Ministério: ${m.name}` : "Ministério";
    }
    return aud;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Comunicados</h1>
            <p className="text-sm text-muted-foreground">
              Envie mensagens para membros por e-mail e notificação
            </p>
          </div>
        </div>
        {isAdminOrLeader && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo comunicado
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">
            Nenhum comunicado enviado ainda.
          </p>
          {isAdminOrLeader && (
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Criar primeiro comunicado
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div key={b.id} className="glass-card rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {b.message}
                  </p>
                </div>
                <Badge variant="outline" className="flex-shrink-0 text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {b.sentCount} enviados
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Send className="w-3 h-3" />
                  {audienceLabel(b.audience)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDistanceToNow(new Date(b.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              Novo Comunicado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="bc-title">Título</Label>
              <Input
                id="bc-title"
                placeholder="Ex: Culto especial de domingo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bc-message">Mensagem</Label>
              <Textarea
                id="bc-message"
                placeholder="Escreva o comunicado aqui..."
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Destinatários</Label>
              <Select value={audience} onValueChange={(v) => v && setAudience(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os membros ativos</SelectItem>
                  {ministries.map((m) => (
                    <SelectItem key={m.id} value={`MINISTRY:${m.id}`}>
                      Ministério: {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={sending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !title.trim() || !message.trim()}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
