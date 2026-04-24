"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Plus, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_LABEL: Record<string, string> = { REGIONAL: "Regional", MUNICIPAL: "Municipal", BAIRRO: "Bairro" };
const TYPE_COLOR: Record<string, string> = {
  REGIONAL: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  MUNICIPAL: "bg-green-500/15 text-green-400 border-green-500/30",
  BAIRRO: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

type Zone = { id: string; name: string; type: string; color?: string; parent?: { id: string; name: string }; children: { id: string; name: string; type: string }[]; _count: { collaborators: number } };

export default function ZonasPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form, setForm] = useState({ name: "", type: "MUNICIPAL", parentId: "", color: "" });
  const [saving, setSaving] = useState(false);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/zones");
    if (res.ok) setZones(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", type: "MUNICIPAL", parentId: "", color: "" });
    setDialogOpen(true);
  }

  function openEdit(z: Zone) {
    setEditing(z);
    setForm({ name: z.name, type: z.type, parentId: z.parent?.id ?? "", color: z.color ?? "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/zones/${editing.id}` : "/api/zones";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, type: form.type, parentId: form.parentId || null, color: form.color || null }) });
    setSaving(false);
    if (res.ok) { setDialogOpen(false); fetchZones(); toast.success(editing ? "Zona atualizada" : "Zona criada"); }
    else toast.error("Erro ao salvar");
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir zona "${name}"?`)) return;
    const res = await fetch(`/api/zones/${id}`, { method: "DELETE" });
    if (res.ok) { fetchZones(); toast.success("Zona removida"); }
    else toast.error("Erro ao excluir");
  }

  const rootZones = zones.filter((z) => !z.parent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Zonas</h1>
          <p className="text-sm text-muted-foreground mt-1">{zones.length} zonas cadastradas</p>
        </div>
        <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Nova Zona
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : zones.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma zona cadastrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rootZones.map((z) => (
            <div key={z.id} className="glass-card rounded-xl border border-white/[0.08]">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TYPE_COLOR[z.type]}`}>{TYPE_LABEL[z.type]}</span>
                  <span className="font-semibold text-foreground">{z.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" /> {z._count.collaborators}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(z)} className="h-7 text-xs">Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(z.id, z.name)} className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">Excluir</Button>
                </div>
              </div>
              {z.children.length > 0 && (
                <div className="border-t border-white/[0.06] px-4 py-2 space-y-1">
                  {z.children.map((child) => {
                    const full = zones.find((zz) => zz.id === child.id);
                    return (
                      <div key={child.id} className="flex items-center gap-2 py-1 pl-4">
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TYPE_COLOR[child.type]}`}>{TYPE_LABEL[child.type]}</span>
                        <span className="text-sm text-foreground">{child.name}</span>
                        {full && <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{full._count.collaborators}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {/* Zonas sem parent mas que têm parent no dado */}
          {zones.filter((z) => z.parent && !rootZones.find((r) => r.id === z.parent?.id)).map((z) => (
            <div key={z.id} className="glass-card rounded-xl p-4 border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TYPE_COLOR[z.type]}`}>{TYPE_LABEL[z.type]}</span>
                <span className="font-semibold text-foreground">{z.name}</span>
                {z.parent && <span className="text-xs text-muted-foreground">em {z.parent.name}</span>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(z)} className="h-7 text-xs">Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(z.id, z.name)} className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">Excluir</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Zona" : "Nova Zona"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Curitiba, Região Metropolitana" /></div>
            <div><Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGIONAL">Regional</SelectItem>
                  <SelectItem value="MUNICIPAL">Municipal</SelectItem>
                  <SelectItem value="BAIRRO">Bairro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Zona Pai (opcional)</Label>
              <Select value={form.parentId} onValueChange={(v) => setForm((f) => ({ ...f, parentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {zones.filter((z) => z.id !== editing?.id).map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
