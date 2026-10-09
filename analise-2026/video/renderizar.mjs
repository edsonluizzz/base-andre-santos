#!/usr/bin/env node
// Grava o vídeo quadro a quadro: abre o HTML no Chrome, posiciona a linha do tempo GSAP em cada quadro e
// manda as capturas para o ffmpeg (sem gravar em tempo real, então nada trava).
// Uso: node analise-2026/video/renderizar.mjs <arquivo.html> <saida.mp4> [fps=30] [ffmpeg=caminho] [audio.wav]
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "../../node_modules/playwright/index.mjs";

const [html, saida, fpsArg, ffmpegArg, audio] = process.argv.slice(2);
if (!html || !saida) { console.error("uso: renderizar.mjs <arquivo.html> <saida.mp4> [fps] [ffmpeg] [audio]"); process.exit(1); }
const FPS = Number(fpsArg ?? 30);
const FFMPEG = ffmpegArg ?? process.env.FFMPEG ?? "ffmpeg";

const b = await chromium.launch({ executablePath: `${process.env.HOME}/Desktop/Google Chrome.app/Contents/MacOS/Google Chrome` });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(pathToFileURL(resolve(html)).href);
await p.waitForFunction(() => window.__seek && window.__pronto);
await p.evaluate(() => window.__pronto);
const { w, h, dur } = await p.evaluate(() => ({ w: innerWidth, h: innerHeight, dur: window.__duracao }));
const total = Math.round(dur * FPS);

// Com áudio: entra como segunda faixa (AAC 192k) e o vídeo termina junto com a imagem.
const comAudio = audio ? ["-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest"] : [];
const ff = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", ...comAudio,
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", "-s", `${w}x${h}`, saida],
  { stdio: ["pipe", "ignore", "inherit"] });
for (let i = 0; i < total; i++) {
  await p.evaluate((t) => window.__seek(t), i / FPS);
  const quadro = await p.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(quadro)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 90 === 0) console.log(`quadro ${i}/${total}`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on("close", (c) => (c ? j(new Error(`ffmpeg saiu com ${c}`)) : r())));
await b.close();
console.log(`gravado ${saida} (${total} quadros, ${FPS} fps)`);
