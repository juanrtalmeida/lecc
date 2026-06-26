// Smoke test usando o arquivo real de exemplo (representativo).
// Roda com: node scripts/smoke-parser.mjs

import fs from 'node:fs';
import path from 'node:path';

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
  return { raw: trimmed, timestamp, time: timestamp / 100, code };
}

function extractEvents(parsed) {
  const events = [];
  for (const lines of Object.values(parsed.sections)) {
    for (const line of lines) {
      const m = SECTION_DATA_LINE_RE.exec(line);
      if (m) {
        for (const v of m[2].split(/\s+/)) {
          const ev = parseValue(v);
          if (ev) events.push(ev);
        }
      } else {
        const ev = parseValue(line.trim());
        if (ev) events.push(ev);
      }
    }
  }
  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}

// Mini-amostra representativa do arquivo real (apenas header + parte de A/B/C/D).
const INPUT = `Start Date: 10/02/25
End Date: 10/02/25
Subject: R12
Experiment: AUTOSHAPING
Group: BOX 4 SUBJ R12 EXPT
Box: 4
Start Time:  9:36:59
End Time: 10:09:04
MSN: AUTOSHAPING
E:       0.000
F:       0.000
G:       0.000
A:
     0:        2.000        0.000   180000.000       60.000        0.000
     5:      300.000        0.000      118.000      200.000        2.000
    10:        2.000
B:
     0:        1.000   121439.000   181639.000        0.000        0.000
     5:        5.000        0.000      200.000       17.000      200.000
C:
     0:     1644.110     1645.200     1964.110     1965.200     2314.110
     5:     2315.200     2872.110     2873.200     3001.110     3002.200
D:
     0:        0.100     1644.300     1645.400     1946.410     2265.300
     5:     2266.400     2567.410     2916.300     2917.400     2934.310
`;

const parsed = parseMedPc(INPUT);
const events = extractEvents(parsed);

let pass = true;
function assertEq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    pass = false;
    console.error(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}
function assertTrue(name, cond) {
  if (!cond) {
    pass = false;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// Checagens de header.
assertEq('header.Subject', parsed.header['Subject'], 'R12');
assertEq('header.Experiment', parsed.header['Experiment'], 'AUTOSHAPING');
assertEq('header.MSN', parsed.header['MSN'], 'AUTOSHAPING');
assertEq('header.E (scalar)', parsed.header['E'], '0.000');

// Seções detectadas.
assertEq('sections', Object.keys(parsed.sections).sort(), ['A', 'B', 'C', 'D']);

// Contagem de eventos esperada:
// - A:5+5+1 = 11 valores
// - B:5+5 = 10 valores
// - C:5+5 = 10 valores
// - D:5+5 = 10 valores
// = 41 eventos total
assertEq('events count', events.length, 41);

// Ordenação ascendente.
let sorted = true;
for (let i = 1; i < events.length; i++) {
  if (events[i].timestamp < events[i - 1].timestamp) sorted = false;
}
assertTrue('events sorted asc', sorted);

// Pelo menos 1 evento com timestamp > 0 E code != 0 (eventos reais).
const realEvents = events.filter((e) => e.code !== 0);
assertTrue('has real events (>0 timestamp)', realEvents.length > 0);

// Pelo menos 1 evento do code 110 e 1 do code 200 (do arquivo didático).
const codes = new Set(events.map((e) => e.code));
assertTrue('has code 110', codes.has(110));
assertTrue('has code 200', codes.has(200));
assertTrue('has code 410', codes.has(410));

// O arquivo real (preview na conversa) tem pelo menos 1 evento com timestamp 1644 e code 110 — do arquivo didático.
assertTrue('has (1644, 110)', events.some((e) => e.timestamp === 1644 && e.code === 110));

if (pass) {
  console.log('\nALL OK — parser real-shape smoke passed.');
} else {
  console.error('\nSMOKE FAILED');
  process.exit(1);
}
