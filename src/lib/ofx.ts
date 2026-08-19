export type ParsedOfxTransaction = {
  bankId: string;
  branchId: string;
  acctId: string;
  fitid: string;
  trnType: string; // CREDIT | DEBIT
  amount: number;
  postedAt: Date;
  name: string;
  memo: string | null;
};

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
  return match ? match[1].trim() : "";
}

/**
 * Parser leve pro OFX 1.02/SGML exportado pelo internet banking do BB. Não usa
 * biblioteca externa — o formato é simples o bastante pra extrair com regex por
 * bloco: tags-folha vêm fechadas inline, mas <STMTTRN> não tem fechamento
 * explícito (delimitação é pelo próprio corte no split).
 */
export function parseOfx(text: string): ParsedOfxTransaction[] {
  const acctBlockMatch = text.match(/<BANKACCTFROM>([\s\S]*?)<\/BANKACCTFROM>/i);
  const acctBlock = acctBlockMatch ? acctBlockMatch[1] : text;
  const bankId = extractTag(acctBlock, "BANKID");
  const branchId = extractTag(acctBlock, "BRANCHID");
  const acctId = extractTag(acctBlock, "ACCTID");

  const blocks = text.split(/<STMTTRN>/i).slice(1);
  const transactions: ParsedOfxTransaction[] = [];

  for (const block of blocks) {
    const fitid = extractTag(block, "FITID");
    if (!fitid) continue; // linhas de saldo ("Saldo Anterior"/"Saldo do dia") não têm FITID — não são transações reais

    const trnType = extractTag(block, "TRNTYPE");
    const amount = Number(extractTag(block, "TRNAMT"));
    const dtposted = extractTag(block, "DTPOSTED");
    const name = extractTag(block, "NAME");
    const memo = extractTag(block, "MEMO");

    if (!Number.isFinite(amount) || dtposted.length < 8) continue;

    const year = Number(dtposted.slice(0, 4));
    const month = Number(dtposted.slice(4, 6));
    const day = Number(dtposted.slice(6, 8));
    const postedAt = new Date(Date.UTC(year, month - 1, day, 12));

    transactions.push({ bankId, branchId, acctId, fitid, trnType, amount, postedAt, name, memo: memo || null });
  }

  return transactions;
}

/** Infere a forma de pagamento a partir do texto NAME/MEMO do OFX (heurística simples). */
export function inferPaymentMethod(name: string): "PIX" | "TRANSFERENCIA" | "BOLETO" | "OUTRO" {
  const s = name.toLowerCase();
  if (s.includes("pix")) return "PIX";
  if (s.includes("ted") || s.includes("doc") || s.includes("transf")) return "TRANSFERENCIA";
  if (s.includes("boleto") || s.includes("pagto de titulo") || s.includes("pagamento de titulo")) return "BOLETO";
  return "OUTRO";
}
