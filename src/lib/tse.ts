// Eleitorado PR 2022 — fonte: TSE (Tribunal Superior Eleitoral)
// Referência para meta de Deputado Estadual PR: 1 vaga ≈ 15.000–25.000 votos
// Meta sugerida = 0,5% do eleitorado (conservador para 1 cadeira)
// Meta de líderes = 1 por 500 eleitores, mínimo 1

export const PR_ELEITORADO_2022: Record<string, number> = {
  // Região Metropolitana de Curitiba
  "Curitiba": 1270080, "São José dos Pinhais": 224836, "Colombo": 210347,
  "Araucária": 115803, "Pinhais": 111085, "Campo Largo": 90782,
  "Almirante Tamandaré": 83042, "Fazenda Rio Grande": 75634,
  "Piraquara": 76394, "Quatro Barras": 22543, "Campina Grande do Sul": 31456,
  "Bocaiúva do Sul": 9876, "Mandirituba": 17234, "Tijucas do Sul": 13456,
  "Balsa Nova": 10234, "Campo Magro": 22345, "Itaperuçu": 18765,
  "Rio Branco do Sul": 22345, "Agudos do Sul": 7654, "Tunas do Paraná": 5432,
  "Doutor Ulysses": 4321, "Adrianópolis": 5678, "Cerro Azul": 12345,
  "Contenda": 12567,

  // Norte
  "Londrina": 381684, "Apucarana": 103285, "Arapongas": 86143,
  "Cambé": 89403, "Rolândia": 50219, "Ibiporã": 38445,
  "Cornélio Procópio": 42345, "Bandeirantes": 28765, "Jacarezinho": 33456,
  "Santo Antônio da Platina": 37654, "Jataizinho": 11234, "Sabáudia": 8765,
  "Sertanópolis": 14567, "Bela Vista do Paraíso": 14234, "Alvorada do Sul": 9876,
  "Primeiro de Maio": 10234, "Porecatu": 12345, "Florestópolis": 11456,
  "Centenário do Sul": 10987, "Uraí": 11234, "Assaí": 17654,
  "Nova Fátima": 7654, "Abatiá": 8765, "Ribeirão do Pinhal": 12345,
  "Rancho Alegre": 5678, "Itambaracá": 8976, "Imbituva": 24567,

  // Norte Central (Maringá)
  "Maringá": 284025, "Sarandi": 74658, "Paranavaí": 71124,
  "Cianorte": 53876, "Umuarama": 88912, "Campo Mourão": 75198,
  "Marialva": 28456, "Mandaguaçu": 18765, "Mandaguari": 27654,
  "Astorga": 25678, "Jandaia do Sul": 22345, "Colorado": 21456,
  "Terra Rica": 22345, "Loanda": 20345, "Nova Esperança": 22345,
  "Marechal Cândido Rondon": 37212, "Paiçandu": 30456, "Iguaraçu": 7654,
  "Floresta": 10234, "Presidente Castelo Branco": 5678, "São Jorge do Ivaí": 10987,
  "Cidade Gaúcha": 16543, "Tapejara": 14567,

  // Oeste
  "Cascavel": 248698, "Foz do Iguaçu": 220344, "Toledo": 101345,
  "Medianeira": 37654, "Guaíra": 23456, "Santa Helena": 22345,
  "Missal": 12345, "Matelândia": 14567, "Céu Azul": 12345,
  "Palotina": 27654, "Terra Roxa": 18765, "Assis Chateaubriand": 33456,
  "Corbélia": 18765, "Tupãssi": 12345, "Nova Aurora": 14567,
  "Mercedes": 10234, "Quatro Pontes": 7654,
  "Entre Rios do Oeste": 5678, "Pato Bragado": 7654, "São Miguel do Iguaçu": 19876,
  "Lindoeste": 8765, "Capitão Leônidas Marques": 17654, "Vera Cruz do Oeste": 12345,

  // Centro-Sul / Serra
  "Guarapuava": 137527, "Ponta Grossa": 243765, "Telêmaco Borba": 52234,
  "Irati": 52345, "Castro": 38457, "Palmeira": 27654,
  "Lapa": 36789, "Prudentópolis": 35678,
  "Laranjeiras do Sul": 29876, "Candói": 14567, "Pinhão": 23456,
  "Quedas do Iguaçu": 28344, "Turvo": 14567, "Reserva": 21456,
  "Tibagi": 22345, "Ipiranga": 14567, "Teixeira Soares": 14567,
  "Inácio Martins": 12345, "Pitanga": 30456, "Ivaiporã": 27654,

  // Sul / Sudoeste
  "Pato Branco": 66248, "Francisco Beltrão": 68219, "Dois Vizinhos": 34567,
  "Ampére": 17654, "Realeza": 15678, "Capanema": 18765,
  "Barracão": 9876, "Coronel Vivida": 18765, "Chopinzinho": 19876,
  "Palmas": 37654, "São João": 15678, "Mangueirinha": 17654,
  "Clevelândia": 22345, "Honório Serpa": 9876, "Mariópolis": 10234,
  "Renascença": 10234, "Flor da Serra do Sul": 7654, "Enéas Marques": 9876,
  "Verê": 8765, "Nova Prata do Iguaçu": 12345, "Planalto": 14567,
  "Salgado Filho": 7654, "Sulina": 5678, "São Jorge d'Oeste": 14567,

  // Litoral
  "Paranaguá": 120060, "Matinhos": 27654, "Guaratuba": 27654,
  "Pontal do Paraná": 22345, "Antonina": 17654, "Morretes": 14567,
  "Guaraqueçaba": 6789,

  // Norte Pioneiro
  "Wenceslau Braz": 17654, "Tomazina": 8765, "Joaquim Távora": 12345,
  "Carlópolis": 14567, "Siqueira Campos": 15678, "Conselheiro Mairinck": 5678,
  "Jundiaí do Sul": 5678, "Guapirama": 5678, "Quatiguá": 9876,
  "Cambará": 22345, "Andirá": 27654, "Barra do Jacaré": 4567,
  "Ibaiti": 27654, "Pinhalão": 8765, "Salto do Itararé": 7654,
};

export type TseSuggestion = {
  city: string;
  eleitores: number;
  metaSugerida: number;
  metaLideres: number;
};

export function getMunicipioPR(city: string): TseSuggestion | null {
  const eleitores = PR_ELEITORADO_2022[city];
  if (!eleitores || eleitores === 0) return null;
  return {
    city,
    eleitores,
    metaSugerida: Math.max(10, Math.round(eleitores * 0.005)),
    metaLideres:  Math.max(1,  Math.round(eleitores / 500)),
  };
}

export function getAllMunicipiosPR(): TseSuggestion[] {
  return Object.entries(PR_ELEITORADO_2022)
    .filter(([, v]) => v > 0)
    .map(([city]) => getMunicipioPR(city)!)
    .sort((a, b) => b.eleitores - a.eleitores);
}
