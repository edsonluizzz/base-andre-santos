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

export type ParsedOfxLedgerBalance = {
  bankId: string;
  branchId: string;
  acctId: string;
  balance: number;
  asOf: Date;
} | null;

export type ParsedOfx = {
  transactions: ParsedOfxTransaction[];
  ledgerBalance: ParsedOfxLedgerBalance;
};

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
  return match ? match[1].trim() : "";
}

function parseOfxDate(raw: string): Date | null {
  if (raw.length < 8) return null;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/**
 * Parser leve pro OFX 1.02/SGML exportado pelo internet banking do BB. Não usa
 * biblioteca externa — o formato é simples o bastante pra extrair com regex por
 * bloco: tags-folha vêm fechadas inline, mas <STMTTRN> não tem fechamento
 * explícito (delimitação é pelo próprio corte no split).
 */
export function parseOfx(text: string): ParsedOfx {
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
    const postedAt = parseOfxDate(dtposted);

    if (!Number.isFinite(amount) || !postedAt) continue;

    transactions.push({ bankId, branchId, acctId, fitid, trnType, amount, postedAt, name, memo: memo || null });
  }

  // <LEDGERBAL> é o saldo real informado pelo próprio banco (não uma soma
  // derivada das transações do arquivo) — mais confiável que somar TRNAMT,
  // já que o extrato pode não cobrir o histórico inteiro da conta.
  const ledgerMatch = text.match(/<LEDGERBAL>([\s\S]*?)<\/LEDGERBAL>/i);
  let ledgerBalance: ParsedOfxLedgerBalance = null;
  if (ledgerMatch) {
    const balAmt = Number(extractTag(ledgerMatch[1], "BALAMT"));
    const asOf = parseOfxDate(extractTag(ledgerMatch[1], "DTASOF"));
    if (Number.isFinite(balAmt) && asOf) {
      ledgerBalance = { bankId, branchId, acctId, balance: balAmt, asOf };
    }
  }

  return { transactions, ledgerBalance };
}

// Contas correntes BB (agência 1443) segregadas por origem de recurso, conforme TSE.
export const ACCOUNT_LABEL: Record<string, string> = {
  "57508": "Doações",
  "57509": "Fundo Partidário",
  "57510": "FEFC",
};

export function acctLabel(acctId: string): string {
  const label = ACCOUNT_LABEL[acctId];
  return label ? `${label} (...${acctId.slice(-4)})` : `Conta ...${acctId.slice(-4)}`;
}

/** Infere a forma de pagamento a partir do texto NAME/MEMO do OFX (heurística simples). */
export function inferPaymentMethod(name: string): "PIX" | "TRANSFERENCIA" | "BOLETO" | "OUTRO" {
  const s = name.toLowerCase();
  if (s.includes("pix")) return "PIX";
  if (s.includes("ted") || s.includes("doc") || s.includes("transf")) return "TRANSFERENCIA";
  if (s.includes("boleto") || s.includes("pagto de titulo") || s.includes("pagamento de titulo")) return "BOLETO";
  return "OUTRO";
}
