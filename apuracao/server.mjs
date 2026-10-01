import http from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync, rmSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCargo } from "./lib/parse.mjs";
import { CHAVES, mesclarBlocos, montarEstado } from "./lib/estado.mjs";
import { criarStore } from "./lib/store.mjs";
import { baixarJson, baixarPrincipais, URL_ANDAMENTO, URL_MUNICIPIOS, urlMunicipio } from "./lib/tse.mjs";
import { coletarMunicipios, parseListaMunicipios, resumirMunicipios } from "./lib/municipios.mjs";
import { criarSimulador } from "./lib/simulador.mjs";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(RAIZ, "public");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

export function criarServidor({
  obterBrutos, obterMunicipios = null, store,
  intervaloMs = 60000, intervaloMunMs = 300000,
  simulacao = false, relogio = Date.now, resumir = (m) => m,
}) {
  let blocos = null;
  let estado = null;
  let municipiosCompleto = null;
  let municipios = null;
  let rodando = false;
  const clientes = new Set();
  const timers = [];

  function publicar() {
    const dados = `data: ${JSON.stringify(estado)}\n\n`;
    for (const c of clientes) c.write(dados);
  }

  async function ciclo() {
    if (rodando) return estado;
    rodando = true;
    try {
      const agora = relogio();
      let brutos = {};
      let erros = [];
      try {
        ({ brutos, erros } = await obterBrutos());
      } catch (e) {
        erros = [String(e?.message ?? e)];
      }
      const novos = {};
      for (const k of CHAVES) {
        try {
          novos[k] = brutos[k] ? parseCargo(brutos[k]) : null;
        } catch (e) {
          novos[k] = null;
          erros.push(`${k}: ${e.message}`);
        }
      }
      const m = mesclarBlocos(blocos, novos);
      blocos = m.blocos;
      estado = montarEstado({
        blocos, falhas: m.falhas, erros, anterior: estado,
        agora, proximaBuscaEm: agora + intervaloMs, simulacao, municipios,
      });
      if (estado.andre && estado.pr) {
        // Antes de a totalização começar tudo vem zerado; gravar esses pontos
        // esticaria o eixo do gráfico de evolução para dias antes da apuração.
        if (estado.andre.votos > 0 || estado.pr.secoesPct > 0) {
          store.registrar({ t: agora, votos: estado.andre.votos, secoesPct: estado.pr.secoesPct });
        }
        estado.andre.historico = store.historico();
      }
      store.salvarEstado(estado);
      publicar();
      return estado;
    } finally {
      rodando = false;
    }
  }

  async function cicloMunicipios() {
    if (!obterMunicipios) return;
    try {
      municipiosCompleto = await obterMunicipios(municipiosCompleto);
      municipios = resumir(municipiosCompleto);
      if (estado) {
        estado = { ...estado, municipios };
        publicar();
      }
    } catch (e) {
      console.error("[municípios]", e?.message ?? e);
    }
  }

  async function estatico(req, res) {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const arquivo = resolve(PUBLICO, "." + (caminho === "/" ? "/index.html" : caminho));
    if (arquivo !== PUBLICO && !arquivo.startsWith(PUBLICO + sep)) {
      res.writeHead(404).end();
      return;
    }
    try {
      const corpo = await readFile(arquivo);
      res.writeHead(200, {
        "content-type": MIME[extname(arquivo)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(corpo);
    } catch {
      res.writeHead(404).end();
    }
  }

  const server = http.createServer((req, res) => {
    const caminho = new URL(req.url, "http://x").pathname;
    if (caminho === "/api/state") {
      res.writeHead(estado ? 200 : 503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify(estado ?? { erro: "aguardando primeira leitura" }));
      return;
    }
    if (caminho === "/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      if (estado) res.write(`data: ${JSON.stringify(estado)}\n\n`);
      else res.write(": aguardando\n\n");
      clientes.add(res);
      req.on("close", () => clientes.delete(res));
      return;
    }
    estatico(req, res).catch(() => res.writeHead(500).end());
  });

  return {
    server,
    ciclo,
    cicloMunicipios,
    estado: () => estado,
    iniciar() {
      ciclo().then(() => cicloMunicipios());
      timers.push(setInterval(ciclo, intervaloMs));
      if (obterMunicipios) timers.push(setInterval(cicloMunicipios, intervaloMunMs));
      // Mantém a conexão SSE viva em proxies e no próprio Chrome.
      timers.push(setInterval(() => { for (const c of clientes) c.write(": ping\n\n"); }, 20000));
    },
    parar() {
      for (const t of timers) clearInterval(t);
      for (const c of clientes) c.end();
      server.close();
      server.closeAllConnections?.();
    },
  };
}

async function principal() {
  const simular = process.argv.includes("--simular");
  const porta = Number(process.env.PORTA ?? 4310);
  const fixture = (nome) => JSON.parse(readFileSync(join(RAIZ, "test", "fixtures", nome), "utf8"));
  const listaLocal = () => parseListaMunicipios(fixture("municipios-pr.json"));
  let opcoes;

  if (simular) {
    const dir = join(RAIZ, "data", "sim");
    rmSync(dir, { recursive: true, force: true });
    const sim = criarSimulador(Object.fromEntries(CHAVES.map((k) => [k, fixture(`${k}.json`)])));
    const lista = listaLocal();
    opcoes = {
      store: criarStore(dir),
      simulacao: true,
      intervaloMs: 10000,
      intervaloMunMs: 20000,
      obterBrutos: async () => ({ brutos: sim.proximo(), erros: [] }),
      obterMunicipios: async () => sim.municipios(lista, Date.now()),
    };
  } else {
    let lista;
    try {
      lista = parseListaMunicipios(await baixarJson(URL_MUNICIPIOS));
    } catch (e) {
      console.error("[municípios] lista do TSE indisponível, usando a cópia local:", e.message);
      lista = listaLocal();
    }
    opcoes = {
      store: criarStore(join(RAIZ, "data", "real")),
      obterBrutos: () => baixarPrincipais(),
      obterMunicipios: (anterior) =>
        coletarMunicipios({
          lista, anterior, agora: Date.now(),
          baixarAndamento: () => baixarJson(URL_ANDAMENTO),
          baixarMunicipio: (cd) => baixarJson(urlMunicipio(cd)),
        }),
    };
  }

  const app = criarServidor({ ...opcoes, resumir: resumirMunicipios });
  app.server.listen(porta, "127.0.0.1", () => {
    console.log(`Painel de apuração em http://localhost:${porta}${simular ? "  (SIMULAÇÃO)" : ""}`);
    app.iniciar();
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
