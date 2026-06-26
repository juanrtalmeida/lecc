// Roda com: node scripts/smoke-real.mjs
// Usa o arquivo real anexado em .hermes/desktop-attachments para validar o parser.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL = path.resolve(
  HERE,
  '..',
  '.hermes',
  'desktop-attachments',
  '!2025-10-02_09h36m.txt',
);

let raw;
try {
  raw = fs.readFileSync(REAL, 'utf8');
} catch {
  console.log('Arquivo real não disponível neste diretório — pulando.');
  console.log('(Esperado em: ' + REAL + ')');
  process.exit(0);
}

const SECTION_HEAD_RE = /^([A-Za-z])\s*:\s*$/;
const HEADER_LINE_RE = /^([A-Za-z][A-Za-z0-9 _\/#().-]{0,40})\s*:\s*(.*)$/;
const SECTION_DATA_LINE_RE = /^\s*(\d+)\s*:\s*(.+?)\s*$/;

function parseMedPc(input) {
  const normalized = input.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n').map((l) => l.trimEnd());
  const header = {};
  const sections = {};
  let currentSection = null;
  let foundFirstSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (currentSection) sections[currentSection].push('');
      continue;
    }
    if (trimmed.startsWith('//')) continue;
    const sm = SECTION_HEAD_RE.exec(line);
    if (sm) {
      currentSection = sm[1].toUpperCase();
      foundFirstSection = true;
      if (!sections[currentSection]) sections[currentSection] = [];
      continue;
    }
    if (!foundFirstSection) {
      const hm = HEADER_LINE_RE.exec(line);
      if (hm) {
        const key = hm[1].trim();
        const value = hm[2].trim();
        if (value === '') {
          currentSection = key.toUpperCase();
          foundFirstSection = true;
          if (!sections[currentSection]) sections[currentSection] = [];
        } else {
          header[key] = value;
        }
        continue;
      }
      continue;
    }
    if (currentSection) sections[currentSection].push(line);
  }
  for (const k of Object.keys(sections)) {
    const arr = sections[k];
    while (arr.length && arr[arr.length - 1] === '') arr.pop();
  }
  return { header, sections };
}
function parseValue(token) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const m = /^(\d+)[.,](\d+)$/.exec(trimmed);
  if (!m) return null;
  const timestamp = parseInt(m[1], 10);
  const code = parseInt(m[2], 10);
  if (!Number.isFinite(timestamp) || !Number.isFinite(code)) return null;
  return { raw: trimmed, timestamp, time: timestamp / 100, code, section: '' };
}
function extractEvents(parsed) {
  const events = [];
  for (const [sectionName, lines] of Object.entries(parsed.sections)) {
    for (const line of lines) {
      const m = SECTION_DATA_LINE_RE.exec(line);
      if (m) {
        for (const v of m[2].split(/\s+/)) {
          const ev = parseValue(v);
          if (ev) events.push({ ...ev, section: sectionName });
        }
      } else {
        const ev = parseValue(line.trim());
        if (ev) events.push({ ...ev, section: sectionName });
      }
    }
  }
  events.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.section.localeCompare(b.section);
  });
  return events;
}

const parsed = parseMedPc(raw);
const events = extractEvents(parsed);

// Distribuição por sessão e código.
const bySession = new Map();
for (const e of events) {
  const cur = bySession.get(e.section) ?? new Map();
  cur.set(e.code, (cur.get(e.code) ?? 0) + 1);
  bySession.set(e.section, cur);
}

console.log('Arquivo real (!2025-10-02_09h36m.txt)');
console.log('  Tamanho:', raw.length, 'chars');
console.log('  Header:', Object.keys(parsed.header).length, 'campos');
console.log('  Sections:', Object.keys(parsed.sections).sort().join(', '));
console.log('  Eventos extraídos:', events.length);
console.log();
console.log('  Por sessão:');
for (const [name, m] of Array.from(bySession.entries()).sort()) {
  const codes = Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  const total = codes.reduce((s, c) => s + c[1], 0);
  console.log(
    `    ${name.padEnd(2)} (${total.toString().padStart(4)} total) ` +
      codes.map(([code, n]) => `${code}:${n}`).join(' '),
  );
}

// Conferir: na seção C do arquivo anexo, esperamos apenas 110/200 (resposta, reforço).
const cCodes = new Set((bySession.get('C') ?? new Map()).keys());
console.log('\n  Códigos únicos em C:', Array.from(cCodes).sort((a, b) => a - b));
console.log('  Esperado em C: 110, 200 (resposta e reforço).');
const dCodes = new Set((bySession.get('D') ?? new Map()).keys());
console.log('  Códigos únicos em D:', Array.from(dCodes).sort((a, b) => a - b));
console.log('  D contém trials de ITI/cycle (300/310/400/410/600).');

// Verificar alguns eventos icônicos do arquivo.
const expect1644_110 = events.find((e) => e.timestamp === 1644 && e.code === 110);
const expect1644_200 = events.find((e) => e.timestamp === 1644 && e.code === 200);
console.log('\n  (1644,110):', expect1644_110);
console.log('  (1644,200):', expect1644_200);
