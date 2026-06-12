"use client";

import { useState, useEffect, useCallback } from "react";
import { Link2, Plus, Copy, MessageCircle, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type InviteLinkRecord = {
  id: string;
  token: string;
  role: string;
  useCount: number;
  usedAt: string | null;
  createdAt: string;
};

const ROLE_LABEL: Record<string, string> = {
  MEMBER: "Colaborador",
  LEADER: "Coordenador",
  ADMIN: "Administrador",
};
const ROLE_COLOR: Record<string, string> = {
  MEMBER: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  LEADER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ADMIN: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "short",
  });
}

function waShare(url: string) {
  return `https://wa.me/?text=${encodeURIComponent(
    `Você faz parte da equipe da Base de Apoio André Santos 2026!\n\nEntre com a sua conta Google por este link para começar a cadastrar apoiadores:\n${url}`,
  )}`;
}

export default function ConvitesPage() {
  const [links, setLinks] = useState<InviteLinkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [role, setRole] = useState("MEMBER");
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invite-links");
      if (res.ok) setLinks(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  function urlFor(token: string) {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/entrar?token=${token}`;
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Link copiado!")).catch(() => {});
  }

  async function createLink() {
    setCreating(true);
    try {
      const res = await fetch("/api/invite-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const link = await res.json();
        setNewUrl(urlFor(link.token));
        fetchLinks();
      } else {
        toast.error("Erro ao gerar link");
      }
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revogar este link? Quem ainda não entrou não conseguirá mais usá-lo.")) return;
    const res = await fetch(`/api/invite-links/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Link revogado"); setLinks((prev) => prev.filter((l) => l.id !== id)); }
    else toast.error("Erro ao revogar");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary" /> Convites da Equipe
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere um link e compartilhe com a equipe de rua. Cada pessoa entra com o Google e
            vira colaborador, vinculada aos próprios cadastros.
          </p>
        </div>
        <Button onClick={() => { setNewUrl(null); setRole("MEMBER"); setDialogOpen(true); }} className="gap-1.5 bg-primary text-primary-foreground shrink-0">
          <Plus className="w-4 h-4" /> Gerar link
        </Button>
      </div>

      {/* Como funciona */}
      <div className="glass-card rounded-2xl p-4 border border-white/[0.08]">
        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" /> Como a equipe entra
        </p>
        <ol className="space-y-1.5 text-xs text-muted-foreground">
          <li><strong className="text-foreground">1.</strong> Gere um link com o papel <strong className="text-foreground">Colaborador</strong>.</li>
          <li><strong className="text-foreground">2.</strong> Compartilhe no grupo da equipe (o mesmo link serve para todos).</li>
          <li><strong className="text-foreground">3.</strong> Cada pessoa abre, entra com a conta Google dela e já acessa o Cadastro na Rua.</li>
          <li><strong className="text-foreground">4.</strong> É obrigatório ter Gmail e fazer login — assim os cadastros ficam vinculados a cada um.</li>
        </ol>
      </div>

      {/* Lista de links */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : links.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-white/[0.08]">
          <Link2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum link gerado ainda.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/[0.08] divide-y divide-white/[0.04] overflow-hidden">
          {links.map((link) => {
            const url = urlFor(link.token);
            return (
              <div key={link.id} className="flex items-center gap-3 p-3">
                <div className="w-2 h-2 rounded-full shrink-0 bg-green-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLOR[link.role] ?? ROLE_COLOR.MEMBER}`}>
                      {ROLE_LABEL[link.role] ?? link.role}
                    </span>
                    <span className="text-[10px] text-green-400">
                      {link.useCount === 0 ? "Nunca usado" : `${link.useCount} uso${link.useCount !== 1 ? "s" : ""}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">{fmtDate(link.createdAt)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5 font-mono">
                    /entrar?token={link.token.slice(0, 16)}...
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-primary hover:bg-primary/10" onClick={() => copy(url)} title="Copiar link">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <a
                    href={waShare(url)}
                    target="_blank" rel="noopener noreferrer"
                    className="h-7 px-2 rounded-md flex items-center text-green-400 hover:bg-green-500/10 transition-colors"
                    title="Enviar via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => revoke(link.id)} title="Revogar link">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog gerar */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setRole("MEMBER"); setNewUrl(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Gerar link da equipe</DialogTitle></DialogHeader>
          {newUrl ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/20 space-y-2">
                <p className="text-sm font-medium text-green-400 text-center">Link gerado!</p>
                <p className="text-xs font-mono text-muted-foreground break-all bg-white/[0.04] rounded-lg p-2">{newUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-1.5 bg-primary text-primary-foreground" onClick={() => copy(newUrl)}>
                  <Copy className="w-4 h-4" /> Copiar
                </Button>
                <a
                  href={waShare(newUrl)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors"
                  title="Enviar via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setDialogOpen(false)}>Fechar</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Nível de acesso</Label>
                <Select value={role} onValueChange={(v) => setRole(v ?? "MEMBER")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Colaborador — cadastra e gerencia os próprios apoiadores</SelectItem>
                    <SelectItem value="LEADER">Coordenador — gerencia colaboradores e zonas</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  O link é reutilizável — toda a equipe pode usar o mesmo. Revogue quando quiser desativar.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={createLink} disabled={creating} className="bg-primary text-primary-foreground">
                  {creating ? "Gerando..." : "Gerar link"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
