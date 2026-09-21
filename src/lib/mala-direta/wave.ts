export function computeWaveSize(dailyLimit: number, sentLast24h: number, requested: number): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  const remaining = Math.max(0, dailyLimit - sentLast24h);
  return Math.min(Math.floor(requested), remaining);
}
