"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MemberDialog } from "@/components/members/member-dialog";
import { DeleteConfirm } from "@/components/members/delete-confirm";

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
            className="text-2xl lg:text-3xl font-bold text-[#e8c97a]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Participantes
          </h1>
          <p className="text-[#888] text-sm mt-1">
            {members.filter((m) => m.status === "ACTIVE").length} ativos ·{" "}
            {members.length} total
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#c9a84c] hover:bg-[#e8c97a] text-black font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#1e1e1e] border-[#2a2a2a] text-[#f0ece4] placeholder:text-[#888] focus-visible:ring-[#7a6330]"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#888]">Carregando...</div>
      ) : (
        <>
          <MemberList
            title="Ativos"
            members={active}
            onEdit={openEdit}
            onDelete={setDeleteId}
          />
          {inactive.length > 0 && (
            <MemberList
              title="Inativos"
              members={inactive}
              onEdit={openEdit}
              onDelete={setDeleteId}
            />
          )}
          {filtered.length === 0 && (
            <p className="text-center text-[#888] py-16">
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
  onEdit,
  onDelete,
}: {
  title: string;
  members: Member[];
  onEdit: (m: Member) => void;
  onDelete: (id: string) => void;
}) {
  if (members.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-[#e8c97a] font-bold text-lg"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </span>
        <span className="bg-[#7a6330] text-[#e8c97a] text-xs font-semibold px-2 py-0.5 rounded-full">
          {members.length}
        </span>
        <div className="flex-1 h-px bg-[#2a2a2a]" />
      </div>

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
    <div className="bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#7a6330] rounded-xl p-4 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#7a6330] flex items-center justify-center text-[#e8c97a] font-bold text-sm flex-shrink-0"
          style={{ fontFamily: "var(--font-heading)" }}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[#f0ece4] text-sm truncate">
              {member.name}
            </p>
            {member.status === "INACTIVE" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Inativo
              </Badge>
            )}
          </div>

          {member.birthday && (
            <p className="text-[#c9a84c] text-xs mt-0.5">🎂 {member.birthday}</p>
          )}
          {member.phone && (
            <p className="text-[#888] text-xs mt-0.5">📱 {member.phone}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-[#888] hover:text-[#2ecc71] hover:bg-[#2ecc7111] transition-colors"
              title="Abrir WhatsApp"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-[#888] hover:text-[#c9a84c] hover:bg-[#c9a84c11] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-[#888] hover:text-[#e74c3c] hover:bg-[#e74c3c11] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
