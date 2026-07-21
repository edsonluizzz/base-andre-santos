"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Church, Camera, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type MyAssignment = {
  id: string;
  status: "PENDENTE" | "NAO_FOI_POSSIVEL";
  church: { id: string; name: string; regional: string | null };
};

export default function MinhasIgrejasPage() {
  const [assignments, setAssignments] = useState<MyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/church-assignments/mine");
    if (res.ok) {
      const j = await res.json();
      setAssignments(j.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCamera(assignmentId: string) {
    setActiveId(assignmentId);
    fileInputRef.current?.click();
  }

  async function handlePhoto(file: File) {
    if (!activeId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/churches/upload-photo", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { toast.error(uploadData.error ?? "Erro ao enviar foto"); return; }

      const patchRes = await fetch(`/api/church-assignments/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENTREGUE", photoUrl: uploadData.url }),
      });
      if (!patchRes.ok) { const d = await patchRes.json(); toast.error(d.error ?? "Erro ao marcar entregue"); return; }

      toast.success("Entrega registrada!");
      setAssignments((prev) => prev.filter((a) => a.id !== activeId));
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setUploading(false);
      setActiveId(null);
    }
  }

  async function handleNotPossible(assignmentId: string) {
    const res = await fetch(`/api/church-assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "NAO_FOI_POSSIVEL", notes: notes.trim() || undefined }),
    });
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Erro ao registrar"); return; }
    toast.success("Registrado. Você pode tentar de novo depois.");
    setNotesFor(null);
    setNotes("");
    load();
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Church className="w-6 h-6 text-primary" />
        <h1 className="text-xl lg:text-2xl font-bold gradient-title">Minhas Igrejas</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">Congregações atribuídas a você para entrega de material.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]); }}
      />

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : assignments.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhuma igreja pendente. 🎉</p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="glass-card rounded-2xl p-4 space-y-3 border border-white/[0.08]">
              <div>
                <p className="font-semibold text-foreground">{a.church.name}</p>
                {a.church.regional && <p className="text-xs text-muted-foreground">{a.church.regional}</p>}
                {a.status === "NAO_FOI_POSSIVEL" && (
                  <p className="text-xs text-amber-400 mt-1">Tentativa anterior não deu certo — pode tentar de novo.</p>
                )}
              </div>

              {notesFor === a.id ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Motivo (opcional): igreja fechada, ninguém atendeu..."
                    className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setNotesFor(null); setNotes(""); }}
                      className="flex-1 py-2 rounded-lg text-sm text-muted-foreground border border-border"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleNotPossible(a.id)}
                      className="flex-1 py-2 rounded-lg text-sm bg-destructive/10 text-destructive border border-destructive/25"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => openCamera(a.id)}
                    disabled={uploading && activeId === a.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
                  >
                    {uploading && activeId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    Marcar entregue
                  </button>
                  <button
                    onClick={() => setNotesFor(a.id)}
                    className="px-3 py-2.5 rounded-xl text-sm text-muted-foreground border border-border"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
