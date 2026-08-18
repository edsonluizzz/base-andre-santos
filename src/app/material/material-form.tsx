"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, ChevronRight, ChevronLeft, Package, Download } from "lucide-react";
import { MATERIAL_CATALOG } from "@/lib/material-catalog";

type Step = "dados" | "termo" | "success";

const inputStyle = { background: "#1a2f4e", border: "1px solid rgba(255,255,255,0.07)" };

export function MaterialForm() {
  const [step, setStep] = useState<Step>("dados");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [campaignName, setCampaignName] = useState("Base de Apoio");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [termAccepted, setTermAccepted] = useState(false);

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.campaignName) setCampaignName(d.campaignName); })
      .catch(() => {});
  }, []);

  function formatCpf(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  function formatPhone(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function toggleItem(id: string) {
    setQty((q) => {
      const next = { ...q };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  function setItemQty(id: string, value: number) {
    setQty((q) => ({ ...q, [id]: Math.max(1, Math.min(9999, value)) }));
  }

  const selectedItems = Object.entries(qty).map(([item, q]) => ({ item, qty: q }));

  function validateDados(): string | null {
    if (!name.trim() || name.trim().length < 2) return "Informe seu nome completo";
    if (cpf.replace(/\D/g, "").length !== 11) return "Informe um CPF válido";
    if (phone.replace(/\D/g, "").length < 10) return "Informe um WhatsApp válido";
    if (selectedItems.length === 0) return "Selecione ao menos um material";
    return null;
  }

  function goToTermo(e: React.FormEvent) {
    e.preventDefault();
    const err = validateDados();
    if (err) { setError(err); return; }
    setError("");
    setStep("termo");
  }

  async function handleSubmit() {
    if (!termAccepted) { setError("É necessário ler e aceitar o Termo de Apoiador"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/public/material-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, cpf, phone, email, city, neighborhood,
          items: selectedItems,
          termAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao enviar. Tente novamente.");
        return;
      }
      setPdfUrl(data.pdfUrl ?? null);
      setStep("success");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="min-h-screen p-4 pb-10" style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}>
        <div className="max-w-sm mx-auto pt-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(255,107,4,0.15)", border: "1px solid rgba(255,107,4,0.3)" }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: "#ff6b04" }} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Solicitação enviada!</h1>
            <p className="text-slate-400 mt-2 leading-relaxed text-sm">
              Seu Termo de Apoiador já foi gerado e assinado. Enviamos uma cópia pelo WhatsApp
              e/ou e-mail cadastrado. Aguarde a equipe confirmar a disponibilidade do material.
            </p>
          </div>
          <p className="text-xs text-slate-500 rounded-xl px-4 py-3" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
            Status: <span style={{ color: "#ff6b04" }}>aguardando aprovação da equipe</span> para retirada/entrega.
          </p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
              style={{ background: "rgba(255,107,4,0.12)", border: "1px solid rgba(255,107,4,0.3)", color: "#ff6b04" }}
            >
              <Download className="w-4 h-4" /> Baixar meu Termo assinado
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-10" style={{ background: "#0a1220", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, #1a2f4e 0%, #0a1220 65%)" }}>
      <div className="max-w-md mx-auto pt-8 space-y-6">

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,107,4,0.12)", border: "1px solid rgba(255,107,4,0.25)" }}>
              <Package className="w-7 h-7" style={{ color: "#ff6b04" }} />
            </div>
          </div>
          <div>
            <p className="text-xs tracking-[3px] uppercase" style={{ color: "rgba(255,107,4,0.7)" }}>{campaignName}</p>
            <h1 className="text-2xl font-bold text-white mt-1">Solicitar Material</h1>
            <p className="text-slate-400 text-sm mt-1">Preencha seus dados e escolha o material — seu Termo de Apoiador sai pronto.</p>
          </div>
        </div>

        {step === "dados" && (
          <form onSubmit={goToTermo} className="space-y-4">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Nome completo <span style={{ color: "#ff6b04" }}>*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" autoComplete="name"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">CPF <span style={{ color: "#ff6b04" }}>*</span></label>
                <input type="text" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" maxLength={14}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">WhatsApp <span style={{ color: "#ff6b04" }}>*</span></label>
                <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(41) 99999-9999" autoComplete="tel" inputMode="numeric"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Cidade</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Curitiba"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none" style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Bairro</label>
                  <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Seu bairro"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none" style={inputStyle} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">E-mail <span className="text-slate-500">(opcional)</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none" style={inputStyle} />
              </div>
            </div>

            <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-medium text-slate-300">Qual material você quer receber? <span style={{ color: "#ff6b04" }}>*</span></p>
              <div className="space-y-2">
                {MATERIAL_CATALOG.map((it) => {
                  const checked = qty[it.id] !== undefined;
                  return (
                    <div key={it.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: checked ? "rgba(255,107,4,0.08)" : "rgba(255,255,255,0.02)", border: checked ? "1px solid rgba(255,107,4,0.25)" : "1px solid rgba(255,255,255,0.06)" }}>
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input type="checkbox" checked={checked} onChange={() => toggleItem(it.id)} className="sr-only" />
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: checked ? "#ff6b04" : "transparent", border: checked ? "1px solid #ff6b04" : "1px solid rgba(255,255,255,0.2)" }}>
                          {checked && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#0a1220" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        <span className="text-sm text-slate-200">{it.label}</span>
                      </label>
                      {checked && (
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          value={qty[it.id]}
                          onChange={(e) => setItemQty(it.id, parseInt(e.target.value) || 1)}
                          className="w-16 rounded-lg px-2 py-1.5 text-sm text-white text-center outline-none"
                          style={inputStyle}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-sm text-center rounded-xl py-2.5 px-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                {error}
              </p>
            )}

            <button type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all active:scale-[0.98]"
              style={{ background: "#ff6b04", color: "#0a1220" }}
            >
              <span>Continuar para o Termo</span><ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === "termo" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 space-y-3 max-h-96 overflow-y-auto text-sm text-slate-300 leading-relaxed" style={{ background: "rgba(13,27,42,0.70)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="font-bold text-white text-base">Termo de Apoiador — Recebimento de Material de Campanha</p>
              <p>
                Eu, <strong className="text-white">{name}</strong>, portador(a) do CPF <strong className="text-white">{cpf}</strong>
                {city ? `, residente em ${city}` : ""}, declaro para os devidos fins que recebo, na condição de apoiador(a)
                voluntário(a) da campanha de <strong className="text-white">{campaignName}</strong>, o seguinte material de campanha:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {selectedItems.map((i) => (
                  <li key={i.item}>{i.qty} × {MATERIAL_CATALOG.find((m) => m.id === i.item)?.label ?? i.item}</li>
                ))}
              </ul>
              <p>
                Declaro que o material acima é recebido de forma voluntária e gratuita, sem qualquer contrapartida
                financeira, para distribuição espontânea de apoio à candidatura, comprometendo-me a utilizá-lo em
                conformidade com a Lei nº 9.504/1997 e as normas do TSE aplicáveis à propaganda eleitoral.
              </p>
              <p className="text-xs text-slate-500">
                Esta é uma prévia. O termo definitivo (com CNPJ do comitê e evidência de aceite eletrônico) será
                gerado em PDF e enviado ao seu WhatsApp/e-mail assim que você confirmar abaixo.
              </p>
            </div>

            <label
              className="flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3 transition-all"
              style={{
                background: termAccepted ? "rgba(255,107,4,0.06)" : "rgba(13,27,42,0.50)",
                border: termAccepted ? "1px solid rgba(255,107,4,0.25)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="mt-0.5 shrink-0 relative">
                <input type="checkbox" checked={termAccepted} onChange={(e) => setTermAccepted(e.target.checked)} className="sr-only" />
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: termAccepted ? "#ff6b04" : "transparent", border: termAccepted ? "1px solid #ff6b04" : "1px solid rgba(255,255,255,0.2)" }}>
                  {termAccepted && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#0a1220" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: termAccepted ? "rgba(255,107,4,0.9)" : "#94a3b8" }}>
                Li e concordo com o Termo de Apoiador acima, e confirmo que os dados informados (nome e CPF) são
                verdadeiros e servem como minha assinatura eletrônica neste documento. <span style={{ color: "#ff6b04" }}>*</span>
              </p>
            </label>

            {error && (
              <p className="text-sm text-center rounded-xl py-2.5 px-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep("dados")} type="button"
                className="flex items-center justify-center gap-2 rounded-xl py-4 px-4 text-sm font-medium transition-all active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleSubmit} disabled={loading} type="button"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all active:scale-[0.98]"
                style={{ background: loading ? "rgba(255,107,4,0.5)" : "#ff6b04", color: "#0a1220", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <span>Gerando termo...</span> : <span>Confirmar e assinar</span>}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          Seus dados são usados exclusivamente pela equipe de apoio.
        </p>
      </div>
    </div>
  );
}
