import test from "node:test";
import assert from "node:assert/strict";
import { areaAssinada, orientarParaD3 } from "../coletar/malha.mjs";

// Quadrado em lon/lat; anti-horário (padrão RFC 7946) tem área assinada positiva.
const antiHorario = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
const horario = [...antiHorario].reverse();

test("areaAssinada distingue o sentido do anel", () => {
  assert.equal(areaAssinada(antiHorario), 1);
  assert.equal(areaAssinada(horario), -1);
});

test("orientarParaD3: anel externo horário, buracos anti-horários, Polygon e MultiPolygon", () => {
  const buracoHorario = [[0.2, 0.2], [0.2, 0.4], [0.4, 0.4], [0.4, 0.2], [0.2, 0.2]];
  const geo = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { codarea: "1" }, geometry: { type: "Polygon", coordinates: [antiHorario, buracoHorario] } },
      { type: "Feature", properties: { codarea: "2" }, geometry: { type: "MultiPolygon", coordinates: [[horario], [antiHorario]] } },
    ],
  };
  const r = orientarParaD3(geo);
  const [p, mp] = r.features;
  assert.ok(areaAssinada(p.geometry.coordinates[0]) < 0);
  assert.ok(areaAssinada(p.geometry.coordinates[1]) > 0);
  for (const poligono of mp.geometry.coordinates) assert.ok(areaAssinada(poligono[0]) < 0);
  assert.equal(p.properties.codarea, "1");
  assert.equal(areaAssinada(geo.features[0].geometry.coordinates[0]), 1); // não altera a entrada
});
