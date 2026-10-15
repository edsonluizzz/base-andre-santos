#!/usr/bin/env node
// Trilha original sintetizada (sem direitos de terceiros) para os vídeos longos, configurada por um JSON:
//   { "dur": 96, "bpm": 90, "trocas": [8, 16, …], "impactos": [64, 88],
//     "secoes": [{ "ini": 0, "fim": 56, "acordes": [[57,60,64],…], "baixo": [45,…], "ritmo": true, "arpejo": true,
//                  "tique": false, "coracao": false, "brilho": 0.08 }, …] }
// Instrumentos: pad de dente-de-serra desafinado, bumbo, taiko, palmas, chimbal, baixo, arpejo com eco, tique de relógio,
// batida de coração, whoosh nas trocas de cena, subida + impacto. Master em ~-15 LUFS (pico -3 dBFS).
// Uso: node analise-2026/video/longo/trilha.mjs <config.json> <saida.wav>
import { readFileSync, writeFileSync } from "node:fs";

const CFG = JSON.parse(readFileSync(process.argv[2], "utf8"));
const SR = 44100, DUR = CFG.dur, N = SR * DUR, BEAT = 60 / CFG.bpm, BAR = BEAT * 4;
const L = new Float32Array(N), R = new Float32Array(N);
let semente = CFG.semente ?? 777;
const ruido = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 2 ** 31 - 1; };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };
const saw = (f) => 2 * (f - Math.floor(f + 0.5));
const secao = (t) => CFG.secoes.find((s) => t >= s.ini && t < s.fim) ?? CFG.secoes.at(-1);
const acorde = (t) => { const s = secao(t), k = Math.floor((t - s.ini) / BAR) % s.acordes.length; return [s.acordes[k], s.baixo[k]]; };

// pad: 3 notas × 5 osciladores; filtro abre conforme o "brilho" da seção; respira no bumbo quando há ritmo
{
  const fases = new Float64Array(15).map(() => (ruido() + 1) / 2); let lp = 0, lpR = 0, brilho = 0.03;
  for (let i = 0; i < N; i++) {
    const t = i / SR, s = secao(t), [ac] = acorde(t); let l = 0, r = 0, k = 0;
    for (const nota of ac) for (let v = 0; v < 5; v++, k++) { fases[k] += hz(nota) * (1 + (v - 2) * 0.0035) / SR; const x = saw(fases[k]); if (v % 2) l += x; else r += x; }
    brilho += ((s.brilho ?? 0.06) - brilho) * 0.00002;
    lp += brilho * (l - lp); lpR += brilho * (r - lpR);
    const env = Math.min(1, t / 2) * (t > DUR - 2.5 ? Math.max(0, (DUR - t) / 2.5) : 1);
    const duck = s.ritmo ? 0.6 + 0.4 * Math.min(1, ((t % BEAT) / BEAT) * 3) : 1;
    add(i, lp * 0.026 * env * duck, lpR * 0.026 * env * duck);
  }
}
function bumbo(t0, f = 1) { const i0 = Math.round(t0 * SR); let fa = 0; for (let j = 0; j < SR * 0.45; j++) { const t = j / SR; fa += (48 + 110 * Math.exp(-t * 28)) / SR; add(i0 + j, Math.sin(2 * Math.PI * fa) * Math.exp(-t * 7.5) * f * 0.9 + (j < 90 ? ruido() * 0.25 * (1 - j / 90) : 0)); } }
function taiko(t0, f = 1) { const i0 = Math.round(t0 * SR); let fa = 0, lp = 0; for (let j = 0; j < SR * 0.9; j++) { const t = j / SR; fa += (62 + 70 * Math.exp(-t * 18)) / SR; lp += 0.08 * (ruido() - lp); add(i0 + j, (Math.sin(2 * Math.PI * fa) * Math.exp(-t * 4.5) + lp * Math.exp(-t * 30) * 0.8) * f * 0.8); } }
function palma(t0) { const i0 = Math.round(t0 * SR); let hp = 0, a0 = 0; for (let j = 0; j < SR * 0.22; j++) { const t = j / SR, n = ruido(); hp = 0.75 * (hp + n - a0); a0 = n; const a = Math.exp(-t * 18) * 0.28 * (t < 0.03 ? (Math.floor(t / 0.01) % 2 ? 0.6 : 1) : 1); add(i0 + j, hp * a * 0.9, hp * a * 1.1); } }
function chimbal(t0, f = 1, pan = 0) { const i0 = Math.round(t0 * SR); let hp = 0, a0 = 0; for (let j = 0; j < SR * 0.05; j++) { const n = ruido(); hp = 0.5 * (hp + n - a0); a0 = n; const a = Math.exp(-(j / SR) * 70) * 0.11 * f; add(i0 + j, hp * a * (1 - pan), hp * a * (1 + pan)); } }
function baixo(t0, nota, dur) { const i0 = Math.round(t0 * SR); let fa = 0; for (let j = 0; j < SR * dur; j++) { const t = j / SR; fa += hz(nota) / SR; const tri = 1 - 4 * Math.abs(fa - Math.floor(fa) - 0.5); add(i0 + j, (0.7 * Math.sin(2 * Math.PI * fa) + 0.3 * tri) * Math.min(1, t * 200) * Math.exp(-t * 5) * 0.3); } }
function pluck(t0, nota, f, pan) { const i0 = Math.round(t0 * SR); let fa = 0; for (let j = 0; j < SR * 0.35; j++) { const t = j / SR; fa += hz(nota) / SR; const x = Math.sin(2 * Math.PI * fa) + 0.35 * Math.sin(4 * Math.PI * fa) + 0.12 * saw(fa * 3), a = Math.exp(-t * 11) * 0.075 * f;
  for (const [at, g] of [[0, 1], [BEAT * 0.75, 0.35], [BEAT * 1.5, 0.15]]) add(i0 + j + Math.round(at * SR), x * a * g * (1 - pan), x * a * g * (1 + pan)); } }
