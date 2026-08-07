/**
 * Variação de mensagem sem IA — anti-ban.
 *
 * WhatsApp (e o próprio Z-API) tende a sinalizar números que mandam o MESMO
 * texto, byte a byte, pra muitos destinatários em sequência. Em vez de reescrever
 * a mensagem com um modelo de linguagem (custo + chave de API), trocamos só
 * saudação/fechamento por sinônimos equivalentes já presentes no texto — o
 * conteúdo em si (o que a mensagem realmente diz) nunca é tocado.
 *
 * Cada grupo abaixo é uma lista de EQUIVALENTES no mesmo registro/sentido —
 * nunca cruza formalidade (não troca "Bom dia" por "Boa noite") nem gênero
 * (não troca "obrigado" por "obrigada"). Grupos mais específicos (frases
 * maiores) vêm antes dos mais genéricos pra evitar que uma troca "coma" parte
 * de uma frase maior ainda não processada.
 */

const SYNONYM_GROUPS: string[][] = [
  ["Muito obrigado", "Muito grato", "Grato desde já"],
  ["muito obrigado", "muito grato", "grato desde já"],
  ["Muito obrigada", "Muito grata", "Grata desde já"],
  ["muito obrigada", "muito grata", "grata desde já"],
  ["Um abraço", "Abraço", "Forte abraço"],
  ["um abraço", "abraço", "forte abraço"],
  ["Obrigado", "Grato"],
  ["obrigado", "grato"],
  ["Obrigada", "Grata"],
  ["obrigada", "grata"],
  ["Olá", "Oi", "Opa", "E aí"],
  ["olá", "oi", "opa", "e aí"],
  ["Conte comigo", "Pode contar comigo", "Estou à disposição"],
  ["conte comigo", "pode contar comigo", "estou à disposição"],
  ["tudo bem?", "tudo certo?", "como vai?"],
  ["Tudo bem?", "Tudo certo?", "Como vai?"],
];

// Emoji sutil no final — presença/ausência varia, nunca acrescenta texto.
const CLOSING_EMOJIS = ["", " 🙏", " 😊", " ✅", " 👍"];

/** Índice determinístico e bem distribuído a partir de um id qualquer (delivery.id). */
export function variantIndexFor(id: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

/**
 * Aplica variação determinística a uma mensagem já renderizada (placeholders
 * {nome}/{cidade} já substituídos). Mesmo `variantIndex` sempre produz o
 * mesmo resultado pra mesma mensagem — não é aleatório a cada chamada.
 */
export function applyMessageVariation(message: string, variantIndex: number): string {
  let result = message;

  for (const group of SYNONYM_GROUPS) {
    const original = group[0];
    const at = result.indexOf(original);
    if (at === -1) continue;
    const options = group.filter((w) => w !== original);
    const replacement = options[variantIndex % options.length];
    result = result.slice(0, at) + replacement + result.slice(at + original.length);
  }

  const emoji = CLOSING_EMOJIS[variantIndex % CLOSING_EMOJIS.length];
  return emoji ? `${result}${emoji}` : result;
}
