// Leitor dos CSVs de dados abertos do TSE: Latin-1, separador ";", campos de texto entre aspas
// (podem conter ";", quebra de linha e "" escapado), campos numéricos sem aspas.

export function campos(linha) {
  const out = [];
  const n = linha.length;
  let i = 0;
  while (true) {
    if (linha[i] === '"') {
      let valor = "";
      let j = i + 1;
      while (true) {
        const k = linha.indexOf('"', j);
        if (k === -1) { valor += linha.slice(j); j = n; break; }
        if (linha[k + 1] === '"') { valor += linha.slice(j, k) + '"'; j = k + 2; continue; }
        valor += linha.slice(j, k);
        j = k + 1;
        break;
      }
      out.push(valor);
      if (j >= n) break;
      i = j + 1; // pula o ";"
    } else {
      const k = linha.indexOf(";", i);
      if (k === -1) { out.push(linha.slice(i)); break; }
      out.push(linha.slice(i, k));
      i = k + 1;
    }
  }
  return out;
}

function aspasImpares(s) {
  let c = 0;
  for (let i = s.indexOf('"'); i !== -1; i = s.indexOf('"', i + 1)) c++;
  return c % 2 === 1;
}

export async function* linhasCsv(fonte) {
  const dec = new TextDecoder("latin1");
  let buf = "";
  let acumulado = null; // registro com aspas abertas: continua na próxima linha física
  const fechar = (linha) => {
    acumulado = acumulado === null ? linha : acumulado + "\n" + linha;
    if (aspasImpares(acumulado)) return null;
    const pronto = acumulado;
    acumulado = null;
    return pronto;
  };
  for await (const pedaco of fonte) {
    buf += typeof pedaco === "string" ? pedaco : dec.decode(pedaco, { stream: true });
    let ini = 0;
    let fim;
    while ((fim = buf.indexOf("\n", ini)) !== -1) {
      let linha = buf.slice(ini, fim);
      ini = fim + 1;
      if (linha.endsWith("\r")) linha = linha.slice(0, -1);
      const pronto = fechar(linha);
      if (pronto) yield campos(pronto);
    }
    buf = buf.slice(ini);
  }
  buf += dec.decode();
  if (buf.endsWith("\r")) buf = buf.slice(0, -1);
  if (buf !== "" || acumulado !== null) {
    const pronto = acumulado === null ? buf : acumulado + "\n" + buf;
    if (pronto) yield campos(pronto);
  }
}

export function indices(cabecalho, nomes, arquivo = "CSV") {
  const out = {};
  for (const nome of nomes) {
    const i = cabecalho.indexOf(nome);
    if (i === -1) throw new Error(`Coluna ${nome} ausente em ${arquivo}`);
    out[nome] = i;
  }
  return out;
}
