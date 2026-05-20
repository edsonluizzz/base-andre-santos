import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, 'leads-importacao.xlsx');

const wb = new ExcelJS.Workbook();
wb.creator = 'Base André Santos';
wb.created = new Date();

// ── Aba de valores válidos (hidden reference) ─────────────────────────────────
const ref = wb.addWorksheet('_listas', { state: 'veryHidden' });

const LISTAS = {
  cargo:        ['COORD_GERAL', 'COORD_REGIONAL', 'LIDER_MUNICIPAL', 'LIDER_BAIRRO', 'VOLUNTARIO'],
  status:       ['LEAD', 'ACTIVE', 'INACTIVE'],
  perfil:       ['PASTOR', 'LIDER_RELIGIOSO', 'PRESIDENTE_ASSOCIACAO', 'LIDER_POLITICO',
                 'VEREADOR', 'EMPRESARIO', 'LIDERANCA_COMUNITARIA', 'EDUCADOR', 'JOVEM', 'FAMILIA', 'APOIADOR'],
  status_apoio: ['CONFIRMADO', 'NEGOCIANDO', 'NEUTRO', 'ADVERSARIO'],
  canal:        ['Instagram', 'WhatsApp', 'Evento', 'Link de cadastro', 'Outro'],
  lgpd:         ['SIM', 'NAO'],
};

const listaRefs = {};
let colIdx = 1;
for (const [key, values] of Object.entries(LISTAS)) {
  const col = ref.getColumn(colIdx);
  col.header = key;
  values.forEach((v, i) => { ref.getCell(i + 2, colIdx).value = v; });
  const endRow = values.length + 1;
  const letter = col.letter;
  listaRefs[key] = `_listas!$${letter}$2:$${letter}$${endRow}`;
  colIdx++;
}

// ── Aba principal ─────────────────────────────────────────────────────────────
const ws = wb.addWorksheet('Leads', { views: [{ state: 'frozen', ySplit: 1 }] });

const COLUNAS = [
  { header: 'nome *',              key: 'nome',              width: 30, nota: 'Obrigatório. Nome completo.' },
  { header: 'email',               key: 'email',             width: 30, nota: 'E-mail do contato.' },
  { header: 'telefone',            key: 'telefone',          width: 18, nota: 'Ex: (41) 99999-9999' },
  { header: 'cep',                 key: 'cep',               width: 14, nota: 'CEP com ou sem hífen. Ex: 80010-010 ou 80010010. Se preenchido, o sistema preenche cidade e bairro automaticamente na importação.' },
  { header: 'cidade',              key: 'cidade',            width: 22, nota: 'Município do Paraná. Deixe em branco se preencher o CEP.' },
  { header: 'bairro',              key: 'bairro',            width: 22, nota: 'Bairro dentro do município. Deixe em branco se preencher o CEP.' },
  { header: 'origem *',            key: 'origem',            width: 28, nota: 'Obrigatório. De onde veio o lead. Ex: Culto Assembleia Vila Hauer, Evento 10mai, Panfletagem Centro, Indicação Pastor João.' },
  { header: 'canal',               key: 'canal',             width: 18, lista: 'canal',        nota: 'Canal de captação: Instagram | WhatsApp | Evento | Link de cadastro | Outro' },
  { header: 'perfil',              key: 'perfil',            width: 22, lista: 'perfil',       nota: 'Perfil do lead. Ver lista de valores.' },
  { header: 'cargo',               key: 'cargo',             width: 20, lista: 'cargo',        nota: 'Papel na estrutura. Default: VOLUNTARIO' },
  { header: 'status',              key: 'status',            width: 12, lista: 'status',       nota: 'LEAD = captado mas não ativado. ACTIVE = membro ativo. INACTIVE = inativo.' },
  { header: 'status_apoio',        key: 'status_apoio',      width: 16, lista: 'status_apoio', nota: 'CONFIRMADO | NEGOCIANDO | NEUTRO | ADVERSARIO' },
  { header: 'aniversario',         key: 'aniversario',       width: 14, nota: 'Formato: DD/MM/AAAA' },
  { header: 'lgpd_consentimento',  key: 'lgpd',              width: 20, lista: 'lgpd',         nota: 'SIM = autorizou uso dos dados. NAO = não autorizou.' },
  { header: 'observacoes',         key: 'observacoes',       width: 40, nota: 'Texto livre com informações adicionais sobre o lead.' },
];

// Definir colunas
ws.columns = COLUNAS.map(c => ({ header: c.header, key: c.key, width: c.width }));

// Estilo do cabeçalho
const AZUL_ESCURO  = '1A237E';
const AZUL_MEDIO  = '3949AB';
const LARANJA     = 'FF6F00';

ws.getRow(1).eachCell((cell, colNumber) => {
  const def = COLUNAS[colNumber - 1];
  const isRequired = def?.header.endsWith('*');
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isRequired ? LARANJA : AZUL_ESCURO } };
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = { bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } } };
});
ws.getRow(1).height = 36;

// Pré-popular 200 linhas com validação de dropdown e estilo zebra
for (let row = 2; row <= 201; row++) {
  const isEven = row % 2 === 0;
  const bgColor = isEven ? 'F3F4F6' : 'FFFFFF';

  COLUNAS.forEach((def, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'middle' };

    if (def.lista) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [listaRefs[def.lista]],
        showErrorMessage: true,
        errorTitle: 'Valor inválido',
        error: `Use um dos valores da lista para o campo "${def.header}".`,
      };
    }
  });

  // Coluna origem: destaque especial (fundo amarelo claro)
  const origemIdx = COLUNAS.findIndex(c => c.key === 'origem') + 1;
  const origemCell = ws.getCell(row, origemIdx);
  origemCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE7' } };
}

// ── Aba de instruções ─────────────────────────────────────────────────────────
const inst = wb.addWorksheet('Instruções');
inst.columns = [
  { header: 'Campo', key: 'campo', width: 22 },
  { header: 'Obrigatório?', key: 'obrig', width: 14 },
  { header: 'Valores aceitos / Descrição', key: 'desc', width: 80 },
];

inst.getRow(1).eachCell(cell => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_MEDIO } };
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
});
inst.getRow(1).height = 28;

COLUNAS.forEach((def, i) => {
  const row = inst.addRow({
    campo: def.header.replace(' *', ''),
    obrig: def.header.endsWith('*') ? 'SIM ⚠️' : 'Não',
    desc: def.nota + (LISTAS[def.lista] ? `\nValores: ${LISTAS[def.lista].join(' | ')}` : ''),
  });
  const bgColor = i % 2 === 0 ? 'F3F4F6' : 'FFFFFF';
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'top', wrapText: true };
  });
  row.height = 48;
});

// ── Salvar ────────────────────────────────────────────────────────────────────
await wb.xlsx.writeFile(OUTPUT);
console.log(`✅ Planilha gerada: ${OUTPUT}`);
