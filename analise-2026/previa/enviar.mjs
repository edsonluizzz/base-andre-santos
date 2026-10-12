#!/usr/bin/env node
// Envia por e-mail (Resend) a prévia em PDF de cada candidato da coligação, gerada por gerar.mjs.
// Uso (da raiz do repo):
//   node analise-2026/previa/enviar.mjs --listar                  confere a lista (nada é enviado)
//   node analise-2026/previa/enviar.mjs --teste=voce@email.com    manda 2 exemplos (individual e compartilhado) para você
//   node analise-2026/previa/enviar.mjs --enviar [--limite=100]   dispara de verdade (pula quem já recebeu)
// Chave: RESEND_API_KEY no ambiente. Registro do que já foi enviado: <pasta>/envios.json.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const PASTA = args.pasta ?? join(homedir(), "Downloads", "Ovile Prévias");
const PLANILHA = args.planilha ?? join(homedir(), "Downloads", "Planilhas", "ovile_diagnostico_lista_envio_PR.csv");
const PARTIDOS = ["NOVO", "PL", "PODEMOS"];
const FROM = "OVILE - DIAGNOSTICO ELEITORAL - 2026 <contato@ovile.com.br>";
const WHATSAPP = "5541999888951";
const SITE = "https://diagnostico.ovile.com.br";
const REGISTRO = join(PASTA, "envios.json");

// número do candidato → PDF (o número fica no fim do nome do arquivo)
const pdfs = new Map();
for (const p of PARTIDOS) {
  for (const arq of readdirSync(join(PASTA, p))) {
    const m = arq.match(/^Prévia Ovile - (.+) (\d+)\.pdf$/);
    if (m) pdfs.set(m[2], { arquivo: join(PASTA, p, arq), nome: m[1], n: m[2], partido: p });
  }
}

