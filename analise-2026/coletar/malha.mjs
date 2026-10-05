// A malha do IBGE segue a RFC 7946 (anel externo anti-horário). O D3 trabalha na esfera e espera o
// contrário (externo horário, buracos anti-horários); sem ajuste, cada município vira "o mundo menos ele".

// Fórmula do laço em lon/lat: positiva = anti-horário.
export function areaAssinada(anel) {
  let s = 0;
  for (let i = 0; i < anel.length - 1; i++) s += anel[i][0] * anel[i + 1][1] - anel[i + 1][0] * anel[i][1];
  return s / 2;
}

const orientar = (anel, externo) => {
  const horario = areaAssinada(anel) < 0;
  return horario === externo ? anel : [...anel].reverse();
};
const poligono = (aneis) => aneis.map((anel, k) => orientar(anel, k === 0));

export function orientarParaD3(geo) {
  return {
    ...geo,
    features: geo.features.map((f) => {
      const g = f.geometry;
      const coordinates = g.type === "Polygon" ? poligono(g.coordinates)
        : g.type === "MultiPolygon" ? g.coordinates.map(poligono)
        : g.coordinates;
      return { ...f, geometry: { ...g, coordinates } };
    }),
  };
}
