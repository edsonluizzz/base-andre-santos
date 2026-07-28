const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function centenaPorExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]);
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhares = Math.floor(n / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhares > 0) {
    partes.push(milhares === 1 ? "mil" : `${centenaPorExtenso(milhares)} mil`);
  }
  if (resto > 0) partes.push(centenaPorExtenso(resto));
  return partes.join(milhares > 0 && resto > 0 ? (resto < 100 ? " e " : ", ") : "");
}

/** Converte um valor em reais (ex: 20.5) para texto por extenso em PT-BR ("vinte reais e cinquenta centavos"). */
export function valorPorExtenso(valor: number): string {
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  const reaisTxt = `${inteiroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}`;
  if (centavos === 0) return reaisTxt;
  const centavosTxt = `${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  return `${reaisTxt} e ${centavosTxt}`;
}
