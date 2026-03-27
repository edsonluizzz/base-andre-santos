"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Shield, Users, UserCog, ImageIcon, Save } from "lucide-react";
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
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users").then((r) => r.json()).then(setUsers);
    }
    // Load church settings from localStorage
    try {
      const raw = localStorage.getItem("church_settings");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.name) setChurchName(s.name);
        if (s.logoUrl) setChurchLogoUrl(s.logoUrl);
      }
    } catch { /* ignore */ }
  }, [isAdmin]);

  function saveChurchSettings() {
    try {
      localStorage.setItem("church_settings", JSON.stringify({ name: churchName, logoUrl: churchLogoUrl }));
      // Dispatch storage event so sidebar can react
      window.dispatchEvent(new StorageEvent("storage", {
        key: "church_settings",
        newValue: JSON.stringify({ name: churchName, logoUrl: churchLogoUrl }),
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
                <Label className="text-[#888] text-xs">URL do Logo / Imagem</Label>
                <Input
                  value={churchLogoUrl}
                  onChange={(e) => { setChurchLogoUrl(e.target.value); setLogoPreviewError(false); }}
                  placeholder="https://exemplo.com/logo.png"
                  className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]"
                />
                <p className="text-[11px] text-[#555]">Cole a URL de uma imagem (PNG, JPG, WebP)</p>
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
                {churchLogoUrl && !logoPreviewError ? (
                  <img
                    src={churchLogoUrl}
                    alt="Logo"
                    className="w-9 h-9 rounded-lg object-cover border border-[#c9a84c33]"
                    onError={() => setLogoPreviewError(true)}
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
              {logoPreviewError && (
                <p className="text-[11px] text-[#e74c3c] mt-2">URL inválida ou imagem inacessível</p>
              )}
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