function tique(t0, agudo) { const i0 = Math.round(t0 * SR); let fa = 0; for (let j = 0; j < SR * 0.04; j++) { fa += (agudo ? 3200 : 2300) / SR; const a = Math.exp(-(j / SR) * 160) * 0.16; add(i0 + j, Math.sin(2 * Math.PI * fa) * a * 0.9, Math.sin(2 * Math.PI * fa) * a); } }
function coracao(t0) { for (const [d, f] of [[0, 1], [0.22, 0.7]]) { const i0 = Math.round((t0 + d) * SR); let fa = 0; for (let j = 0; j < SR * 0.3; j++) { const t = j / SR; fa += (45 + 30 * Math.exp(-t * 30)) / SR; add(i0 + j, Math.sin(2 * Math.PI * fa) * Math.exp(-t * 14) * f * 0.85); } } }
function whoosh(tFim, dur = 0.8) { const i0 = Math.round((tFim - dur * 0.75) * SR); let lp = 0; for (let j = 0; j < SR * dur; j++) { const x = j / (SR * dur), env = Math.sin(Math.PI * Math.min(1, x)) ** 2; lp += (0.02 + 0.5 * env) * (ruido() - lp); const pan = Math.sin(x * Math.PI * 2) * 0.6; add(i0 + j, lp * env * 0.22 * (1 - pan), lp * env * 0.22 * (1 + pan)); } }
function riser(t0, t1) { const i0 = Math.round(t0 * SR), n = Math.round((t1 - t0) * SR); let lp = 0, fa = 0; for (let j = 0; j < n; j++) { const x = j / n; lp += (0.01 + 0.3 * x * x) * (ruido() - lp); fa += (200 + 1400 * x * x) / SR; add(i0 + j, (lp * 0.9 + Math.sin(2 * Math.PI * fa) * 0.25) * x * x * 0.18); } }
function impacto(t0) { const i0 = Math.round(t0 * SR); let fa = 0, hp = 0, a0 = 0; for (let j = 0; j < SR * 3.5; j++) { const t = j / SR; fa += (38 + 40 * Math.exp(-t * 6)) / SR; const n = ruido(); hp = 0.6 * (hp + n - a0); a0 = n; const v = Math.sin(2 * Math.PI * fa) * Math.exp(-t * 1.6) + hp * Math.exp(-t * 2.2) * 0.22; add(i0 + j, v, v * 0.97); } }

// arranjo por seção
const imp = new Set(CFG.impactos ?? []);
for (let t = 0, k = 0; t < DUR; t += BEAT / 2, k++) {
  const s = secao(t), [ac, bx] = acorde(t), noTempo = k % 2 === 0, tempo = Math.round(t / BEAT);
  if ([...imp].some((x) => t > x - 3.5 && t < x)) continue; // respiro antes de cada impacto (a subida ocupa o espaço)
  if (s.ritmo && noTempo) { bumbo(t, tempo % 4 === 0 ? 1 : 0.75); if (tempo % 4 === 0) taiko(t, 0.6); if (tempo % 2 === 1) palma(t); }
  if (s.ritmo && !noTempo) chimbal(t, 0.8, 0.2);
  if (s.ritmo && s.semicolcheias) { chimbal(t + BEAT / 4, 0.5, -0.25); }
  if (!s.ritmo && s.taikos && tempo % 4 === 0 && noTempo) taiko(t, 0.65);
  if (s.ritmo || s.baixo2) baixo(t, bx - 12 + (k % 2 ? 12 : 0), BEAT / 2 * 0.95);
  if (s.arpejo) pluck(t, ac[k % 3] + 12 + (k % 6 >= 3 ? 12 : 0), s.arpejo, k % 2 ? 0.35 : -0.35);
  if (s.tique && noTempo) tique(t, tempo % 2 === 0);
  if (s.coracao && noTempo && tempo % 2 === 0) coracao(t);
}
for (const t of CFG.trocas ?? []) whoosh(t);
for (const t of imp) { riser(t - 3.5, t); impacto(t); bumbo(t, 1.2); taiko(t, 1.3); }

// master
let pico = 0;
for (let i = 0; i < N; i++) { const t = i / SR, f = Math.min(1, t / 0.3) * (t > DUR - 1 ? Math.max(0, DUR - t) : 1); L[i] = Math.tanh(L[i] * 1.3) * f; R[i] = Math.tanh(R[i] * 1.3) * f; pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i])); }
const ganho = 0.7 / pico, buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * ganho * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * ganho * 32767), 46 + i * 4); }
writeFileSync(process.argv[3], buf);
console.log(`gravado ${process.argv[3]} (${DUR} s, ${CFG.bpm} BPM)`);
