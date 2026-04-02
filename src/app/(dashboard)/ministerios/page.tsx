"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Users, Crown, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/context/permissions-context";
import { useSession } from "next-auth/react";

type MinistryMemberEntry = {
  id: string;
  role: "LEADER" | "MEMBER";
  member: { id: string; name: string; photoUrl?: string | null };
};

type Ministry = {
  id: string;
  name: string;
  description: string | null;
  members: MinistryMemberEntry[];
};

type Member = { id: string; name: string };

const ROLE_LABEL = { LEADER: "Líder", MEMBER: "Membro" };

export default function MinisteriosPage() {
  const { isAdmin } = usePermissions();
  const { data: session } = useSession();
  const canManage = isAdmin || session?.user?.role === "LEADER";

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMemberDialog, setAddMemberDialog] = useState<string | null>(null); // ministryId
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchMinistries = useCallback(async () => {
    const res = await fetch("/api/ministries");
    if (res.ok) setMinistries(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMinistries();
    fetch("/api/members").then((r) => r.json()).then(setMembers);
  }, [fetchMinistries]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/ministries?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Ministério removido"); fetchMinistries(); }
    else toast.error("Erro ao remover");
  }

  async function handleRemoveMember(ministryId: string, memberId: string) {
    const res = await fetch(`/api/ministries/${ministryId}/members?memberId=${memberId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Membro removido"); fetchMinistries(); }
    else toast.error("Erro ao remover membro");
  }

  function toggleExpand(id: string) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl lg:text-3xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ministérios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Grupos e equipes de serviço da congregação
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Ministério
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-40 mb-2" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      ) : ministries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-foreground font-medium">Nenhum ministério criado</p>
          <p className="text-muted-foreground text-sm mt-1">
            Crie o primeiro ministério para organizar os grupos da congregação.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ministries.map((m) => (
            <div key={m.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Ministry header */}
              <div className="flex items-center gap-4 p-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.members.length} {m.members.length === 1 ? "integrante" : "integrantes"}
                    {m.description && ` · ${m.description}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddMemberDialog(m.id)}
                      className="text-muted-foreground hover:text-primary gap-1 h-8 px-2"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(m.id)}
                      className="text-muted-foreground hover:text-destructive h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleExpand(m.id)}
                    className="text-muted-foreground h-8 px-2"
                  >
                    {expanded[m.id]
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />
                    }
                  </Button>
                </div>
              </div>

              {/* Members list (expandable) */}
              {expanded[m.id] && m.members.length > 0 && (
                <div className="border-t border-border divide-y divide-border">
                  {m.members.map((mm) => (
                    <div key={mm.id} className="flex items-center gap-3 px-5 py-3 group">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0 overflow-hidden">
                        {mm.member.photoUrl
                          ? <img src={mm.member.photoUrl} alt={mm.member.name} className="w-full h-full object-cover" />
                          : mm.member.name.charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{mm.member.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {mm.role === "LEADER" && (
                          <Crown className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground">{ROLE_LABEL[mm.role]}</span>
                        {canManage && (
                          <button
                            onClick={() => handleRemoveMember(m.id, mm.member.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded transition-all ml-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expanded[m.id] && m.members.length === 0 && (
                <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground">
                  Nenhum integrante ainda.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Ministry Dialog */}
      <CreateMinistryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => { fetchMinistries(); setCreateDialogOpen(false); }}
      />

      {/* Add Member Dialog */}
      {addMemberDialog && (
        <AddMemberDialog
          ministryId={addMemberDialog}
          members={members}
          existingMemberIds={ministries.find((m) => m.id === addMemberDialog)?.members.map((mm) => mm.member.id) ?? []}
          open={!!addMemberDialog}
          onOpenChange={(v) => { if (!v) setAddMemberDialog(null); }}
          onSuccess={() => { fetchMinistries(); setAddMemberDialog(null); }}
        />
      )}
    </div>
  );
}

// ─── Create Ministry Dialog ───────────────────────────────────────────────────

function CreateMinistryDialog({ open, onOpenChange, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    setLoading(true);
    const res = await fetch("/api/ministries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Ministério criado!");
      setName(""); setDescription("");
      onSuccess();
    } else {
      toast.error("Erro ao criar ministério");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Novo Ministério</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Louvor, Diaconato, Oração..."
              className="bg-background border-border text-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Descrição (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição..."
              className="bg-background border-border text-foreground" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-border text-muted-foreground">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Criando..." : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Member Dialog ────────────────────────────────────────────────────────

function AddMemberDialog({ ministryId, members, existingMemberIds, open, onOpenChange, onSuccess }: {
  ministryId: string;
  members: Member[];
  existingMemberIds: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [role, setRole] = useState<"LEADER" | "MEMBER">("MEMBER");
  const [loading, setLoading] = useState(false);

  const available = members.filter((m) => !existingMemberIds.includes(m.id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) { toast.error("Selecione um membro"); return; }
    setLoading(true);
    const res = await fetch(`/api/ministries/${ministryId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Membro adicionado!");
      setMemberId(""); setRole("MEMBER");
      onSuccess();
    } else {
      toast.error("Erro ao adicionar membro");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-heading)" }}>Adicionar Integrante</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Membro *</Label>
            <Select value={memberId} onValueChange={(v: string | null) => v && setMemberId(v)}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-52">
                {available.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
                {available.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Todos os membros já estão no ministério.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Papel</Label>
            <Select value={role} onValueChange={(v: string | null) => v && setRole(v as "LEADER" | "MEMBER")}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="LEADER">Líder</SelectItem>
                <SelectItem value="MEMBER">Membro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-border text-muted-foreground">Cancelar</Button>
            <Button type="submit" disabled={loading || available.length === 0} className="flex-1">
              {loading ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
