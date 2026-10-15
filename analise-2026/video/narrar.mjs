#!/usr/bin/env node
// Narração do vídeo: gera uma fala por cena (narracao.json), confere se cada uma cabe antes da próxima e
// mixa voz + trilha com a música abaixando sozinha quando a voz entra (sidechain).
// Voz do macOS (`say`) para rascunho, ElevenLabs com voz=el:<voice_id> (chave em ~/.config/elevenlabs.env) ou
// Gemini com voz=gm:<Voz>[@modelo] (chave em ~/.config/gemini.env). No Gemini o roteiro inteiro sai num pedido só
// (o plano grátis dá 10 pedidos/dia por modelo) e é cortado nas N-1 maiores pausas, uma fala por cena.
// Uso: node analise-2026/video/narrar.mjs <trilha.wav> <saida.wav> <ffmpeg> [voz=Reed|el:<id>|gm:Orus@gemini-3.8-flash-tts] [velocidade=210]
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [trilha, saida, FFMPEG, VOZ = "Reed", VEL = "210"] = process.argv.slice(2);
if (!trilha || !saida || !FFMPEG) { console.error("uso: narrar.mjs <trilha.wav> <saida.wav> <ffmpeg> [voz] [velocidade]"); process.exit(1); }
const AQUI = dirname(fileURLToPath(import.meta.url));
// roteiro: narracao.json desta pasta, ou outro arquivo em ROTEIRO=<caminho> (com "duracao" quando não for 30 s)
const roteiro = JSON.parse(readFileSync(process.env.ROTEIRO ?? join(AQUI, "narracao.json"), "utf8"));
const { falas } = roteiro, DURACAO = roteiro.duracao ?? 30;
const tmp = mkdtempSync(join(tmpdir(), "narracao-"));

// duração lida do relatório do ffmpeg (sai na saída de erro)
const duracao = (arq) => spawnSync(FFMPEG, ["-i", arq, "-f", "null", "-"]).stderr.toString()
  .match(/time=(\d+):(\d+):([\d.]+)/g).pop().replace("time=", "").split(":").reduce((s, v) => s * 60 + Number(v), 0);
const ELEVEN = VOZ.startsWith("el:"), GEMINI = VOZ.startsWith("gm:");
const chave = (arq, nome) => {
  if (process.env[nome]) return process.env[nome];
  const p = join(homedir(), ".config", arq);
  const m = existsSync(p) && readFileSync(p, "utf8").match(new RegExp(`${nome}=(\\S+)`));
  if (!m) throw new Error(`falta ${nome} (variável de ambiente ou ~/.config/${arq})`);
  return m[1];
};
const chaveEleven = () => {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const arq = join(homedir(), ".config/elevenlabs.env");
  const m = existsSync(arq) && readFileSync(arq, "utf8").match(/ELEVENLABS_API_KEY=(\S+)/);
  if (!m) throw new Error("falta ELEVENLABS_API_KEY (variável de ambiente ou ~/.config/elevenlabs.env)");
  return m[1];
};
// ElevenLabs: multilingual v2, uma chamada por fala; previous/next_text dão a entonação de frase contínua.
async function gerarFala(texto, arq, i) {
  if (!ELEVEN) return execFileSync("say", ["-v", VOZ, "-r", VEL, "-o", arq, texto]);
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ.slice(3)}?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": chaveEleven(), "content-type": "application/json" },
    body: JSON.stringify({ text: texto, model_id: "eleven_multilingual_v2", language_code: "pt",
      previous_text: falas[i - 1]?.texto, next_text: falas[i + 1]?.texto,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: Number(process.env.VELOCIDADE ?? 1) } }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  writeFileSync(arq, Buffer.from(await r.arrayBuffer()));
}

