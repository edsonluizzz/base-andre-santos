"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Phone, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MemberDialog } from "@/components/members/member-dialog";
import { DeleteConfirm } from "@/components/members/delete-confirm";
import { Skeleton } from "@/components/ui/skeleton";

type Member = {
  id: string;
  name: string;
  birthday: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
};

export default function MembrosPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl lg:text-3xl font-bold text-gold-light"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Participantes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {members.filter((m) => m.status === "ACTIVE").length} ativos ·{" "}
            {members.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-card border border-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "cards" ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground"}`}
              title="Visão em cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground"}`}
              title="Visão em lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={openAdd}
            className="bg-gold hover:bg-gold-light text-black font-semibold"
          >
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
          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-gold-muted"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
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
          />
          {inactive.length > 0 && (
            <MemberList
              title="Inativos"
              members={inactive}
              viewMode={viewMode}
              onEdit={openEdit}
              onDelete={setDeleteId}
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
    </div>
  );
}

function MemberList({
  title,
  members,
  viewMode,
  onEdit,
  onDelete,
}: {
  title: string;
  members: Member[];
  viewMode: "cards" | "list";
  onEdit: (m: Member) => void;
  onDelete: (id: string) => void;
}) {
  if (members.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-gold-light font-bold text-lg"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </span>
        <span className="bg-gold-muted text-gold-light text-xs font-semibold px-2 py-0.5 rounded-full">
          {members.length}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              onEdit={() => onEdit(m)}
              onDelete={() => onDelete(m.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
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
                  <tr key={m.id} className={`group ${i % 2 === 0 ? "bg-card" : ""}`}>
                    <td className="px-4 py-2.5">
                      <p className="text-foreground font-medium">{m.name}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {m.birthday ? (
                        <span className="text-gold text-xs">🎂 {m.birthday}</span>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                      {m.phone ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {whatsappUrl && (
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/5 transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => onEdit(m)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/5 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(m.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
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
}: {
  member: Member;
  onEdit: () => void;
  onDelete: () => void;
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
    <div className="bg-card border border-border hover:border-gold-muted rounded-xl p-4 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gold-muted flex items-center justify-center text-gold-light font-bold text-sm flex-shrink-0"
          style={{ fontFamily: "var(--font-heading)" }}>
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
            <p className="text-gold text-xs mt-0.5">🎂 {member.birthday}</p>
          )}
          {member.phone && (
            <p className="text-muted-foreground text-xs mt-0.5">📱 {member.phone}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/5 transition-colors"
              title="Abrir WhatsApp"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