// Linhas da planilha → um e-mail por endereço, com os PDFs dos candidatos da coligação daquele endereço
const [cab, ...linhas] = readFileSync(PLANILHA, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/).map((l) => l.split(";"));
const col = (nome) => cab.indexOf(nome);
const envios = [];
for (const l of linhas) {
  const email = l[col("email")]?.trim().toLowerCase();
  if (!email) continue;
  const numeros = l[col("tipo")] === "individual" ? [l[col("numero")]] : [...l[col("candidatos")].matchAll(/ (\d+)(?= \||$)/g)].map((m) => m[1]);
  const anexos = [...new Set(numeros)].map((n) => pdfs.get(n)).filter(Boolean);
  if (!anexos.length) continue;
  const individual = l[col("tipo")] === "individual";
  envios.push({ email, anexos, nome: individual ? l[col("nome_urna")] : null });
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lista = (xs) => (xs.length < 2 ? xs[0] : `${xs.slice(0, -1).join(", ")} e ${xs.at(-1)}`);

export function mensagem({ email, anexos, nome }) {
  const nomes = anexos.map((a) => `${a.nome} (${a.n})`);
  const um = anexos.length === 1;
  const assunto = nome ? `${nome}, sua votação de 2026, local por local` : "Prévia do diagnóstico eleitoral 2026";
  const zap = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Olá! Recebi a prévia do diagnóstico de ${lista(nomes)} e quero conhecer o completo.`)}`;
  const paragrafos = [
    nome ? `Olá, ${nome}!` : "Olá!",
    `Cruzamos os dados oficiais do TSE da eleição de 2026 e preparamos uma prévia do diagnóstico ${nome ? "da sua votação" : `de ${lista(nomes)}`}. ${um ? "Ela segue em anexo" : "Os arquivos seguem em anexo"}, com os números reais.`,
    "O diagnóstico completo não é só um relatório. Você recebe acesso ao sistema Ovile Diagnóstico para explorar a votação do jeito que precisar:",
  ];
  const itens = [
    "Abrir <b>cidade por cidade</b>, até o local de votação e o bairro",
    "Montar <b>cenários de comparação com até 3 concorrentes</b>, lado a lado no mapa",
    "Ver <b>quanto custou cada voto</b>, o seu e o dos adversários",
    "Descobrir <b>quem disputa a mesma base</b> e onde cada um foi mais forte",
    "Encontrar <b>lugares com o mesmo perfil de eleitor</b> onde ainda há espaço para crescer",
  ];
  const fecho = [
    "E quando precisar apresentar ao partido ou à equipe, o próprio sistema gera o relatório em PDF.",
    "Quer ver funcionando? Fale com a gente no WhatsApp e mostramos o sistema com os seus dados.",
  ];
  const botao = "Quero conhecer o diagnóstico completo";
  const rodape = "Você recebe este e-mail porque o endereço consta como contato de candidatura no registro público da eleição 2026 (TSE). Para não receber mais, responda com SAIR.";
  const p = (t) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937">${t}</p>`;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
<p style="margin:0 0 20px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#ff6b04;font-weight:700">Ovile Diagnóstico Eleitoral</p>
${paragrafos.map((t) => p(esc(t))).join("\n")}
<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.6;color:#1f2937">${itens.map((t) => `<li style="margin-bottom:6px">${t}</li>`).join("")}</ul>
${fecho.map((t) => p(esc(t))).join("\n")}
<p style="margin:24px 0"><a href="${esc(zap)}" style="display:inline-block;background:#ff6b04;color:#0a1220;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700">${botao}</a></p>
${p(`Equipe Ovile Diagnóstico<br><a href="${SITE}" style="color:#ff6b04">${SITE.replace("https://", "")}</a>`)}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px">
<p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280">${esc(rodape)}</p>
</div></body></html>`;
  const text = [...paragrafos, itens.map((t) => `• ${t.replace(/<\/?b>/g, "")}`).join("\n"), ...fecho, `${botao}: ${zap}`, `Equipe Ovile Diagnóstico\n${SITE}`, "—", rodape].join("\n\n");
  return {
    from: FROM, to: [email], subject: assunto, html, text,
    headers: { "List-Unsubscribe": "<mailto:contato@ovile.com.br?subject=SAIR>" },
    attachments: anexos.map((a) => ({ filename: a.arquivo.split("/").at(-1), content: readFileSync(a.arquivo).toString("base64") })),
  };
}

async function enviar(msg) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${corpo.message ?? JSON.stringify(corpo)}`);
  return corpo.id;
}
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const nPdfs = new Set(envios.flatMap((e) => e.anexos.map((a) => a.n))).size;
console.log(`${envios.length} e-mails · ${nPdfs} de ${pdfs.size} PDFs cobertos`);
const semEmail = [...pdfs.values()].filter((a) => !envios.some((e) => e.anexos.includes(a)));
if (semEmail.length) console.log(`PDFs sem e-mail na planilha: ${semEmail.map((a) => `${a.nome} ${a.n}`).join(", ")}`);

if (args.listar) {
  for (const e of envios) console.log(`${e.email}\t${e.anexos.map((a) => `${a.partido} ${a.nome} ${a.n}`).join(" | ")}`);
} else if (args.teste || args.enviar) {
  if (!process.env.RESEND_API_KEY) { console.error("Falta RESEND_API_KEY no ambiente."); process.exit(1); }
  if (args.teste) {
    const exemplos = [envios.find((e) => e.nome), envios.find((e) => !e.nome)].filter(Boolean);
    for (const e of exemplos) {
      const msg = mensagem(e);
      console.log(`✓ teste (${e.email}) → ${args.teste}: ${await enviar({ ...msg, to: [args.teste], subject: `[TESTE] ${msg.subject}` })}`);
      await pausa(600);
    }
  } else {
    const feitos = existsSync(REGISTRO) ? JSON.parse(readFileSync(REGISTRO, "utf8")) : {};
    const fila = envios.filter((e) => !feitos[e.email]).slice(0, Number(args.limite ?? Infinity));
    console.log(`já enviados: ${Object.keys(feitos).length} · nesta rodada: ${fila.length}`);
    for (const e of fila) {
      try {
        const id = await enviar(mensagem(e));
        feitos[e.email] = { id, em: new Date().toISOString(), candidatos: e.anexos.map((a) => a.n) };
        writeFileSync(REGISTRO, JSON.stringify(feitos, null, 1));
        console.log(`✓ ${e.email}`);
      } catch (err) {
        console.error(`✗ ${e.email}: ${err.message}`);
        if (/429|daily|quota|limit/i.test(err.message)) break;
      }
      await pausa(600);
    }
  }
} else {
  console.log("Use --listar, --teste=<e-mail> ou --enviar [--limite=N].");
}
