import { describe, it, expect, beforeAll } from "vitest";
import { sendWave, sendTestEmail, type SendStore, type Mailer, type OutMessage, type ClaimedRow } from "./sender";

beforeAll(() => { process.env.UNSUBSCRIBE_SECRET = "segredo-de-teste"; });

type Row = { id: string; email: string; name: string; status: "PENDING" | "SENDING" | "SENT" | "FAILED"; sentAt?: Date };

function fakeStore(initialSentAt: Date[] = []) {
  const rows = new Map<string, Row>();
  const preSent = [...initialSentAt];
  let seq = 0;
  const store: SendStore = {
    async seed(rs) {
      for (const r of rs) if (!rows.has(r.email)) rows.set(r.email, { id: `id${++seq}`, ...r, status: "PENDING" });
    },
    async claim(limit) {
      const out: ClaimedRow[] = [];
      for (const r of rows.values()) {
        if (out.length >= limit) break;
        if (r.status === "PENDING") { r.status = "SENDING"; out.push({ id: r.id, email: r.email, name: r.name }); }
      }
      return out;
    },
    async markSent(id) { const r = [...rows.values()].find((x) => x.id === id)!; r.status = "SENT"; r.sentAt = new Date(); },
    async markFailed(id) { const r = [...rows.values()].find((x) => x.id === id)!; r.status = "FAILED"; },
    async countSentSince(since) {
      return preSent.filter((d) => d >= since).length + [...rows.values()].filter((r) => r.status === "SENT" && r.sentAt! >= since).length;
    },
  };
  return { store, rows };
}

function fakeMailer(failOnCall?: number) {
  const sent: OutMessage[] = [];
  let calls = 0;
  const mailer: Mailer = {
    async sendBatch(msgs) {
      calls++;
      if (failOnCall === calls) throw new Error("boom");
      sent.push(...msgs);
      return msgs.map((_, i) => `prov-${sent.length - msgs.length + i}`);
    },
  };
  return { mailer, sent };
}

const content = { subject: "S", bodyText: "Olá, {{nome}}!" };
const common = { content, appUrl: "https://x.com", from: "A <a@x.com>" };
const people = Array.from({ length: 5 }, (_, i) => ({ email: `p${i}@x.com`, name: `Pessoa${i} Sobrenome` }));

describe("sendWave", () => {
  it("envia só o que o teto diário permite", async () => {
    const { store } = fakeStore(Array.from({ length: 98 }, () => new Date()));
    await store.seed(people);
    const { mailer, sent } = fakeMailer();
    const r = await sendWave({ ...common, store, mailer, dailyLimit: 100, requested: 50 });
    expect(r).toMatchObject({ allowed: 2, claimed: 2, sent: 2, failed: 0 });
    expect(sent).toHaveLength(2);
  });

  it("não reenvia para quem já recebeu (idempotência entre ondas)", async () => {
    const { store } = fakeStore();
    await store.seed(people);
    await store.seed(people); // seed repetido não duplica
    const { mailer, sent } = fakeMailer();
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 3 });
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 3 });
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 3 });
    expect(sent.map((m) => m.to).sort()).toEqual(people.map((p) => p.email).sort());
  });

  it("personaliza, assina o descadastro por destinatário e envia headers one-click", async () => {
    const { store } = fakeStore();
    await store.seed([{ email: "maria@x.com", name: "Maria Silva" }]);
    const { mailer, sent } = fakeMailer();
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 10 });
    const m = sent[0];
    expect(m.html).toContain("Olá, Maria!");
    expect(m.html).toContain("https://x.com/descadastro?e=maria%40x.com&amp;t="); // "&" escapado no HTML
    expect(m.text).toContain("https://x.com/descadastro?e=maria%40x.com&t=");
    expect(m.headers["List-Unsubscribe"]).toContain("https://x.com/api/public/descadastro?e=maria%40x.com&t=");
    expect(m.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("falha do provedor marca FAILED e NÃO tenta de novo na próxima onda", async () => {
    const { store, rows } = fakeStore();
    await store.seed(people.slice(0, 2));
    const { mailer, sent } = fakeMailer(1);
    const r1 = await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 10 });
    expect(r1).toMatchObject({ claimed: 2, sent: 0, failed: 2 });
    const r2 = await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 10 });
    expect(r2.claimed).toBe(0);
    expect(sent).toHaveLength(0);
    expect([...rows.values()].every((x) => x.status === "FAILED")).toBe(true);
  });

  it("divide em lotes do tamanho pedido", async () => {
    const { store } = fakeStore();
    await store.seed(people);
    let batches = 0;
    const mailer: Mailer = { async sendBatch(m) { batches++; return m.map((_, i) => `p${i}`); } };
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 5, batchSize: 2 });
    expect(batches).toBe(3);
  });
});

describe("sendTestEmail", () => {
  it("envia uma mensagem [TESTE] para o destino", async () => {
    const { mailer, sent } = fakeMailer();
    await sendTestEmail({ ...common, mailer, to: "admin@x.com" });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("admin@x.com");
    expect(sent[0].subject).toBe("[TESTE] S");
  });
});
