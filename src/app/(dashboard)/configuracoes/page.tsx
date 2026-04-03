"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { Shield, Users, UserCog, ImageIcon, Save, Upload, X, ShieldCog, Trash2, Link, Building2, RefreshCw } from "lucide-react";
import { PermissionsTable } from "@/components/shirts/permissions-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SystemUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  image: string | null;
  member: { id: string; name: string } | null;
};

type Member = {
  id: string;
  name: string;
  userId: string | null;
};

type Establishment = {
  id: string;
  name: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  LEADER: "Líder",
  MEMBER: "Membro",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-primary/10 text-primary border-primary/20",
  LEADER: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MEMBER: "bg-muted/30 text-muted-foreground border-border",
};

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [switchingEid, setSwitchingEid] = useState<string>("");
  const [switching, setSwitching] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";

  const [churchName, setChurchName] = useState("");
  const [churchLogoUrl, setChurchLogoUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users").then((r) => r.json()).then(setUsers);
      fetch("/api/members").then((r) => r.json()).then(setMembers);
      fetch("/api/establishments").then((r) => r.json()).then((data) => {
        setEstablishments(Array.isArray(data) ? data : []);
        setSwitchingEid(session?.user?.establishmentId ?? "");
      });
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s.churchName) setChurchName(s.churchName);
        if (s.logoBase64) setChurchLogoUrl(s.logoBase64);
      })
      .catch(() => {});
  }, [isAdmin]);

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setChurchLogoUrl(base64);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  }

  async function saveChurchSettings() {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchName, logoBase64: churchLogoUrl }),
      });
      if (!res.ok) throw new Error();
      window.dispatchEvent(new CustomEvent("church-settings-updated", {
        detail: { churchName, logoBase64: churchLogoUrl },
      }));
      toast.success("Configurações salvas");
    } catch {
      toast.error("Erro ao salvar");
    }
  }

  async function changeRole(userId: string, role: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated = await res.json();
      toast.success("Papel atualizado");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: updated.role } : u));
    } else {
      toast.error("Erro ao atualizar");
    }
  }

  async function linkMember(userId: string, memberId: string | null) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      const updated = await res.json();
      // Refresh members list so the linked member disappears from other selects
      const membersRes = await fetch("/api/members");
      const freshMembers = await membersRes.json();
      setMembers(freshMembers);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, member: updated.member } : u)
      );
      toast.success(memberId ? "Membro vinculado" : "Vínculo removido");
    } else {
      toast.error("Erro ao vincular");
    }
  }

  async function deleteUser(userId: string, userName: string | null) {
    if (!confirm(`Excluir o usuário "${userName ?? "sem nome"}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Usuário excluído");
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        // Refresh members (their userId becomes null after cascade SetNull)
        const membersRes = await fetch("/api/members");
        setMembers(await membersRes.json());
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao excluir");
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function switchEstablishment() {
    if (!switchingEid || switchingEid === session?.user?.establishmentId) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ establishmentId: switchingEid }),
      });
      if (!res.ok) throw new Error();
      toast.success("Estabelecimento alterado. Redirecionando...");
      // Força novo login para atualizar o JWT com o novo establishmentId
      setTimeout(() => signOut({ callbackUrl: "/login" }), 1200);
    } catch {
      toast.error("Erro ao trocar estabelecimento");
      setSwitching(false);
    }
  }

  // Members available for linking: unlinked ones + the one already linked to this user
  function availableMembers(currentMember: { id: string; name: string } | null) {
    return members.filter((m) => !m.userId || m.id === currentMember?.id);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Configurações
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gerenciamento do sistema</p>
      </div>

      {/* Church Appearance — admin only */}
      {isAdmin && (
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Aparência da Igreja</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Nome da Igreja</Label>
                <Input
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="Ex: Igreja Central"
                  className="bg-background border-border text-foreground focus-visible:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground/50">Exibido no cabeçalho da barra lateral</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Logo / Imagem da Igreja</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors p-5 ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {churchLogoUrl ? (
                    <>
                      <img
                        src={churchLogoUrl}
                        alt="Logo"
                        className="w-16 h-16 rounded-xl object-cover border border-primary/20"
                      />
                      <p className="text-[11px] text-muted-foreground">Clique para trocar</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setChurchLogoUrl(""); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground text-center">
                        Clique ou arraste uma imagem aqui
                      </p>
                      <p className="text-[11px] text-muted-foreground/50">PNG, JPG, WebP — máx. 2MB</p>
                    </>
                  )}
                </div>
              </div>

              <Button onClick={saveChurchSettings}>
                <Save className="w-4 h-4 mr-2" />
                Salvar configurações
              </Button>
            </div>

            {/* Logo preview */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground/50 mb-3">Prévia</p>
              <div className="bg-slate-950/80 border border-white/[0.06] rounded-xl p-4 flex items-center gap-3 w-full max-w-[220px]">
                {churchLogoUrl ? (
                  <img
                    src={churchLogoUrl}
                    alt="Logo"
                    className="w-9 h-9 rounded-lg object-cover border border-primary/20"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-lg">
                    ✝️
                  </div>
                )}
                <div>
                  <p className="text-[10px] tracking-[3px] uppercase text-primary/70">Ovile Gestão</p>
                  <p className="text-sm font-bold text-foreground">
                    {churchName || "Minha Igreja"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My account */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Minha Conta</p>
        </div>
        <div className="flex items-center gap-4">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt=""
              className="w-12 h-12 rounded-full border border-border"
            />
          )}
          <div>
            <p className="font-medium text-foreground">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            <span
              className={`inline-block mt-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                ROLE_COLORS[session?.user?.role ?? "MEMBER"]
              }`}
            >
              {ROLE_LABELS[session?.user?.role ?? "MEMBER"]}
            </span>
          </div>
        </div>

        {/* Establishment switcher — admin only */}
        {isAdmin && establishments.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Estabelecimento ativo</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Você está visualizando os dados de:{" "}
              <span className="text-foreground font-medium">
                {establishments.find((e) => e.id === session?.user?.establishmentId)?.name ?? session?.user?.establishmentId}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Select value={switchingEid} onValueChange={(v) => v && setSwitchingEid(v)}>
                <SelectTrigger className="flex-1 bg-background border-border text-foreground h-9 text-sm">
                  <SelectValue placeholder="Selecionar estabelecimento..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {establishments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                      {e.id === session?.user?.establishmentId && (
                        <span className="ml-2 text-[10px] text-primary">atual</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={switchEstablishment}
                disabled={switching || switchingEid === session?.user?.establishmentId}
                size="sm"
                variant="outline"
                className="gap-1.5 h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${switching ? "animate-spin" : ""}`} />
                Trocar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground/50 mt-2">
              Ao trocar, você será redirecionado para o login novamente.
            </p>
          </div>
        )}
      </div>

      {/* User management — admin only */}
      {isAdmin && (
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Usuários do sistema</p>
            <span className="text-xs text-muted-foreground">(quem fez login pelo Google)</span>
          </div>

          {users.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum usuário encontrado</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => {
                const isSelf = u.id === session?.user?.id;
                const options = availableMembers(u.member);
                return (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-white/[0.06] rounded-xl bg-white/[0.02]"
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {u.image ? (
                        <img src={u.image} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {u.name?.[0] ?? "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {u.name ?? "Sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Member link select */}
                      {!isSelf && (
                        <Select
                          value={u.member?.id ?? "__none__"}
                          onValueChange={(v: string | null) => {
                            if (!v) return;
                            linkMember(u.id, v === "__none__" ? null : v);
                          }}
                        >
                          <SelectTrigger className="w-40 bg-background border-border text-foreground h-8 text-xs">
                            <Link className="w-3 h-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                            <SelectValue placeholder="Vincular membro..." />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">Sem vínculo</span>
                            </SelectItem>
                            {options.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Role select */}
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground px-1">Você</span>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(v: string | null) => v && changeRole(u.id, v)}
                        >
                          <SelectTrigger className="w-36 bg-background border-border text-foreground h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="ADMIN">Administrador</SelectItem>
                            <SelectItem value="LEADER">Líder</SelectItem>
                            <SelectItem value="MEMBER">Membro</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {/* Delete button */}
                      {!isSelf && (
                        <button
                          onClick={() => deleteUser(u.id, u.name)}
                          disabled={deletingId === u.id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/50 mt-4">
            Vincule cada usuário ao seu cadastro de membro para unificar presenças e dados.
          </p>
        </div>
      )}

      {/* Permissions management — admin only */}
      {isAdmin && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShieldCog className="w-4 h-4 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Permissões por Papel</p>
            <span className="text-xs text-muted-foreground">(o que Líderes e Membros podem fazer)</span>
          </div>
          <PermissionsTable />
        </div>
      )}

      {!isAdmin && (
        <div className="glass-card p-6 text-center">
          <UserCog className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            Somente administradores podem gerenciar usuários e permissões.
          </p>
        </div>
      )}
    </div>
  );
}
