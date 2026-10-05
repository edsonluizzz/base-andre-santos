// A soma do CSV de seção por candidato tem que bater exatamente com o "vap" do resultado oficial.
export function conferir(candidatos, votosMun) {
  const divergentes = [];
  for (const c of candidatos) {
    let csv = 0;
    for (const v of votosMun.get(c.n)?.values() ?? []) csv += v;
    if (csv !== c.votos) divergentes.push({ n: c.n, nm: c.nm, oficial: c.votos, csv });
  }
  const conhecidos = new Set(candidatos.map((c) => c.n));
  const desconhecidos = [...votosMun.keys()].filter((n) => !conhecidos.has(n));
  return { ok: divergentes.length === 0 && desconhecidos.length === 0, divergentes, desconhecidos };
}
