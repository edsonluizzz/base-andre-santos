import http from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync, rmSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCargo } from "./lib/parse.mjs";
import { CHAVES, mesclarBlocos, montarEstado, montarPresidente } from "./lib/estado.mjs";
import { criarStore } from "./lib/store.mjs";
import { baixarJson, baixarPresidente, baixarPrincipais, URL_ANDAMENTO, URL_MUNICIPIOS, urlMunicipio } from "./lib/tse.mjs";
import { coletarMunicipios, parseListaMunicipios, resumirMunicipios } from "./lib/municipios.mjs";
import { criarSimulador } from "./lib/simulador.mjs";
import { acharChrome, criarGeradorPdf } from "./lib/pdf.mjs";
import { carregarDados2022, criarSimulador2022 } from "./lib/simulador2022.mjs";

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
  obterBrutos, obterMunicipios = null, obterPresidente = null, store,
  intervaloMs = 60000, intervaloMunMs = 300000, intervaloPresMs = 30000,
  simulacao = false, relogio = Date.now, resumir = (m) => m, foco, gerarPdf = null,
}) {
  let blocos = null;
  let estado = null;
  let municipiosCompleto = null;
  let municipios = null;
  let rodando = false;
  let rodandoMun = false;
  let rodandoPres = false;
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
      const anteriorPresEm = estado?.proximaPresEm;
      const m = mesclarBlocos(blocos, novos);
      blocos = m.blocos;
      estado = montarEstado({
        blocos, falhas: m.falhas, erros, anterior: estado,
        agora, proximaBuscaEm: agora + intervaloMs, simulacao, municipios, foco,
      });
      // O ciclo principal também traz presidente; o ciclo de 30 s mantém o próprio relógio.
      estado.presidenteAtualizadoEm = agora;
      estado.proximaPresEm = obterPresidente ? (anteriorPresEm ?? agora + intervaloPresMs) : estado.proximaBuscaEm;
      if (estado.andre && estado.pr) {
        // Antes de a totalização começar tudo vem zerado; gravar esses pontos
        // esticaria o eixo do gráfico de evolução para dias antes da apuração.
        // Falha de disco não pode derrubar a tela: o estado segue para a página.
        try {
          if (estado.andre.votos > 0 || estado.pr.secoesPct > 0) {
            store.registrar({ t: agora, votos: estado.andre.votos, secoesPct: estado.pr.secoesPct });
          }
          estado.andre.historico = store.historico();
        } catch (e) {
          console.error("[histórico]", e?.message ?? e);
        }
      }
      try {
        store.salvarEstado(estado);
      } catch (e) {
        console.error("[disco]", e?.message ?? e);
      }
      publicar();
      return estado;
    } finally {
      rodando = false;
    }
  }

  async function cicloPresidente() {
    if (!obterPresidente || !blocos || !estado || rodandoPres) return estado;
    rodandoPres = true;
    try {
      const agora = relogio();
      let brutos = {};
      try {
        ({ brutos } = await obterPresidente());
      } catch (e) {
        console.error("[presidente]", e?.message ?? e);
      }
      let atualizou = false;
      for (const k of ["presBr", "presPr"]) {
        try {
          if (brutos?.[k]) {
            blocos = { ...blocos, [k]: parseCargo(brutos[k]) };
            atualizou = true;
          }
        } catch (e) {
          console.error(`[presidente] ${k}:`, e?.message ?? e);
        }
      }
      estado = {
        ...estado,
        presidente: montarPresidente(blocos),
        presidenteAtualizadoEm: atualizou ? agora : estado.presidenteAtualizadoEm,
        proximaPresEm: agora + intervaloPresMs,
      };
      publicar();
      return estado;
    } finally {
      rodandoPres = false;
    }
  }

  async function cicloMunicipios() {
    if (!obterMunicipios || rodandoMun) return;
    rodandoMun = true;
    try {
      municipiosCompleto = await obterMunicipios(municipiosCompleto);
      municipios = resumir(municipiosCompleto);
      if (estado) {
        estado = { ...estado, municipios };
        publicar();
      }
    } catch (e) {
      console.error("[municípios]", e?.message ?? e);
    } finally {
      rodandoMun = false;
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
    let caminho;
    try {
      caminho = new URL(req.url, "http://x").pathname;
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (caminho === "/api/state") {
      res.writeHead(estado ? 200 : 503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify(estado ?? { erro: "aguardando primeira leitura" }));
      return;
    }
    if (caminho === "/api/municipios") {
      // Lista completa (os 399), para o relatório; a tela usa só os 30 primeiros.
      res.writeHead(municipiosCompleto ? 200 : 503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify(municipiosCompleto ?? { erro: "municípios ainda não coletados" }));
      return;
    }
    if (caminho === "/municipios.pdf") {
      if (!gerarPdf) {
        res.writeHead(501, { "content-type": "text/plain; charset=utf-8" });
        res.end("Chrome não encontrado para gerar o PDF. Abra /municipios.html e use Cmd+P → Salvar como PDF.");
        return;
      }
      const { port } = server.address();
      const d = new Date(relogio());
      const p2 = (n) => String(n).padStart(2, "0");
      const nome = `votos-por-municipio-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.pdf`;
      gerarPdf(`http://127.0.0.1:${port}/municipios.html`)
        .then((pdf) => {
          res.writeHead(200, { "content-type": "application/pdf", "content-disposition": `attachment; filename="${nome}"`, "cache-control": "no-store" });
          res.end(pdf);
        })
        .catch((e) => {
          console.error("[pdf]", e?.message ?? e);
          res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
          res.end("Falha ao gerar o PDF. Abra /municipios.html e use Cmd+P → Salvar como PDF.");
        });
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
    cicloPresidente,
    estado: () => estado,
    iniciar() {
      const seguro = () => ciclo().catch((e) => console.error("[ciclo]", e?.message ?? e));
      seguro().then(() => cicloMunicipios());
      timers.push(setInterval(seguro, intervaloMs));
      if (obterMunicipios) timers.push(setInterval(cicloMunicipios, intervaloMunMs));
      if (obterPresidente) timers.push(setInterval(cicloPresidente, intervaloPresMs));
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
  const porta = Number(process.env.PORTA ?? 4320);
  const fixture = (nome) => JSON.parse(readFileSync(join(RAIZ, "test", "fixtures", nome), "utf8"));
  const listaLocal = () => parseListaMunicipios(fixture("municipios-pr.json"));
  let opcoes;

  if (process.argv.includes("--simular-2022")) {
    // Reapresenta o 1º turno de 2022 com os resultados oficiais (volume real).
    const arg = (nome, padrao) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.split("=")[1] ?? padrao;
    const foco = arg("foco", "30123"); // mais votado do NOVO a estadual em 2022
    const dir = join(RAIZ, "data", "sim2022");
    rmSync(dir, { recursive: true, force: true });
    const sim = criarSimulador2022(carregarDados2022(join(RAIZ, "dados-2022", "pr-2022.json.gz")), {
      passos: Number(arg("passos", 60)), foco,
    });
    opcoes = {
      store: criarStore(dir),
      simulacao: "SIMULAÇÃO — RESULTADO OFICIAL DE 2022 (1º TURNO) REAPRESENTADO",
      foco,
      intervaloMs: 10000,
      intervaloMunMs: 20000,
      obterBrutos: async () => ({ brutos: sim.proximo(), erros: [] }),
      obterMunicipios: async () => sim.municipios(null, Date.now()),
    };
  } else if (simular) {
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
    // Começa com a cópia local para o painel subir na hora; a lista do TSE entra depois.
    let lista = listaLocal();
    baixarJson(URL_MUNICIPIOS)
      .then((json) => { lista = parseListaMunicipios(json); })
      .catch((e) => console.error("[municípios] lista do TSE indisponível, usando a cópia local:", e.message));
    opcoes = {
      store: criarStore(join(RAIZ, "data", "real")),
      obterBrutos: () => baixarPrincipais(),
      obterPresidente: () => baixarPresidente(),
      obterMunicipios: (anterior) =>
        coletarMunicipios({
          lista, anterior, agora: Date.now(),
          baixarAndamento: () => baixarJson(URL_ANDAMENTO),
          baixarMunicipio: (cd) => baixarJson(urlMunicipio(cd)),
        }),
    };
  }

  const chrome = acharChrome();
  const app = criarServidor({ ...opcoes, resumir: resumirMunicipios, gerarPdf: chrome ? criarGeradorPdf(chrome) : null });
  app.server.on("error", (e) => {
    console.error(`Não foi possível abrir a porta ${porta}: ${e.message}`);
    process.exit(1);
  });
  app.server.listen(porta, "127.0.0.1", () => {
    console.log(`Painel de apuração em http://localhost:${porta}${opcoes.simulacao ? "  (SIMULAÇÃO)" : ""}`);
    app.iniciar();
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
