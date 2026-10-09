#!/usr/bin/env node
// Narração do vídeo: gera uma fala por cena (narracao.json), confere se cada uma cabe antes da próxima e
// mixa voz + trilha com a música abaixando sozinha quando a voz entra (sidechain).
// Rascunho com voz do macOS (`say`); para voz realista, troque gerarFala() por um serviço de TTS ou por gravação.
// Uso: node analise-2026/video/narrar.mjs <trilha.wav> <saida.wav> <ffmpeg> [voz=Reed] [velocidade=210]
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [trilha, saida, FFMPEG, VOZ = "Reed", VEL = "210"] = process.argv.slice(2);
if (!trilha || !saida || !FFMPEG) { console.error("uso: narrar.mjs <trilha.wav> <saida.wav> <ffmpeg> [voz] [velocidade]"); process.exit(1); }
const AQUI = dirname(fileURLToPath(import.meta.url));
const { falas } = JSON.parse(readFileSync(join(AQUI, "narracao.json"), "utf8"));
const tmp = mkdtempSync(join(tmpdir(), "narracao-"));

// duração lida do relatório do ffmpeg (sai na saída de erro)
const duracao = (arq) => spawnSync(FFMPEG, ["-i", arq, "-f", "null", "-"]).stderr.toString()
  .match(/time=(\d+):(\d+):([\d.]+)/g).pop().replace("time=", "").split(":").reduce((s, v) => s * 60 + Number(v), 0);
const gerarFala = (texto, arq) => execFileSync("say", ["-v", VOZ, "-r", VEL, "-o", arq, texto]);

const arquivos = falas.map((f, i) => {
  const aiff = join(tmp, `f${i}.aiff`);
  gerarFala(f.texto, aiff);
  const dur = duracao(aiff);
  const limite = (falas[i + 1]?.inicio ?? 30) - f.inicio - 0.1;
  console.log(`${f.inicio.toFixed(1).padStart(4)} s  ${dur.toFixed(2)} s / ${limite.toFixed(2)} s  ${dur > limite ? "ESTOURA" : "ok"}  ${f.texto}`);
  if (dur > limite) throw new Error(`a fala "${f.texto}" não cabe na cena (${dur.toFixed(2)} s > ${limite.toFixed(2)} s)`);
  return aiff;
});

// voz: cada fala atrasada até o seu início, juntas numa faixa; leve compressão e brilho para soar "de locutor".
const entradas = arquivos.flatMap((a) => ["-i", a]);
const atrasos = falas.map((f, i) => `[${i + 1}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay=${Math.round(f.inicio * 1000)}|${Math.round(f.inicio * 1000)}[v${i}]`).join(";");
const voz = `${falas.map((_, i) => `[v${i}]`).join("")}amix=inputs=${falas.length}:normalize=0,highpass=f=90,equalizer=f=3000:t=q:w=1:g=3,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,volume=2.2,asplit=2[voz][chave]`;
const mix = `[0:a]volume=0.9[mus];[mus][chave]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=350[musd];[musd][voz]amix=inputs=2:normalize=0,alimiter=limit=0.89,loudnorm=I=-14:TP=-1.5:LRA=7`;
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", trilha, ...entradas, "-filter_complex", `${atrasos};${voz};${mix}`, "-t", "30", "-ar", "44100", saida]);
console.log(`gravado ${saida} (voz ${VOZ}, velocidade ${VEL})`);
