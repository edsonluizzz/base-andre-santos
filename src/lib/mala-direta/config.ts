export function getMalaDiretaConfig() {
  const from = process.env.MALA_DIRETA_FROM;
  const appUrl = process.env.MALA_DIRETA_APP_URL ?? process.env.APP_URL;
  if (!from) throw new Error("MALA_DIRETA_FROM ausente");
  if (!appUrl) throw new Error("MALA_DIRETA_APP_URL/APP_URL ausente");
  return {
    from,
    appUrl: appUrl.replace(/\/$/, ""),
    replyTo: process.env.MALA_DIRETA_REPLY_TO || undefined,
    dailyLimit: Number(process.env.MALA_DIRETA_DAILY_LIMIT ?? "100"),
  };
}
