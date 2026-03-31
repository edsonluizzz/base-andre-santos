"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Shirt,
  Plus,
  Package,
  DollarSign,
  CheckCircle2,
  Clock,
  ChevronDown,
  Search,
  Copy,
  Download,
  Pencil,
  Trash2,
  Upload,
  FileCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CongressDialog } from "@/components/shirts/congress-dialog";
import { OrderDialog } from "@/components/shirts/order-dialog";

interface Congress {
  id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  status: "OPEN" | "CLOSED" | "FINISHED";
  shirtArtUrl?: string | null;
  shirtPricing?: Record<string, number> | null;
  _count?: { shirtOrders: number };
}

interface ShirtOrder {
  id: string;
  memberId: string;
  size: string;
  quantity: number;
  totalAmount: number;
  paidAmount: number;
  status: "PENDING" | "PAID" | "PRODUCTION" | "READY" | "DELIVERED" | "CANCELLED";
  paymentMethod: string | null;
  notes: string | null;
  paymentProofUrl?: string | null;
  paymentProofUploadedAt?: string | null;
  member: { id: string; name: string };
}

interface Summary {
  totalOrders: number;
  activeOrders: number;
  bySize: { size: string; quantity: number }[];
  byStatus: Record<string, number>;
  financial: { totalExpected: number; totalPaid: number; totalPending: number };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  PRODUCTION: "Produção",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/20",
  PAID: "bg-success/10 text-success border-success/20",
  PRODUCTION: "bg-primary/10 text-primary border-primary/20",
  READY: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DELIVERED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
};

const CONGRESS_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-success/10 text-success border-success/20",
  CLOSED: "bg-warning/10 text-warning border-warning/20",
  FINISHED: "bg-muted text-muted-foreground border-border",
};

const CONGRESS_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberto",
  CLOSED: "Encerrado",
  FINISHED: "Finalizado",
};

