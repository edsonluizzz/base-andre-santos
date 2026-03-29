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
  ADMIN: "bg-[#c9a84c22] text-[#c9a84c] border-[#c9a84c33]",
  LEADER: "bg-[#3498db22] text-[#3498db] border-[#3498db33]",
  MEMBER: "bg-[#2a2a2a] text-[#888] border-[#2a2a2a]",
};

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const isAdmin = session?.user?.role === "ADMIN";

  // Church appearance settings
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
      // Notify sidebar via custom event
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
        <h1
          className="text-2xl lg:text-3xl font-bold text-[#e8c97a]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Configurações
        </h1>
        <p className="text-[#888] text-sm mt-1">Gerenciamento do sistema</p>
      </div>

      {/* Church Appearance — admin only */}
      {isAdmin && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <ImageIcon className="w-5 h-5 text-[#c9a84c]" />
            <p className="font-semibold text-[#f0ece4]">Aparência da Igreja</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[#888] text-xs">Nome da Igreja</Label>
                <Input
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="Ex: Porto Belo"
                  className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]"
                />
                <p className="text-[11px] text-[#555]">Exibido no cabeçalho da barra lateral</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#888] text-xs">Logo / Imagem da Igreja</Label>
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
                      ? "border-[#c9a84c] bg-[#c9a84c11]"
                      : "border-[#2a2a2a] bg-[#0d0d0d] hover:border-[#7a6330] hover:bg-[#c9a84c08]"
                  }`}
                >
                  {churchLogoUrl ? (
                    <>
                      <img
                        src={churchLogoUrl}
                        alt="Logo"
                        className="w-16 h-16 rounded-xl object-cover border border-[#c9a84c33]"
                      />
                      <p className="text-[11px] text-[#888]">Clique para trocar</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setChurchLogoUrl(""); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#e74c3c22] flex items-center justify-center hover:bg-[#e74c3c44] transition-colors"
                      >
                        <X className="w-3 h-3 text-[#e74c3c]" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#555]" />
                      <p className="text-xs text-[#888] text-center">
                        Clique ou arraste uma imagem aqui
                      </p>
                      <p className="text-[11px] text-[#555]">PNG, JPG, WebP — máx. 2MB</p>
                    </>
                  )}
                </div>
              </div>

              <Button
                onClick={saveChurchSettings}
                className="bg-[#c9a84c] hover:bg-[#e8c97a] text-black font-semibold"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar configurações
              </Button>
            </div>

            {/* Logo preview */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-[10px] tracking-[2px] uppercase text-[#555] mb-3">Prévia</p>
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3 w-full max-w-[220px]">
                {churchLogoUrl ? (
                  <img
                    src={churchLogoUrl}
                    alt="Logo"
                    className="w-9 h-9 rounded-lg object-cover border border-[#c9a84c33]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-[#1e1e1e] border border-[#c9a84c33] flex items-center justify-center text-lg">
                    ✝️
                  </div>
                )}
                <div>
                  <p className="text-[10px] tracking-[3px] uppercase text-[#c9a84c] opacity-70">UMADC</p>
                  <p className="text-sm font-bold text-[#e8c97a]" style={{ fontFamily: "var(--font-heading)" }}>
                    {churchName || "Porto Belo"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My account */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-[#c9a84c]" />
          <p className="font-semibold text-[#f0ece4]">Minha Conta</p>
        </div>
        <div className="flex items-center gap-4">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt=""
              className="w-12 h-12 rounded-full border border-[#2a2a2a]"
            />
          )}
          <div>
            <p className="font-medium text-[#f0ece4]">{session?.user?.name}</p>
            <p className="text-sm text-[#888]">{session?.user?.email}</p>
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
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <Users className="w-5 h-5 text-[#c9a84c]" />
            <p className="font-semibold text-[#f0ece4]">Usuários do sistema</p>
            <span className="text-xs text-[#888]">(quem fez login pelo Google)</span>
          </div>

          {users.length === 0 ? (
            <p className="text-[#888] text-sm">Nenhum usuário encontrado</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 border border-[#2a2a2a] rounded-xl"
                >
                  {u.image ? (
                    <img src={u.image} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#7a6330] flex items-center justify-center text-[#e8c97a] text-xs font-bold">
                      {u.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f0ece4] truncate">
                      {u.name ?? "Sem nome"}
                    </p>
                    <p className="text-xs text-[#888] truncate">{u.email}</p>
                  </div>
                  {u.id === session?.user?.id ? (
                    <span className="text-xs text-[#888]">Você</span>
                  ) : (
                    <Select
                      value={u.role}
                      onValueChange={(v: string | null) => v && changeRole(u.id, v)}
                    >
                      <SelectTrigger className="w-36 bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e1e1e] border-[#2a2a2a]">
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
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6 mt-6">
          <div className="flex items-center gap-3 mb-5">
            <ShieldCog className="w-5 h-5 text-[#c9a84c]" />
            <p className="font-semibold text-[#f0ece4]">Permissões por Papel</p>
            <span className="text-xs text-[#888]">(o que Líderes e Membros podem fazer)</span>
          </div>
          <PermissionsTable />
        </div>
      )}

      {!isAdmin && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6 text-center">
          <UserCog className="w-8 h-8 text-[#888] mx-auto mb-2" />
          <p className="text-[#888] text-sm">
            Somente administradores podem gerenciar usuários e permissões.
          </p>
        </div>
      )}
    </div>
  );
}
