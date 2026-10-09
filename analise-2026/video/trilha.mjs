#!/usr/bin/env node
// Trilha original do vídeo de lançamento (sintetizada aqui, sem direitos de terceiros).
// 120 BPM, 30 s, Lá menor (Am, F, C, G; 1 acorde por compasso de 2 s). As cenas trocam a cada 2 compassos
// (2, 6, 10, 14, 18, 22 s) e o slogan entra no impacto de 26 s; ver lancamento.html.
// Uso: node analise-2026/video/trilha.mjs <saida.wav>
import { writeFileSync } from "node:fs";

const SR = 44100, DUR = 30, N = SR * DUR, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
const L = new Float32Array(N), R = new Float32Array(N);
const TROCAS = [2, 6, 10, 14, 18, 22];
const IMPACTO = 26;

// ruído determinístico (o mesmo arquivo a cada execução)
let semente = 12345;
const ruido = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 2 ** 31 - 1; };
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };
const saw = (fase) => 2 * (fase - Math.floor(fase + 0.5));

// acordes (MIDI): Am, F, C, G
const ACORDES = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]];
const BAIXO = [45, 41, 48, 43];
const acordeEm = (t) => Math.floor(t / BAR) % 4;

// pad: 3 notas × 5 osciladores dente-de-serra desafinados, filtro passa-baixa de um polo que abre ao longo do vídeo
{
  const fases = new Float64Array(15).fill(0).map(() => (ruido() + 1) / 2);
  let lp = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, ac = ACORDES[acordeEm(t)];
    let l = 0, r = 0, k = 0;
    for (const nota of ac) for (let v = 0; v < 5; v++, k++) {
      const desafina = (v - 2) * 0.0035;
      fases[k] += (hz(nota) * (1 + desafina)) / SR;
      const s = saw(fases[k]);
      if (v % 2) l += s; else r += s;
    }
    const abre = t < IMPACTO ? 0.02 + 0.10 * Math.min(1, t / 22) : 0.16;
    lp += abre * (l - lp); lpR += abre * (r - lpR);
    const entrada = Math.min(1, t / 1.5), saida = t > 28.5 ? Math.max(0, (30 - t) / 1.5) : 1;
    // "respiração" no tempo do bumbo (sidechain) a partir de 2 s
    const fb = (t % BEAT) / BEAT, duck = t >= 2 && t < IMPACTO ? 0.55 + 0.45 * Math.min(1, fb * 3) : 1;
    const g = 0.022 * entrada * saida * duck;
    add(i, lp * g, lpR * g);
  }
}