// Gemini: um pedido com o roteiro todo (uma fala por parágrafo), cortado nas N-1 maiores pausas.
async function gerarGemini() {
  const [voz, modelo = "gemini-3.8-flash-tts"] = VOZ.slice(3).split("@");
  // cache por voz+modelo+roteiro: rodar de novo (ajuste de mixagem) não gasta a cota diária
  const cache = join(AQUI, `.cache-${voz}-${modelo}-${createHash("sha1").update(JSON.stringify(falas.map((f) => f.texto))).digest("hex").slice(0, 10)}.bin`);
  const bruto = join(tmp, "gemini.bin"), tudo = join(tmp, "gemini.wav");
  if (!existsSync(cache)) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": chave("gemini.env", "GEMINI_API_KEY"), "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: falas.map((f) => f.texto).join("\n\n") }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } } } }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const parte = (await r.json()).candidates[0].content.parts[0].inlineData;
  writeFileSync(cache, Buffer.from(parte.data, "base64"));
  console.log(`Gemini: ${parte.mimeType}`);
  }
  // WAV de verdade começa com "RIFF"; senão é PCM 16 bits mono 24 kHz (o que a API devolve como audio/L16)
  const dados = readFileSync(cache); writeFileSync(bruto, dados);
  const cru = dados.subarray(0, 4).toString() === "RIFF" ? [] : ["-f", "s16le", "-ar", "24000", "-ac", "1"];
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", ...cru, "-i", bruto, tudo]);
  const log = spawnSync(FFMPEG, ["-i", tudo, "-af", "silencedetect=n=-40dB:d=0.15", "-f", "null", "-"]).stderr.toString();
  const pausas = [...log.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => ({ ini: +m[1], fim: +m[2] }))
    .filter((p) => p.ini > 0.2);
  // escolhe as N-1 pausas de uma vez (programação dinâmica, em ordem): cada fronteira deve cair perto da posição
  // esperada (proporcional ao tamanho do texto, entre o início e o fim da fala) e pausa longa vale mais que vírgula
  const total = +log.match(/time=(\d+):(\d+):([\d.]+)/g).pop().replace("time=", "").split(":").reduce((s, v) => s * 60 + Number(v), 0);
  const ultima = pausas.at(-1), fimFala = ultima && ultima.fim > total - 0.05 ? ultima.ini : total;
  const inicioFala = +(log.match(/silence_start: 0(?:\.0+)?\s[\s\S]*?silence_end: ([\d.]+)/)?.[1] ?? 0);
  const internas = pausas.filter((p) => p.ini < fimFala - 0.05);
  // peso de cada fala ≈ tempo falado: letras + pausas internas (ponto no meio da fala ≈ 14 letras; vírgula/dois-pontos ≈ 5);
  // sigla é soletrada ("PSD" = "pê esse dê"), então cada letra dela vale ~3
  const letras = falas.map((f) => f.texto.length + 14 * (f.texto.trim().slice(0, -1).match(/[.!?]/g)?.length ?? 0) + 5 * (f.texto.match(/[,:;]/g)?.length ?? 0)
    + 2 * (f.texto.match(/\b[A-Z]{2,5}\b/g)?.join("").length ?? 0));
  const soma = letras.reduce((x, y) => x + y, 0);
  const alvos = []; let acum = 0;
  for (const l of letras.slice(0, -1)) { acum += l; alvos.push(inicioFala + (fimFala - inicioFala) * acum / soma); }
  const PESO = 4, n = alvos.length, m = internas.length;
  if (m < n) throw new Error(`só ${m} pausas para ${falas.length} falas`);
  const custo = (k, j) => Math.abs((internas[j].ini + internas[j].fim) / 2 - alvos[k]) - PESO * (internas[j].fim - internas[j].ini);
  const melhor = alvos.map(() => new Array(m).fill(Infinity)), de = alvos.map(() => new Array(m).fill(-1));
  for (let j = 0; j < m; j++) melhor[0][j] = custo(0, j);
  for (let k = 1; k < n; k++) for (let j = k; j < m; j++) for (let i = k - 1; i < j; i++) {
    const v = melhor[k - 1][i] + custo(k, j);
    if (v < melhor[k][j]) { melhor[k][j] = v; de[k][j] = i; }
  }
  let jf = 0; for (let j = 1; j < m; j++) if (melhor[n - 1][j] < melhor[n - 1][jf]) jf = j;
  const cortes = [];
  for (let k = n - 1; k >= 0; k--) { cortes.unshift(internas[jf]); jf = de[k][jf]; }
  // correção manual presa a UM take: "cortes": { "take": <sha1 do áudio>, "trocar": [[de, para], …] } troca o corte em `de` pela
  // pausa que começa em `para` (s); se a narração for gerada de novo, o take muda e a correção deixa de valer sozinha
  const take = createHash("sha1").update(dados).digest("hex").slice(0, 10);
  if (roteiro.cortes?.take === take) for (const [de, para] of roteiro.cortes.trocar) {
    const k = cortes.findIndex((c) => Math.abs(c.ini - de) < .05), p = internas.find((c) => Math.abs(c.ini - para) < .05);
    if (k < 0 || !p) throw new Error(`correção de corte ${de} → ${para} não encontrada no take ${take}`);
    cortes[k] = p;
  }
  if (process.env.SO_MEDIR) console.log(`cortes (take ${take}):`, cortes.map((c) => c.ini.toFixed(2)).join(" "));
  // "junta": true numa fala = sai no mesmo trecho da anterior (quando a pausa entre as duas é curta demais para separar)
  return falas.map((_, i) => {
    if (falas[i].junta) return null;
    let fimGrupo = i; while (falas[fimGrupo + 1]?.junta) fimGrupo++;
    // o ataque das consoantes (s, f, d) fica abaixo do limiar do silencedetect: cortar com folga dentro da pausa
    // e só depois tirar o silêncio inicial com limiar bem baixo, deixando 80 ms antes da voz
    const ant = cortes[i - 1], prox = cortes[fimGrupo];
    // pausa curta: a cauda da palavra anterior e o ataque da seguinte ficam dentro dela, então cada lado só usa a sua metade
    const de = ant ? Math.max(ant.ini + (ant.fim - ant.ini) * 0.5, ant.fim - 0.3) : 0;
    const ate = prox ? prox.ini + Math.min(0.1, (prox.fim - prox.ini) * 0.2) : undefined;
    const arq = join(tmp, `f${i}.wav`);
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", tudo, "-ss", de.toFixed(3), ...(ate ? ["-to", ate.toFixed(3)] : []),
      "-af", "silenceremove=start_periods=1:start_threshold=-62dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.1,areverse,afade=t=in:d=0.01", arq]);
    // trava: som curto e isolado no fim (ataque da próxima palavra que vazou) é cortado na pausa que o antecede
    const fimLog = spawnSync(FFMPEG, ["-i", arq, "-af", "silencedetect=n=-45dB:d=0.06", "-f", "null", "-"]).stderr.toString();
    const durSeg = duracao(arq);
    const ps = [...fimLog.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [+m[1], +m[2]]).filter(([, e]) => e < durSeg - 0.02);
    const ultimaP = ps.at(-1);
    if (prox && prox.fim - prox.ini < 0.4 && ultimaP && durSeg - ultimaP[1] < 0.18 && ultimaP[1] - ultimaP[0] > 0.08) {
      const limpo = arq.replace(/\.wav$/, "-limpo.wav");
      execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", arq, "-to", (ultimaP[0] + 0.08).toFixed(3), "-af", "afade=t=out:st=" + Math.max(0, ultimaP[0] + 0.03).toFixed(3) + ":d=0.05", limpo]);
      console.log(`      fala ${i + 1}: resquício de ${(durSeg - ultimaP[1]).toFixed(2)} s no fim removido`);
      return limpo;
    }
    return arq;
  });
}

