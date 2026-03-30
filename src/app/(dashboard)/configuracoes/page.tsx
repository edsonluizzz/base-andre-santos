"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Shield, Users, UserCog, ImageIcon, Save, Upload, X, ShieldCog } from "lucide-react";
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
  const isAdmin = session?.user?.role === "ADMIN";

  const [churchName, setChurchName] = useState("Porto Belo");
  const [churchLogoUrl, setChurchLogoUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users").then((r) => r.json()).then(setUsers);
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
      toast.success("Papel atualizado");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    } else {
      toast.error("Erro ao atualizar");
    }
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
                  placeholder="Ex: Porto Belo"
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
                  <p className="text-[10px] tracking-[3px] uppercase text-primary/70">UMADC</p>
                  <p className="text-sm font-bold text-foreground">
                    {churchName || "Porto Belo"}
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
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 border border-white/[0.06] rounded-xl bg-white/[0.02]"
                >
                  {u.image ? (
                    <img src={u.image} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {u.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.name ?? "Sem nome"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {u.id === session?.user?.id ? (
                    <span className="text-xs text-muted-foreground">Você</span>
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
                </div>
              ))}
            </div>
          )}
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
