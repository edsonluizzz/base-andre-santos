"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, X, ImageIcon } from "lucide-react";

const SHIRT_SIZES = ["PP", "P", "M", "G", "GG", "XG", "XXG"] as const;

interface Congress {
  id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  status: string;
  shirtArtUrl?: string | null;
  shirtPricing?: Record<string, number> | null;
}

interface CongressDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  congress?: Congress | null;
}

export function CongressDialog({ open, onClose, onSaved, congress }: CongressDialogProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [shirtArtUrl, setShirtArtUrl] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Record<string, string>>({});
  const [uploadingArt, setUploadingArt] = useState(false);
  const [saving, setSaving] = useState(false);
  const artInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (congress) {
      setName(congress.name);
      setDate(congress.date.slice(0, 10));
      setLocation(congress.location ?? "");
      setDescription(congress.description ?? "");
      setShirtArtUrl(congress.shirtArtUrl ?? null);
      // Convert pricing numbers to strings for inputs
      const p: Record<string, string> = {};
      if (congress.shirtPricing) {
        for (const size of SHIRT_SIZES) {
          p[size] = congress.shirtPricing[size]?.toString() ?? "";
        }
      }
      setPricing(p);
    } else {
      setName("");
      setDate("");
      setLocation("");
      setDescription("");
      setShirtArtUrl(null);
      setPricing({});
    }
  }, [congress, open]);

  async function handleArtUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    setUploadingArt(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "shirt-art");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro no upload");
      }
      const data = await res.json();
      setShirtArtUrl(data.url);
      toast.success("Arte enviada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    } finally {
      setUploadingArt(false);
    }
  }

  function buildPricingJson(): Record<string, number> | null {
    const result: Record<string, number> = {};
    for (const size of SHIRT_SIZES) {
      const val = parseFloat(pricing[size] ?? "");
      if (!isNaN(val) && val > 0) result[size] = val;
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  async function handleSave() {
    if (!name.trim() || !date) {
      toast.error("Preencha o nome e a data");
      return;
    }
    setSaving(true);
    try {
      const url = congress ? `/api/congresses/${congress.id}` : "/api/congresses";
      const method = congress ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date,
          location: location || null,
          description: description || null,
          shirtArtUrl,
          shirtPricing: buildPricingJson(),
        }),
      });
      if (res.ok) {
        toast.success(congress ? "Congresso atualizado!" : "Congresso criado!");
        onSaved();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {congress ? "Editar Congresso" : "Novo Congresso"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic info */}
          <div className="space-y-1.5">
            <Label className="text-foreground">Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Congresso UMADC 2025"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground">Data *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground">Local</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Florianópolis, SC"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informações adicionais..."
              rows={2}
            />
          </div>

          {/* Shirt art */}
          <div className="space-y-1.5">
            <Label className="text-foreground flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
              Arte da Camiseta
            </Label>
            <input
              ref={artInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleArtUpload(file);
              }}
            />
            {shirtArtUrl ? (
              <div className="relative inline-block">
                <img
                  src={shirtArtUrl}
                  alt="Arte da camiseta"
                  className="w-full max-h-40 object-contain rounded-xl border border-border bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShirtArtUrl(null)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/80 flex items-center justify-center hover:bg-destructive transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                <button
                  type="button"
                  onClick={() => artInputRef.current?.click()}
                  className="absolute bottom-2 right-2 text-[10px] bg-background/80 border border-border px-2 py-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => artInputRef.current?.click()}
                disabled={uploadingArt}
                className="w-full flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <Upload className="w-5 h-5 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">
                  {uploadingArt ? "Enviando..." : "Clique para enviar a arte"}
                </span>
                <span className="text-[11px] text-muted-foreground/50">PNG, JPG, WebP — máx. 5MB</span>
              </button>
            )}
          </div>

          {/* Per-size pricing */}
          <div className="space-y-2">
            <Label className="text-foreground">Preço por Tamanho (R$)</Label>
            <p className="text-[11px] text-muted-foreground/70">
              Deixe em branco os tamanhos sem preço definido
            </p>
            <div className="grid grid-cols-4 gap-2">
              {SHIRT_SIZES.map((size) => (
                <div key={size} className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium block text-center">{size}</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={pricing[size] ?? ""}
                    onChange={(e) => setPricing((p) => ({ ...p, [size]: e.target.value }))}
                    className="text-center text-sm h-8 px-2"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || uploadingArt}>
            {saving ? "Salvando..." : congress ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
