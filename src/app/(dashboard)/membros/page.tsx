"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Phone, LayoutGrid, List, Cake, Printer, Link2, Upload, Download, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MemberDialog } from "@/components/members/member-dialog";
import { DeleteConfirm } from "@/components/members/delete-confirm";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = {
  id: string;
  name: string;
  birthday: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
  userId: string | null;
};

type UserOption = {
  id: string;
  name: string | null;
  email: string | null;
};

export default function MembrosPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  type ImportLogRow = { linha: number; nome: string; resultado: string; detalhe: string };
  type ImportResult = { updated: number; created: number; skipped: number; log: ImportLogRow[] };
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const importFileRef = useCallback((node: HTMLInputElement | null) => { if (node) node.value = ""; }, []);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/members/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao importar"); return; }
      setImportResult(data);
      if (data.created > 0 || data.updated > 0) fetchMembers();
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setImportLoading(false);
    }
  }

  function downloadImportLog(log: ImportLogRow[]) {
    const XLSX = require("xlsx");
    const rows = [
      ["Linha", "Nome", "Resultado", "Detalhe"],
      ...log.map((r) => [r.linha, r.nome, r.resultado, r.detalhe]),
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 14 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, ws, "Log");
    XLSX.writeFile(wb, `log-importacao-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // Link dialog state
  const [linkDialogMemberId, setLinkDialogMemberId] = useState<string | null>(null);
  const [linkDialogMemberName, setLinkDialogMemberName] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/members");
    const data = await res.json();
    setMembers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered.filter((m) => m.status === "ACTIVE");
  const inactive = filtered.filter((m) => m.status === "INACTIVE");

  async function handleDelete(id: string) {
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Participante removido");
      fetchMembers();
    } else {
      toast.error("Erro ao remover");
    }
    setDeleteId(null);
  }

  function openAdd() {
    setEditMember(null);
    setDialogOpen(true);
  }

  function openEdit(m: Member) {
    setEditMember(m);
    setDialogOpen(true);
  }

  async function openLinkDialog(member: Member) {
    setLinkDialogMemberId(member.id);
    setLinkDialogMemberName(member.name);
    setSelectedUserId(member.userId ?? "");
    if (users.length === 0) {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    }
  }

  async function handleLink() {
    if (!linkDialogMemberId) return;
    setLinkLoading(true);
    const res = await fetch(`/api/members/${linkDialogMemberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId || null }),
    });
    setLinkLoading(false);
    if (res.ok) {
      toast.success(selectedUserId ? "Conta vinculada com sucesso" : "Vínculo removido");
      setLinkDialogMemberId(null);
      fetchMembers();
    } else {
      toast.error("Erro ao salvar vínculo");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Participantes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {members.filter((m) => m.status === "ACTIVE").length} ativos ·{" "}
            {members.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="hidden-print"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <div className="flex glass-card border border-white/[0.07] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Visão em cards"
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Visão em lista"
              aria-pressed={viewMode === "list"}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {isAdmin && (
            <a href="/api/members/export" download>
              <Button variant="outline" type="button">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </a>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={() => { setImportResult(null); setImportOpen(true); }}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
          )}
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <MemberList
            title="Ativos"
            members={active}
            viewMode={viewMode}
            onEdit={openEdit}
            onDelete={setDeleteId}
            onLink={isAdmin ? openLinkDialog : undefined}
          />
          {inactive.length > 0 && (
            <MemberList
              title="Inativos"
              members={inactive}
              viewMode={viewMode}
              onEdit={openEdit}
              onDelete={setDeleteId}
              onLink={isAdmin ? openLinkDialog : undefined}
            />
          )}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-16">
              Nenhum resultado encontrado
            </p>
          )}
        </>
      )}

      <MemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editMember}
        onSuccess={() => { fetchMembers(); setDialogOpen(false); }}
      />

      <DeleteConfirm
        open={!!deleteId}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Link Account Dialog */}
      <Dialog
        open={!!linkDialogMemberId}
        onOpenChange={(open) => !open && setLinkDialogMemberId(null)}
      >
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Vincular Conta Google</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione o usuário Google para vincular a{" "}
            <span className="text-foreground font-medium">{linkDialogMemberName}</span>.
          </p>
          <Select
            value={selectedUserId}
            onValueChange={(v: string | null) => setSelectedUserId(v ?? "")}
          >
            <SelectTrigger className="w-full bg-secondary border-border text-foreground">
              <SelectValue placeholder="Selecionar usuário..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name ?? u.email ?? u.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUserId && (
            <button
              className="text-xs text-destructive hover:underline text-left"
              onClick={() => setSelectedUserId("")}
            >
              Remover vínculo
            </button>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-border"
              onClick={() => setLinkDialogMemberId(null)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={linkLoading}
              onClick={handleLink}
            >
              {linkLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação */}
      <Dialog open={importOpen} onOpenChange={(o) => { if (!importLoading) setImportOpen(o); }}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Atualizar via Planilha</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Download membros atuais */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <div>
                <p className="text-sm font-medium text-foreground">1. Baixe a planilha atual</p>
                <p className="text-xs text-muted-foreground mt-0.5">Edite os cadastros e adicione novos</p>
              </div>
              <a
                href="/api/members/export"
                download
                className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar
              </a>
            </div>

            {/* Upload */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">2. Envie a planilha atualizada</p>
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Clique para selecionar o arquivo</span>
                <span className="text-xs text-muted-foreground/50">.xlsx, .xls ou .csv</span>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImport}
                  disabled={importLoading}
                />
              </label>
              {importLoading && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Processando...</p>
              )}
            </div>

            {/* Resultado */}
            {importResult && (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2">
                {importResult.updated > 0 && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{importResult.updated} membro{importResult.updated !== 1 ? "s" : ""} atualizado{importResult.updated !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {importResult.created > 0 && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{importResult.created} membro{importResult.created !== 1 ? "s" : ""} criado{importResult.created !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {importResult.skipped > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{importResult.skipped} ignorado{importResult.skipped !== 1 ? "s" : ""} (nome duplicado)</span>
                  </div>
                )}
                {importResult.log.some((r) => r.resultado === "ERRO" || r.resultado === "BLOQUEADO") && (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{importResult.log.filter((r) => r.resultado === "ERRO" || r.resultado === "BLOQUEADO").length} linha(s) com problema</span>
                  </div>
                )}
                {importResult.log.length > 0 && (
                  <button
                    onClick={() => downloadImportLog(importResult.log)}
                    className="w-full flex items-center justify-center gap-2 mt-1 text-xs font-medium text-primary hover:text-primary/80 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar log completo (.xlsx)
                  </button>
                )}
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setImportOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberList({
  title,
  members,
  viewMode,
  onEdit,
  onDelete,
  onLink,
}: {
  title: string;
  members: Member[];
  viewMode: "cards" | "list";
  onEdit: (m: Member) => void;
  onDelete: (id: string) => void;
  onLink?: (m: Member) => void;
}) {
  if (members.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-foreground font-bold text-lg">{title}</span>
        <span className="bg-primary/10 text-accent-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
          {members.length}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {members.map((m, i) => (
            <div
              key={m.id}
              className="animate-in fade-in fill-mode-both"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <MemberCard
                member={m}
                onEdit={() => onEdit(m)}
                onDelete={() => onDelete(m.id)}
                onLink={onLink ? () => onLink(m) : undefined}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="text-left px-4 py-2.5 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium">Nome</th>
                <th className="text-left px-4 py-2.5 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden sm:table-cell">Aniversário</th>
                <th className="text-left px-4 py-2.5 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden md:table-cell">Telefone</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const whatsappUrl = m.phone
                  ? `https://wa.me/55${m.phone.replace(/\D/g, "")}`
                  : null;
                return (
                  <tr key={m.id} className={`group border-b border-white/[0.04] last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-4 py-2.5">
                      <p className="text-foreground font-medium">{m.name}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {m.birthday ? (
                        <span className="text-accent-foreground text-xs flex items-center gap-1">
                          <Cake className="w-3 h-3" /> {m.birthday}
                        </span>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                      {m.phone ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {whatsappUrl && (
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                            aria-label={`Abrir WhatsApp de ${m.name}`}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {onLink && (
                          <button onClick={() => onLink(m)}
                            className={`p-1.5 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer ${m.userId ? "text-emerald-400" : "text-muted-foreground hover:text-primary"}`}
                            aria-label={m.userId ? `Alterar vínculo de ${m.name}` : `Vincular conta de ${m.name}`}>
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => onEdit(m)}
                          aria-label={`Editar ${m.name}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(m.id)}
                          aria-label={`Remover ${m.name}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member,
  onEdit,
  onDelete,
  onLink,
}: {
  member: Member;
  onEdit: () => void;
  onDelete: () => void;
  onLink?: () => void;
}) {
  const initials = member.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const whatsappUrl = member.phone
    ? `https://wa.me/55${member.phone.replace(/\D/g, "")}`
    : null;

  return (
    <div className="glass-card p-4 group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground text-sm truncate">
              {member.name}
            </p>
            {member.status === "INACTIVE" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Inativo
              </Badge>
            )}
          </div>

          {member.birthday && (
            <p className="text-accent-foreground text-xs mt-0.5 flex items-center gap-1">
              <Cake className="w-3 h-3" /> {member.birthday}
            </p>
          )}
          {member.phone && (
            <p className="text-muted-foreground text-xs mt-0.5">
              {member.phone}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir WhatsApp de ${member.name}`}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
          {onLink && (
            <button
              onClick={onLink}
              aria-label={member.userId ? `Alterar vínculo de ${member.name}` : `Vincular conta de ${member.name}`}
              className={`p-1.5 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer ${member.userId ? "text-emerald-400" : "text-muted-foreground hover:text-primary"}`}
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onEdit}
            aria-label={`Editar ${member.name}`}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Remover ${member.name}`}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
