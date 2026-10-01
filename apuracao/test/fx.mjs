import { readFileSync } from "node:fs";

export const fx = (nome) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), "utf8"));
