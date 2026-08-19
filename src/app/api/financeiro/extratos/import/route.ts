import { NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { parseOfx, inferPaymentMethod } from "@/lib/ofx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MATCH_WINDOW_DAYS = 7;

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Requisição inválida (esperado multipart/form-data)" }, { status: 400 });
    }

    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    let autoMatched = 0;
    const errors: string[] = [];

    for (const file of files) {
      let text: string;
      try {
        text = await file.text();
      } catch {
        errors.push(`${file.name}: falha ao ler o arquivo`);
        continue;
      }

      const parsed = parseOfx(text);

      // Saldo real da conta (LEDGERBAL) — grava mesmo se não houver transação
      // nova no arquivo, e só sobrescreve se for mais recente que o que já tem.
      if (parsed.ledgerBalance) {
        const lb = parsed.ledgerBalance;
        const existingBalance = await gate.db.bankAccountBalance.findUnique({
          where: { campaignId_acctId: { campaignId: gate.cid, acctId: lb.acctId } },
        });
        if (!existingBalance || lb.asOf >= existingBalance.asOf) {
          await gate.db.bankAccountBalance.upsert({
            where: { campaignId_acctId: { campaignId: gate.cid, acctId: lb.acctId } },
            create: { campaignId: gate.cid, bankId: lb.bankId, branchId: lb.branchId, acctId: lb.acctId, balance: lb.balance, asOf: lb.asOf },
            update: { balance: lb.balance, asOf: lb.asOf },
          });
        }
      }

      if (parsed.transactions.length === 0) {
        continue; // extrato sem transações reais (só linhas de saldo) — não é erro
      }

      for (const tx of parsed.transactions) {
        const existing = await gate.db.bankTransaction.findUnique({
          where: { campaignId_acctId_fitid: { campaignId: gate.cid, acctId: tx.acctId, fitid: tx.fitid } },
        });
        if (existing) {
          skipped++;
          continue;
        }

        const created = await gate.db.bankTransaction.create({
          data: {
            campaignId: gate.cid,
            bankId: tx.bankId,
            branchId: tx.branchId,
            acctId: tx.acctId,
            fitid: tx.fitid,
            trnType: tx.trnType,
            amount: tx.amount,
            postedAt: tx.postedAt,
            name: tx.name,
            memo: tx.memo,
          },
        });
        imported++;

        // Conciliação automática: quando há exatamente 1 candidato (mesmo tipo,
        // valor exato, dentro da janela de dias), já vincula e marca como pago —
        // decisão explícita do usuário (revertendo o "só sugerir" inicial).
        // Zero ou mais de 1 candidato: fica UNMATCHED pra vínculo manual.
        const windowStart = new Date(tx.postedAt.getTime() - MATCH_WINDOW_DAYS * 86400000);
        const windowEnd = new Date(tx.postedAt.getTime() + MATCH_WINDOW_DAYS * 86400000);
        const candidates = await gate.db.financialEntry.findMany({
          where: {
            campaignId: gate.cid,
            status: { in: ["PENDENTE", "AGENDADO"] },
            type: tx.trnType === "DEBIT" ? "DESPESA" : "RECEITA",
            amount: Math.abs(tx.amount),
            date: { gte: windowStart, lte: windowEnd },
            bankTransaction: { is: null },
          },
        });

        if (candidates.length === 1) {
          const entry = candidates[0];
          await gate.db.$transaction(async (t) => {
            await t.bankTransaction.update({
              where: { id: created.id },
              data: { status: "MATCHED", matchedEntryId: entry.id },
            });
            await t.financialEntry.update({
              where: { id: entry.id },
              data: {
                status: "PAGO",
                date: tx.postedAt,
                paymentMethod: entry.paymentMethod ?? inferPaymentMethod(tx.name),
              },
            });
          }, { timeout: 30000 });
          autoMatched++;
        }
      }
    }

    return NextResponse.json({ imported, skipped, autoMatched, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error("[api/financeiro/extratos/import POST] erro:", err);
    return NextResponse.json({ error: "Erro ao importar extrato" }, { status: 500 });
  }
}