// bumbo: seno com queda de afinação, em todos os tempos de 2 s até o impacto
function bumbo(t0, forca = 1) {
  const i0 = Math.round(t0 * SR); let fase = 0;
  for (let j = 0; j < SR * 0.45; j++) {
    const t = j / SR, f = 48 + 110 * Math.exp(-t * 28);
    fase += f / SR;
    const a = Math.exp(-t * 7.5) * forca * 0.9;
    const v = Math.sin(2 * Math.PI * fase) * a + (j < 90 ? ruido() * 0.25 * (1 - j / 90) : 0);
    add(i0 + j, v);
  }
}
// palmas: ruído em rajadas curtas nos tempos 2 e 4 a partir de 6 s
function palma(t0) {
  const i0 = Math.round(t0 * SR); let hp = 0, ant = 0;
  for (let j = 0; j < SR * 0.22; j++) {
    const t = j / SR, rajada = t < 0.03 ? (Math.floor(t / 0.01) % 2 ? 0.6 : 1) : 1;
    const n = ruido(); hp = 0.75 * (hp + n - ant); ant = n;
    const a = Math.exp(-t * 18) * 0.28 * rajada;
    add(i0 + j, hp * a * 0.9, hp * a * 1.1);
  }
}
// chimbal: ruído agudo bem curto; contratempos, e semicolcheias na subida
function chimbal(t0, forca = 1, pan = 0) {
  const i0 = Math.round(t0 * SR); let hp = 0, ant = 0;
  for (let j = 0; j < SR * 0.05; j++) {
    const n = ruido(); hp = 0.5 * (hp + n - ant); ant = n;
    const a = Math.exp(-(j / SR) * 70) * 0.11 * forca;
    add(i0 + j, hp * a * (1 - pan), hp * a * (1 + pan));
  }
}
// baixo: triângulo + seno em colcheias, colado ao acorde
function baixo(t0, nota, dur) {
  const i0 = Math.round(t0 * SR); let fase = 0;
  for (let j = 0; j < SR * dur; j++) {
    const t = j / SR; fase += hz(nota) / SR;
    const tri = 1 - 4 * Math.abs(fase - Math.floor(fase) - 0.5) ;
    const a = Math.min(1, t * 200) * Math.exp(-t * 5) * 0.3;
    add(i0 + j, (0.7 * Math.sin(2 * Math.PI * fase) + 0.3 * tri) * a);
  }
}
// arpejo: notas curtas e brilhantes, eco simples
function pluck(t0, nota, forca, pan) {
  const i0 = Math.round(t0 * SR); let fase = 0;
  for (let j = 0; j < SR * 0.35; j++) {
    const t = j / SR; fase += hz(nota) / SR;
    const s = Math.sin(2 * Math.PI * fase) + 0.35 * Math.sin(4 * Math.PI * fase) + 0.12 * saw(fase * 3);
    const a = Math.exp(-t * 11) * 0.075 * forca;
    for (const [atraso, ganho] of [[0, 1], [BEAT * 0.75, 0.35], [BEAT * 1.5, 0.15]]) {
      const k = i0 + j + Math.round(atraso * SR);
      add(k, s * a * ganho * (1 - pan), s * a * ganho * (1 + pan));
    }
  }
}
// whoosh: ruído com filtro que abre e fecha, terminando exatamente na troca de cena
function whoosh(tFim, dur = 0.7, forca = 1) {
  const i0 = Math.round((tFim - dur * 0.75) * SR); let lp = 0;
  for (let j = 0; j < SR * dur; j++) {
    const x = j / (SR * dur), env = Math.sin(Math.PI * Math.min(1, x)) ** 2;
    lp += (0.02 + 0.5 * env) * (ruido() - lp);
    const pan = Math.sin(x * Math.PI * 2) * 0.6;
    add(i0 + j, lp * env * 0.22 * forca * (1 - pan), lp * env * 0.22 * forca * (1 + pan));
  }
}
// subida (22–26 s): ruído que abre + seno que sobe, cada vez mais alto
function riser(t0, t1) {
  const i0 = Math.round(t0 * SR), n = Math.round((t1 - t0) * SR); let lp = 0, fase = 0;
  for (let j = 0; j < n; j++) {
    const x = j / n; lp += (0.01 + 0.3 * x * x) * (ruido() - lp);
    fase += (200 + 1400 * x * x) / SR;
    const a = x * x * 0.18;
    add(i0 + j, (lp * 0.9 + Math.sin(2 * Math.PI * fase) * 0.25) * a);
  }
}
// impacto: grave longo + ruído de prato
function impacto(t0) {
  const i0 = Math.round(t0 * SR); let fase = 0, hp = 0, ant = 0;
  for (let j = 0; j < SR * 3.5; j++) {
    const t = j / SR; fase += (38 + 40 * Math.exp(-t * 6)) / SR;
    const n = ruido(); hp = 0.6 * (hp + n - ant); ant = n;
    const v = Math.sin(2 * Math.PI * fase) * Math.exp(-t * 1.6) * 1.0 + hp * Math.exp(-t * 2.2) * 0.22;
    add(i0 + j, v, v * 0.97);
  }
}

// arranjo
for (let t = 2; t < IMPACTO; t += BEAT) bumbo(t, (Math.round(t / BEAT) % 4) === 0 ? 1 : 0.85);
for (let t = 6 + BEAT; t < IMPACTO; t += 2 * BEAT) palma(t);
for (let t = 2 + BEAT / 2; t < IMPACTO; t += BEAT) chimbal(t, 1, 0.2);
for (let t = 18; t < IMPACTO; t += BEAT / 4) chimbal(t, t > 22 ? 0.9 : 0.55, -0.25);
for (let t = 2; t < IMPACTO; t += BEAT / 2) {
  const c = acordeEm(t), off = (Math.round(t / (BEAT / 2)) % 2) ? 12 : 0;
  baixo(t, BAIXO[c] - 12 + off, BEAT / 2 * 0.95);
}
for (let t = 10, k = 0; t < IMPACTO; t += BEAT / 2, k++) {
  const ac = ACORDES[acordeEm(t)], nota = ac[k % 3] + 12 + (k % 6 >= 3 ? 12 : 0);
  pluck(t, nota, t >= 14 ? 1 : 0.7, k % 2 ? 0.35 : -0.35);
}
for (const t of TROCAS) whoosh(t, 0.75, t === 2 ? 1.3 : 1);
riser(22, IMPACTO);
impacto(IMPACTO);
bumbo(IMPACTO, 1.2);

// master: entrada suave, saturação leve, normaliza para -1 dBFS e grava WAV 16 bits estéreo
let pico = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR, f = Math.min(1, t / 0.3) * (t > 29.2 ? Math.max(0, (30 - t) / 0.8) : 1);
  L[i] = Math.tanh(L[i] * 1.3) * f; R[i] = Math.tanh(R[i] * 1.3) * f;
  pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
}
// pico em -3 dBFS deixa a trilha perto de -14 LUFS (padrão de Reels/WhatsApp)
const ganho = 0.7 / pico;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(L[i] * ganho * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * ganho * 32767), 46 + i * 4);
}
const saida = process.argv[2] ?? "trilha.wav";
writeFileSync(saida, buf);
console.log(`gravado ${saida} (${DUR} s, ${BPM} BPM)`);
