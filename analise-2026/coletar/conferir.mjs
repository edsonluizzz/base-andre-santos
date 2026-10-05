// A soma do CSV de seção por candidato tem que bater exatamente com o "vap" do resultado oficial.
export function conferir(candidatos, votosMun) {
  const divergentes = [];
  for (const c of candidatos) {
    let csv = 0;
    for (const v of votosMun.get(c.n)?.values() ?? []) csv += v;
    if (csv !== c.votos) divergentes.push({ n: c.n, nm: c.nm, oficial: c.votos, csv });
  }
  // Números no CSV que o oficial não lista: candidatos com registro indeferido. O TSE conta
  // esses votos como nulos técnicos ("vnt"); só informamos.
  const conhecidos = new Set(candidatos.map((c) => c.n));
  const desconhecidos = [...votosMun]
    .filter(([n]) => !conhecidos.has(n))
    .map(([n, porMun]) => ({ n, votos: [...porMun.values()].reduce((a, b) => a + b, 0) }));
  return { ok: divergentes.length === 0, divergentes, desconhecidos };
}
