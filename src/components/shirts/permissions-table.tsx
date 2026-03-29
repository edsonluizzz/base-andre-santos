"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, RotateCcw, ShieldCheck } from "lucide-react";

const MODULES = [
  { key: "MEMBERS",    label: "Membros" },
  { key: "ATTENDANCE", label: "Chamada" },
  { key: "FINANCIAL",  label: "Financeiro" },
  { key: "REPORTS",    label: "Relatórios" },
  { key: "EVENTS",     label: "Eventos" },
  { key: "BIRTHDAYS",  label: "Aniversários" },
  { key: "SHIRTS",     label: "Camisetas" },
  { key: "SETTINGS",   label: "Configurações" },
  { key: "USERS",      label: "Usuários" },
];

const ACTIONS = [
  { key: "VIEW",   label: "Ver" },
  { key: "CREATE", label: "Criar" },
  { key: "EDIT",   label: "Editar" },
  { key: "DELETE", label: "Deletar" },
  { key: "EXPORT", label: "Exportar" },
];

const VALID_COMBOS: Record<string, string[]> = {
  MEMBERS:    ["VIEW", "CREATE", "EDIT", "DELETE"],
  ATTENDANCE: ["VIEW", "CREATE", "EDIT", "DELETE"],
  FINANCIAL:  ["VIEW", "CREATE", "EDIT", "DELETE"],
  REPORTS:    ["VIEW", "EXPORT"],
  EVENTS:     ["VIEW", "CREATE", "EDIT", "DELETE"],
  BIRTHDAYS:  ["VIEW"],
  SHIRTS:     ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"],
  SETTINGS:   ["VIEW", "EDIT"],
  USERS:      ["VIEW", "EDIT"],
};

type PermMap = Record<string, boolean>;

export function PermissionsTable() {
  const [activeRole, setActiveRole] = useState<"LEADER" | "MEMBER">("LEADER");
  const [perms, setPerms] = useState<PermMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadPerms() {
    try {
      const res = await fetch("/api/settings/permissions");
      const data: Array<{ role: string; module: string; action: string; granted: boolean }> =
        await res.json();
      const map: PermMap = {};
      for (const p of data) map[`${p.role}:${p.module}:${p.action}`] = p.granted;
      setPerms(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPerms(); }, []);

  function toggle(module: string, action: string) {
    const key = `${activeRole}:${module}:${action}`;
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function isGranted(module: string, action: string) {
    return perms[`${activeRole}:${module}:${action}`] ?? false;
  }

  function isValid(module: string, action: string) {
    return VALID_COMBOS[module]?.includes(action) ?? false;
  }

  async function save() {
    setSaving(true);
    const body = Object.entries(perms).map(([key, granted]) => {
      const [role, module, action] = key.split(":");
      return { role, module, action, granted };
    });
    try {
      const res = await fetch("/api/settings/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) toast.success("Permissões salvas com sucesso");
      else toast.error("Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    if (!confirm("Redefinir todas as permissões para o padrão? Esta ação não pode ser desfeita."))
      return;
    setSaving(true);
    try {
      await fetch("/api/settings/permissions", { method: "DELETE" });
      await loadPerms();
      toast.success("Permissões redefinidas para o padrão");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Note about ADMIN */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-accent-foreground">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Administradores sempre têm acesso total a todos os módulos, independente das configurações abaixo.</span>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2">
        {(["LEADER", "MEMBER"] as const).map((role) => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeRole === role
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {role === "LEADER" ? "Líder" : "Membro"}
          </button>
        ))}
      </div>

      {/* Permissions grid */}
      {loading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
          Carregando...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-40">
                  Módulo
                </th>
                {ACTIONS.map((a) => (
                  <th key={a.key} className="text-center px-3 py-3 font-medium text-muted-foreground min-w-[80px]">
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod, idx) => (
                <tr
                  key={mod.key}
                  className={`border-b border-border last:border-0 ${
                    idx % 2 === 0 ? "bg-card" : "bg-muted/10"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{mod.label}</td>
                  {ACTIONS.map((act) => (
                    <td key={act.key} className="text-center px-3 py-3">
                      {isValid(mod.key, act.key) ? (
                        <button
                          onClick={() => toggle(mod.key, act.key)}
                          className={`w-9 h-5 rounded-full transition-colors relative ${
                            isGranted(mod.key, act.key)
                              ? "bg-primary"
                              : "bg-muted/40 border border-border"
                          }`}
                          title={isGranted(mod.key, act.key) ? "Permitido — clique para bloquear" : "Bloqueado — clique para permitir"}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                              isGranted(mod.key, act.key) ? "left-[18px]" : "left-0.5"
                            }`}
                          />
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30 select-none">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 justify-between pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={resetDefaults}
          disabled={saving}
          className="text-muted-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Redefinir padrões
        </Button>
        <Button size="sm" onClick={save} disabled={saving || loading}>
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {saving ? "Salvando..." : "Salvar permissões"}
        </Button>
      </div>
    </div>
  );
}