export default function CamisetasPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [congresses, setCongresses] = useState<Congress[]>([]);
  const [selectedCongress, setSelectedCongress] = useState<Congress | null>(null);
  const [orders, setOrders] = useState<ShirtOrder[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sizeFilter, setSizeFilter] = useState("ALL");
  const [congressDialogOpen, setCongressDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ShirtOrder | null>(null);
  const [editingCongress, setEditingCongress] = useState<Congress | null>(null);
  const [showSizeReport, setShowSizeReport] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";
  const isLeaderOrAdmin = ["ADMIN", "LEADER"].includes(session?.user?.role ?? "");
  const isMember = session?.user?.role === "MEMBER";
  const [uploadingProofFor, setUploadingProofFor] = useState<string | null>(null);

  async function uploadProof(orderId: string, file: File) {
    if (!selectedCongress) return;
    setUploadingProofFor(orderId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "payment-proofs");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Erro no upload");
      const { url } = await uploadRes.json();

      const patchRes = await fetch(
        `/api/congresses/${selectedCongress.id}/orders/${orderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentProofUrl: url }),
        }
      );
      if (patchRes.ok) {
        toast.success("Comprovante enviado!");
        fetchOrdersAndSummary(selectedCongress.id);
      } else {
        toast.error("Erro ao salvar comprovante");
      }
    } catch {
      toast.error("Erro ao enviar comprovante");
    } finally {
      setUploadingProofFor(null);
    }
  }

  const fetchCongresses = useCallback(async () => {
    const res = await fetch("/api/congresses");
    if (res.ok) {
      const data = await res.json();
      setCongresses(data);
      if (data.length > 0 && !selectedCongress) {
        setSelectedCongress(data[0]);
      }
    }
    setLoading(false);
  }, [selectedCongress]);

  const fetchOrdersAndSummary = useCallback(async (congressId: string) => {
    const [ordersRes, summaryRes] = await Promise.all([
      fetch(`/api/congresses/${congressId}/orders`),
      fetch(`/api/congresses/${congressId}/summary`),
    ]);
    if (ordersRes.ok) setOrders(await ordersRes.json());
    if (summaryRes.ok) setSummary(await summaryRes.json());
  }, []);

  useEffect(() => {
    fetchCongresses();
  }, []);

  useEffect(() => {
    if (selectedCongress) {
      fetchOrdersAndSummary(selectedCongress.id);
    }
  }, [selectedCongress]);

  const filteredOrders = orders.filter((o) => {
    const matchSearch = o.member.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchSize = sizeFilter === "ALL" || o.size === sizeFilter;
    return matchSearch && matchStatus && matchSize;
  });

  async function markOrderStatus(orderId: string, status: string) {
    const res = await fetch(
      `/api/congresses/${selectedCongress!.id}/orders/${orderId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    if (res.ok) {
      toast.success(
        status === "PAID" ? "Pagamento registrado!" : "Status atualizado!"
      );
      fetchOrdersAndSummary(selectedCongress!.id);
    } else {
      toast.error("Erro ao atualizar status");
    }
  }

  async function deleteOrder(orderId: string) {
    const res = await fetch(
      `/api/congresses/${selectedCongress!.id}/orders/${orderId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success("Pedido removido");
      fetchOrdersAndSummary(selectedCongress!.id);
    } else {
      toast.error("Erro ao remover pedido");
    }
  }

  async function updateCongressStatus(status: string) {
    const res = await fetch(`/api/congresses/${selectedCongress!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success("Status do congresso atualizado");
      fetchCongresses();
      const updated = { ...selectedCongress!, status: status as Congress["status"] };
      setSelectedCongress(updated);
    }
  }

  function copySizeReport() {
    if (!summary) return;
    const lines = summary.bySize.map((s) => `${s.size}: ${s.quantity}`);
    lines.push("---");
    lines.push(`Total: ${summary.bySize.reduce((a, s) => a + s.quantity, 0)}`);
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Relatório copiado!");
  }

  function exportCSV() {
    if (!orders.length) return;
    const header = "Nome,Tamanho,Quantidade,Valor Total,Pago,Status";
    const rows = orders
      .filter((o) => o.status !== "CANCELLED")
      .map(
        (o) =>
          `${o.member.name},${o.size},${o.quantity},${Number(o.totalAmount).toFixed(2)},${Number(o.paidAmount).toFixed(2)},${STATUS_LABELS[o.status]}`
      );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `camisetas-${selectedCongress?.name ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Encomendas de Camisetas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie pedidos de camisetas para congressos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={() => {
                setEditingCongress(null);
                setCongressDialogOpen(true);
              }}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Congresso
            </Button>
          )}
          {selectedCongress && (
            <Button
              onClick={() => {
                setEditingOrder(null);
                setOrderDialogOpen(true);
              }}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Congress selector */}
      {congresses.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="Nenhum congresso cadastrado"
          description="Crie um congresso para começar a registrar pedidos de camisetas."
          actionLabel={isAdmin ? "Criar Congresso" : undefined}
          onAction={isAdmin ? () => setCongressDialogOpen(true) : undefined}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {congresses.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCongress(c)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                  selectedCongress?.id === c.id
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
                )}
              >
                {c.name}
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full border",
                    CONGRESS_STATUS_COLORS[c.status]
                  )}
                >
                  {CONGRESS_STATUS_LABELS[c.status]}
                </span>
              </button>
            ))}
          </div>

          {selectedCongress && (
            <>
              {/* Congress actions (admin only) */}
              {isAdmin && (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedCongress.status === "OPEN" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCongressStatus("CLOSED")}
                    >
                      Encerrar Pedidos
                    </Button>
                  )}
                  {selectedCongress.status === "CLOSED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCongressStatus("FINISHED")}
                    >
                      Marcar como Finalizado
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCongress(selectedCongress);
                      setCongressDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Editar
                  </Button>
                </div>
              )}

              {/* Congress shirt art preview */}
              {selectedCongress.shirtArtUrl && (
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-4 shadow-sm">
                  <div className="w-full sm:w-48 bg-black/30 rounded-lg border border-border/50 p-2 flex items-center justify-center shrink-0">
                    <img
                      src={selectedCongress.shirtArtUrl}
                      alt="Arte da camiseta"
                      className="max-w-full max-h-48 object-contain drop-shadow-lg"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                    <h3 className="text-xl font-bold text-foreground">Arte Oficial Selecionada</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-4 leading-relaxed">
                      Esta é a estampa aprovada para as camisetas do {selectedCongress.name}. Veja como ficará o modelo final antes de confirmar seu pedido.
                    </p>
                    {isMember && !isLeaderOrAdmin && orders.length === 0 && (
                      <Button onClick={() => setOrderDialogOpen(true)} size="sm" variant="default" className="shadow-md">
                        Efetuar Meu Pedido
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* KPI Cards */}
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Total de Pedidos"
                    value={summary.activeOrders}
                    icon={Package}
                    description={`${summary.byStatus["CANCELLED"] ?? 0} cancelados`}
                    variant="default"
                  />
                  {isLeaderOrAdmin && (
                    <>
                      <StatCard
                        title="Arrecadado"
                        value={`R$ ${summary.financial.totalPaid.toFixed(2)}`}
                        icon={DollarSign}
                        description={`de R$ ${summary.financial.totalExpected.toFixed(2)} esperados`}
                        variant="success"
                      />
                      <StatCard
                        title="Pendente"
                        value={`R$ ${summary.financial.totalPending.toFixed(2)}`}
                        icon={Clock}
                        description={`${summary.byStatus["PENDING"] ?? 0} pedidos sem pagamento`}
                        variant="cta"
                      />
                    </>
                  )}
                  <StatCard
                    title="A Entregar"
                    value={(summary.byStatus["READY"] ?? 0) + (summary.byStatus["PRODUCTION"] ?? 0)}
                    icon={CheckCircle2}
                    description={`${summary.byStatus["DELIVERED"] ?? 0} já entregues`}
                    variant="purple"
                  />
                </div>
              )}

              {/* Size summary + report */}
              {summary && summary.bySize.length > 0 && isLeaderOrAdmin && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Distribuição por Tamanho
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowSizeReport(!showSizeReport)}
                      >
                        Relatório para Gráfica
                        <ChevronDown
                          className={cn(
                            "w-3.5 h-3.5 ml-1.5 transition-transform",
                            showSizeReport && "rotate-180"
                          )}
                        />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {summary.bySize.map((s) => (
                      <div
                        key={s.size}
                        className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2"
                      >
                        <span className="text-xs font-bold text-foreground">{s.size}</span>
                        <span className="text-lg font-bold text-primary">{s.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {showSizeReport && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-3">
                        Copie este relatório para enviar à gráfica:
                      </p>
                      <div className="bg-secondary/30 rounded-lg p-3 font-mono text-sm text-foreground space-y-1">
                        {summary.bySize.map((s) => (
                          <div key={s.size} className="flex justify-between">
                            <span>{s.size}</span>
                            <span className="font-bold">{s.quantity}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-border pt-1 mt-1">
                          <span>Total</span>
                          <span className="font-bold">
                            {summary.bySize.reduce((a, s) => a + s.quantity, 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={copySizeReport}>
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copiar
                        </Button>
                        <Button size="sm" variant="outline" onClick={exportCSV}>
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Exportar CSV
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar membro..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="ALL">Todos os status</option>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="ALL">Todos os tamanhos</option>
                  {["PP", "P", "M", "G", "GG", "XG", "XXG"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Orders table */}
              {filteredOrders.length === 0 ? (
                <EmptyState
                  icon={Shirt}
                  title="Nenhum pedido encontrado"
                  description={
                    orders.length === 0
                      ? "Comece registrando o pedido de camiseta de um membro."
                      : "Nenhum pedido corresponde ao filtro atual."
                  }
                  actionLabel={orders.length === 0 ? "Adicionar Pedido" : undefined}
                  onAction={
                    orders.length === 0
                      ? () => setOrderDialogOpen(true)
                      : undefined
                  }
                />
              ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Membro
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Tamanho
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Qtd
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Valor
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Pago
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Status
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                            Comprovante
                          </th>
                          {isLeaderOrAdmin && (
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Ações
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr
                            key={order.id}
                            className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">
                              {order.member.name}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-primary">{order.size}</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{order.quantity}</td>
                            <td className="px-4 py-3 text-foreground">
                              R$ {Number(order.totalAmount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  Number(order.paidAmount) >= Number(order.totalAmount)
                                    ? "text-success"
                                    : Number(order.paidAmount) > 0
                                    ? "text-warning"
                                    : "text-muted-foreground"
                                )}
                              >
                                R$ {Number(order.paidAmount).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "text-xs font-medium px-2 py-1 rounded-full border",
                                  STATUS_COLORS[order.status]
                                )}
                              >
                                {STATUS_LABELS[order.status]}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {order.paymentProofUrl ? (
                                <a
                                  href={order.paymentProofUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-success hover:text-success/80 transition-colors"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  Ver
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (isMember || isLeaderOrAdmin) ? (
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                                  <Upload className="w-3.5 h-3.5" />
                                  {uploadingProofFor === order.id ? "Enviando..." : "Enviar"}
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    disabled={uploadingProofFor === order.id}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadProof(order.id, file);
                                    }}
                                  />
                                </label>
                              ) : (
                                <span className="text-muted-foreground/40 text-xs">—</span>
                              )}
                            </td>
                            {isLeaderOrAdmin && (
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  {order.status === "PENDING" && (
                                    <button
                                      onClick={() => markOrderStatus(order.id, "PAID")}
                                      className="text-xs px-2 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                                    >
                                      Marcar Pago
                                    </button>
                                  )}
                                  {order.status === "READY" && (
                                    <button
                                      onClick={() => markOrderStatus(order.id, "DELIVERED")}
                                      className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                    >
                                      Entregar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEditingOrder(order);
                                      setOrderDialogOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      onClick={() => deleteOrder(order.id)}
                                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
                    {filteredOrders.length} de {orders.length} pedidos
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Dialogs */}
      <CongressDialog
        open={congressDialogOpen}
        onClose={() => { setCongressDialogOpen(false); setEditingCongress(null); }}
        onSaved={() => { fetchCongresses(); setCongressDialogOpen(false); setEditingCongress(null); }}
        congress={editingCongress}
      />

      {selectedCongress && (
        <OrderDialog
          open={orderDialogOpen}
          onClose={() => { setOrderDialogOpen(false); setEditingOrder(null); }}
          onSaved={() => {
            fetchOrdersAndSummary(selectedCongress.id);
            setOrderDialogOpen(false);
            setEditingOrder(null);
          }}
          congressId={selectedCongress.id}
          order={editingOrder}
          congressPricing={selectedCongress.shirtPricing}
          shirtArtUrl={selectedCongress.shirtArtUrl}
        />
      )}
    </div>
  );
}