const arquivos = [];
const prontos = GEMINI ? await gerarGemini() : null;
const proxima = (i) => { let j = i + 1; while (falas[j]?.junta) j++; return falas[j]; };
for (const [i, f] of falas.entries()) {
  if (f.junta) continue;
  const aiff = prontos ? prontos[i] : join(tmp, `f${i}.${ELEVEN ? "mp3" : "aiff"}`);
  if (!prontos) await gerarFala(f.texto, aiff, i);
  const dur = duracao(aiff);
  const limite = (proxima(i)?.inicio ?? DURACAO) - f.inicio - 0.1;
  console.log(`${f.inicio.toFixed(1).padStart(4)} s  ${dur.toFixed(2)} s / ${limite.toFixed(2)} s  ${dur > limite ? "ESTOURA" : "ok"}  ${f.texto}`);
  // até 15% acima do espaço: acelera só essa fala (atempo mantém o tom); acima disso, reescrever o roteiro
  if (dur > limite && dur / limite <= 1.15 && !process.env.SO_MEDIR) {
    const rapida = aiff.replace(/\.\w+$/, "-rapida.wav");
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", aiff, "-af", `atempo=${(dur / (limite - 0.02)).toFixed(3)}`, rapida]);
    console.log(`      acelerada ${(dur / (limite - 0.02)).toFixed(2)}× para caber`);
    arquivos.push(rapida); continue;
  }
  if (dur > limite && process.env.SO_MEDIR) { arquivos.push(aiff); continue; } // SO_MEDIR=1: lista todas as durações sem parar
  if (dur > limite) throw new Error(`a fala "${f.texto}" não cabe na cena (${dur.toFixed(2)} s > ${limite.toFixed(2)} s)`);
  arquivos.push(aiff);
}

// voz: cada fala atrasada até o seu início, juntas numa faixa; leve compressão e brilho para soar "de locutor".
const usadas = falas.filter((f) => !f.junta);
const entradas = arquivos.flatMap((a) => ["-i", a]);
const atrasos = usadas.map((f, i) => `[${i + 1}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay=${Math.round(f.inicio * 1000)}|${Math.round(f.inicio * 1000)}[v${i}]`).join(";");
const voz = `${usadas.map((_, i) => `[v${i}]`).join("")}amix=inputs=${usadas.length}:normalize=0,highpass=f=90,equalizer=f=3000:t=q:w=1:g=3,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,volume=2.2,asplit=2[voz][chave]`;
const mix = `[0:a]volume=0.9[mus];[mus][chave]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=350[musd];[musd][voz]amix=inputs=2:normalize=0,alimiter=limit=0.89,loudnorm=I=-14:TP=-1.5:LRA=7`;
if (process.env.SO_MEDIR) process.exit(0);
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", trilha, ...entradas, "-filter_complex", `${atrasos};${voz};${mix}`, "-t", String(DURACAO), "-ar", "44100", saida]);
console.log(`gravado ${saida} (voz ${VOZ}${GEMINI || ELEVEN ? "" : `, velocidade ${VEL}`})`);
