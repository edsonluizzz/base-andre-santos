import { describe, it, expect } from "vitest";
import { computeWaveSize } from "./wave";

describe("computeWaveSize", () => {
  it("respeita o pedido quando há folga", () => {
    expect(computeWaveSize(500, 0, 200)).toBe(200);
  });
  it("limita ao que resta do teto diário", () => {
    expect(computeWaveSize(100, 95, 50)).toBe(5);
  });
  it("zera quando o teto já foi atingido ou estourado", () => {
    expect(computeWaveSize(100, 100, 50)).toBe(0);
    expect(computeWaveSize(100, 130, 50)).toBe(0);
  });
  it("trata pedido inválido como zero", () => {
    expect(computeWaveSize(100, 0, -5)).toBe(0);
    expect(computeWaveSize(100, 0, NaN)).toBe(0);
  });
});
