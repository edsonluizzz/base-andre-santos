"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Users, User, Search, RefreshCw, ArrowLeft, Info, Star, Send, Settings2, Phone } from "lucide-react";
import { WhatsappComposer } from "@/components/grupos/whatsapp-composer";
import { ZapiGroupsLive } from "@/components/grupos/zapi-groups-panel";

type GroupItem = {
  id: string;
  name: string;
  record: { id: string; region: string | null; isFallback: boolean; inviteLink: string | null } | null;
};

type Target =
  | { kind: "group"; to: string; name: string }
  | { kind: "contact"; to: string; name: string };

/**
 * Central de WhatsApp (ADMIN) — duas abas:
 *  • Enviar: envia pelo número da campanha (texto/foto/vídeo/áudio) p/ grupos ou contato.
 *  • Grupos: gestão ao vivo dos grupos reais (participantes, convites, roteamento WF2).
 *
 * Unifica os antigos menus "WhatsApp" e "Grupos WhatsApp" num só. Recebimento/
 * histórico não existem pela Z-API no multi-dispositivo (inbox real = fase futura/webhook).
 */
export default function WhatsappPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [view, setView] = useState<"send" | "groups">("send");
  const [tab, setTab] = useState<"groups" | "contact">("groups");
  const [groups, setGroups] = useState<GroupItem[] | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [target, setTarget] = useState<Target | null>(null);

  // Busca de colaboradores na aba "Contato"
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<{ id: string; name: string; phone: string | null; city: string | null }[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);

  useEffect(() => {
    const term = contactSearch.trim();
    if (term.length < 2) { setContactResults([]); return; }
    setSearchingContacts(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/collaborators?q=${encodeURIComponent(term)}&status=ACTIVE&limit=20`,
          { signal: ctrl.signal }
        );
        const data = await res.json().catch(() => ({}));
        const list = (data.data ?? []) as { id: string; name: string; phone: string | null; city: string | null }[];
        setContactResults(list.filter((c) => c.phone)); // só com telefone
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setContactResults([]);
        }
      } finally {
        setSearchingContacts(false);
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [contactSearch]);

  function selectContact(c: { name: string; phone: string | null }) {
    const digits = (c.phone ?? "").replace(/\D/g, "");
    if (digits.length < 10) { toast.error("Telefone do contato é inválido"); return; }
    const full = digits.startsWith("55") ? digits : `55${digits}`;
    setTarget({ kind: "contact", to: full, name: c.name });
  }

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/zapi/groups");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao carregar grupos");
        return;
      }
      setGroups(data.groups ?? []);
    } catch {
      toast.error("Falha de rede ao carregar grupos");
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  function openContact() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      toast.error("Telefone inválido — use DDD + número (ex: 41 99999-9999)");
      return;
    }
    const full = digits.startsWith("55") ? digits : `55${digits}`;
    setTarget({ kind: "contact", to: full, name: phone.trim() });
  }

  if (role && role !== "ADMIN") {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-16 text-center glass-card rounded-2xl p-8">
          <Info className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            A central de WhatsApp é exclusiva para administradores.
          </p>
        </div>
      </div>
    );
  }

  const filteredGroups = (groups ?? []).filter((g) =>
    g.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6">
      {/* Header + abas de nível superior */}
      <div className="mb-4">
        <h1 className="gradient-title text-xl lg:text-2xl font-bold">WhatsApp</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Envie pelo número da campanha e gerencie os grupos reais — num só lugar.
        </p>
        <div className="flex gap-1.5 mt-3">
          <button
            onClick={() => setView("send")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              view === "send" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <Send className="w-4 h-4" /> Enviar
          </button>
          <button
            onClick={() => setView("groups")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              view === "groups" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <Settings2 className="w-4 h-4" /> Grupos
          </button>
        </div>
      </div>

      {view === "groups" ? (
        <ZapiGroupsLive />
      ) : (
        <div className="h-[calc(100dvh-12rem)] min-h-[24rem] grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          {/* ── Coluna esquerda: lista ───────────────────────────── */}
          <div className={`flex flex-col min-h-0 glass-card rounded-2xl overflow-hidden ${target ? "hidden lg:flex" : "flex"}`}>
            {/* Abas internas */}
            <div className="flex border-b border-white/[0.07]">
              <button
                onClick={() => setTab("groups")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  tab === "groups" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-4 h-4" /> Grupos
              </button>
              <button
                onClick={() => setTab("contact")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  tab === "contact" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="w-4 h-4" /> Contato
              </button>
            </div>

            {tab === "groups" ? (
              <div className="flex flex-col min-h-0 flex-1">
                <div className="p-3 flex items-center gap-2 border-b border-white/[0.05]">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar grupo..."
                      className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
                    />
                  </div>
                  <button
                    onClick={loadGroups}
                    disabled={loadingGroups}
                    aria-label="Recarregar grupos"
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingGroups ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {groups === null && !loadingGroups && (
                    <button onClick={loadGroups} className="w-full mt-4 text-sm text-primary hover:underline">
                      Carregar grupos do WhatsApp
                    </button>
                  )}
                  {loadingGroups && (
                    <p className="text-xs text-muted-foreground text-center py-6">Carregando grupos...</p>
                  )}
                  {groups !== null && filteredGroups.length === 0 && !loadingGroups && (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhum grupo encontrado.</p>
                  )}
                  {filteredGroups.map((g) => {
                    const active = target?.kind === "group" && target.to === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setTarget({ kind: "group", to: g.id, name: g.name })}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                          active ? "bg-primary/10 border border-primary/20" : "hover:bg-white/[0.04] border border-transparent"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-green-500/15 border border-green-500/20 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{g.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {g.record?.region ? `Região: ${g.record.region}` : "Grupo do WhatsApp"}
                            {g.record?.isFallback ? " · padrão" : ""}
                          </p>
                        </div>
                        {g.record?.isFallback && <Star className="w-3.5 h-3.5 text-primary fill-primary/30 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-0 flex-1">
                {/* Busca de colaborador por nome */}
                <div className="p-3 border-b border-white/[0.05]">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Buscar colaborador por nome..."
                      className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {contactSearch.trim().length < 2 && (
                    <p className="text-xs text-muted-foreground/70 text-center py-6">
                      Digite ao menos 2 letras do nome.
                    </p>
                  )}
                  {searchingContacts && (
                    <p className="text-xs text-muted-foreground text-center py-4">Buscando...</p>
                  )}
                  {contactSearch.trim().length >= 2 && !searchingContacts && contactResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhum colaborador com telefone encontrado.
                    </p>
                  )}
                  {contactResults.map((c) => {
                    const active = target?.kind === "contact" && target.name === c.name;
                    return (
                      <button
                        key={c.id}
                        onClick={() => selectContact(c)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                          active ? "bg-primary/10 border border-primary/20" : "hover:bg-white/[0.04] border border-transparent"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.phone}{c.city ? ` · ${c.city}` : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Alternativa: número avulso */}
                <div className="p-3 border-t border-white/[0.07] space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> ou número avulso
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") openContact(); }}
                      placeholder="41 99999-9999"
                      inputMode="tel"
                      className="flex-1 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
                    />
                    <button
                      onClick={openContact}
                      className="h-9 px-3 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/25 transition-colors shrink-0"
                    >
                      Abrir
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Coluna direita: composer ─────────────────────────── */}
          <div className={`flex flex-col min-h-0 glass-card rounded-2xl overflow-hidden ${target ? "flex" : "hidden lg:flex"}`}>
            {!target ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-sm text-muted-foreground">Selecione um grupo ou contato para enviar.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
                  <button
                    onClick={() => setTarget(null)}
                    aria-label="Voltar"
                    className="lg:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    target.kind === "group" ? "bg-green-500/15 border border-green-500/20" : "bg-primary/10 border border-primary/20"
                  }`}>
                    {target.kind === "group" ? <Users className="w-4 h-4 text-green-400" /> : <User className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{target.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {target.kind === "group" ? "Grupo" : "Contato"} · enviando pelo número da campanha
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col justify-end">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 mb-4 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground/80">
                      O recebimento e o histórico das conversas não ficam disponíveis pela Z-API no
                      WhatsApp multi-dispositivo. Aqui você envia; as respostas chegam no WhatsApp da campanha.
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <WhatsappComposer
                    key={target.to}
                    to={target.to}
                    onSent={() => toast.success("Mensagem enviada")}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
