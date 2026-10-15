#!/usr/bin/env python3
# Recorta o rosto da foto oficial do TSE: a cor do fundo vem das bordas (branco, verde etc.), um preenchimento a partir das
# bordas tira o fundo, o queixo sai da proporção da cabeça (altura ≈ 1,42 × largura) e uma elipse arredonda o queixo.
# Ampliado 4×. Uso: python3 rosto.py <foto.jpg> <saida.png> [--limiar 52] [--recorte x0,y0,x1,y1] [--queixo px]
# --recorte: corta antes a região da cabeça (foto de meio corpo); --limiar menor quando o fundo é cinza parecido com a pele.
import argparse, sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter
ap = argparse.ArgumentParser(); ap.add_argument("foto"); ap.add_argument("saida")
ap.add_argument("--limiar", type=float, default=52); ap.add_argument("--recorte"); ap.add_argument("--queixo", type=float, default=0); ap.add_argument("--local", type=float, help="fundo em degradê: cresce pelo fundo enquanto a cor muda menos que N de um pixel ao vizinho")
arg = ap.parse_args(); foto, saida, ajuste = arg.foto, arg.saida, arg.queixo
im = Image.open(foto).convert("RGB")
if arg.recorte: im = im.crop(tuple(int(v) for v in arg.recorte.split(",")))
E = 4 if not arg.recorte else int(round(4 * 161 / im.width * 0.62)) or 4
w, h = im.size; a = np.asarray(im).astype(float)
borda = np.concatenate([a[0], a[:, 0], a[:, -1], a[:12].reshape(-1, 3)])
cor = np.median(borda, 0)
dist = np.sqrt(((a - cor) ** 2).sum(2))
cand = dist < arg.limiar
fundo = np.zeros((h, w), bool); q = deque()
semente = (lambda y, x: a[y, x].mean() > 150) if arg.local else (lambda y, x: cand[y, x])
for y in range(h):
    for x in (0, w - 1):
        if semente(y, x): fundo[y, x] = True; q.append((y, x))
for x in range(w):
    if semente(0, x): fundo[0, x] = True; q.append((0, x))
claro = a.mean(2) > 150
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and not fundo[ny, nx]:
            ok = (np.abs(a[ny, nx] - a[y, x]).max() < arg.local and claro[ny, nx]) if arg.local else cand[ny, nx]
            if ok: fundo[ny, nx] = True; q.append((ny, nx))
pessoa = ~fundo
# silhueta: largura e centro por linha
larg = pessoa.sum(1); topo = int(np.argmax(larg > 3))
cols = [np.where(pessoa[y])[0] for y in range(h)]
cab = larg[topo:topo + int(h * .45)].max()                    # largura da cabeça
pesc = min(h - 1, int(topo + cab * 1.42))                       # queixo: cabeça (com cabelo) ≈ 1,42 × a largura
lin = [y for y in range(topo, pesc) if larg[y] > 0]
cx = float(np.mean([cols[y].mean() for y in lin]))
cy = topo + (pesc - topo) * .5
rx = cab / 2 * 1.02; ry = (pesc - cy) - 2 + ajuste
A = np.asarray(Image.fromarray(pessoa.astype(np.uint8) * 255).resize((w * E, h * E), Image.LANCZOS)).astype(float) / 255
Y, X = np.mgrid[0:h * E, 0:w * E].astype(float) / E
el = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2
A = np.where(Y >= cy, np.minimum(A, np.clip((1.0 - el) * 14, 0, 1)), A)
al = Image.fromarray((np.clip(A, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.6)).point(lambda v: 0 if v < 50 else min(255, int((v - 50) * 255 / 160)))
rgb = im.resize((w * E, h * E), Image.LANCZOS).filter(ImageFilter.UnsharpMask(3, 70, 2))
out = rgb.convert("RGBA"); out.putalpha(al); out = out.crop(out.getbbox()); out.save(saida)
print(saida, out.size, f"fundo={cor.astype(int).tolist()} topo={topo} cabeça={cab} pescoço={pesc}")
