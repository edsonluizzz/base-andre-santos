import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = 'C:\\Users\\usuario\\Downloads\\contatos Gospel Class 2026.csv';
const RESPONSAVEL_EMAIL = 'institutomarcospires@gmail.com';

const BATCH_SIZE = 500;
const LARANJA = 'FF6F00';
const AZUL   = '1A237E';

// ── Lê e parseia o CSV ────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function cleanPhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  // formata (41) 99999-9999
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return digits;
}

async function readRows() {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;
    const rl = createInterface({ input: createReadStream(CSV_PATH, 'utf8'), crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      const cols = parseCSVLine(line);
      if (!headers) { headers = cols.map(h => h.toLowerCase().trim()); return; }
      const row = {};
      headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
      rows.push(row);
    });
    rl.on('close', () => resolve({ headers, rows }));
    rl.on('error', reject);
  });
}

// ── Gera uma aba de lotes com estilo ─────────────────────────────────────────
function buildSheet(wb, sheetName, dataRows, isFirst) {
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

  const COLS = [
    { header: 'nome *',            key: 'nome',               width: 40 },
    { header: 'email',             key: 'email',              width: 36 },
    { header: 'telefone',          key: 'telefone',           width: 18 },
    { header: 'cidade',            key: 'cidade',             width: 22 },
    { header: 'canal',             key: 'canal',              width: 16 },
    { header: 'origem *',          key: 'origem',             width: 18 },
    { header: 'status',            key: 'status',             width: 10 },
    { header: 'perfil',            key: 'perfil',             width: 18 },
    { header: 'responsavel_email', key: 'responsavel_email',  width: 36 },
  ];

  ws.columns = COLS.map(c => ({ header: c.header, key: c.key, width: c.width }));

  ws.getRow(1).eachCell((cell, ci) => {
    const isReq = COLS[ci - 1]?.header.endsWith('*');
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isReq ? LARANJA : AZUL } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws.getRow(1).height = 32;

  dataRows.forEach((r, idx) => {
    const row = ws.addRow(r);
    const bg = idx % 2 === 0 ? 'F3F4F6' : 'FFFFFF';
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = { vertical: 'middle' };
    });
    // destaque na coluna origem
    const origemIdx = COLS.findIndex(c => c.key === 'origem') + 1;
    row.getCell(origemIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE7' } };
  });

  return ws;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const { rows } = await readRows();

const leads = [];
let semNome = 0, semContato = 0;

for (const r of rows) {
  const primeiroNome = (r['nome'] || '').trim();
  const sobrenome    = (r['sobrenome'] || '').trim();

  // monta nome completo sem duplicar o sobrenome
  let nome = primeiroNome;
  if (sobrenome && !primeiroNome.toLowerCase().includes(sobrenome.toLowerCase())) {
    nome = `${primeiroNome} ${sobrenome}`.trim();
  }

  if (!nome) { semNome++; continue; }

  const email    = (r['email 1'] || '').trim();
  const telefone = cleanPhone(r['telefone 1'] || r['telefone 2'] || '');
  const cidade   = (r['endereço 2 - cidade'] || '').trim();

  if (!email && !telefone) { semContato++; continue; }

  leads.push({
    nome,
    email,
    telefone,
    cidade,
    canal:              'Outro',
    origem:             'GOSPEL CLASS',
    status:             'LEAD',
    perfil:             'APOIADOR',
    responsavel_email:  RESPONSAVEL_EMAIL,
  });
}

console.log(`Total lido: ${rows.length} | Válidos: ${leads.length} | Sem nome: ${semNome} | Sem contato: ${semContato}`);

const numBatches = Math.ceil(leads.length / BATCH_SIZE);

for (let b = 0; b < numBatches; b++) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Base André Santos';
  wb.created = new Date();

  const slice = leads.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
  buildSheet(wb, 'Leads', slice, b === 0);

  const outPath = `C:\\Users\\usuario\\Downloads\\gospel-class-lote${b + 1}-de${numBatches}.xlsx`;
  await wb.xlsx.writeFile(outPath);
  console.log(`✅ Lote ${b + 1}/${numBatches}: ${slice.length} registros → ${outPath}`);
}

if (!RESPONSAVEL_EMAIL) {
  console.log('\n⚠️  RESPONSAVEL_EMAIL está vazio. Preencha com o e-mail do Marcos no sistema e gere novamente,');
  console.log('   ou preencha manualmente a coluna responsavel_email nas planilhas geradas.');
}
