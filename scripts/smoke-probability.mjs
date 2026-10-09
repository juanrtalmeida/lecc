// Smoke test da probabilidade condicional, da matriz de transição, do IC de Wilson
// e do diff do cabeçalho editado.
// Roda com: node scripts/smoke-probability.mjs

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
let checks = 0;
function ok(label, condition, detail = '') {
  checks++;
  if (!condition) failures++;
  console.log(`  ${condition ? '✓' : '✗'} ${label}${!condition && detail ? ` — ${detail}` : ''}`);
}

const out = path.join('node_modules', '.smoke', 'analysis');
const r = spawnSync('npx', ['vite', 'build', '--ssr', 'src/analysis/index.ts', '--outDir', out,
  '--minify', 'false', '--logLevel', 'error'], { cwd: ROOT, encoding: 'utf8' });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
const { conditionalProbability, transitionMatrix, wilsonInterval, resolveCustomAnalysis, headerChanges } =
  await import(`file://${path.join(ROOT, out, 'index.js')}`);

// A=1 (resposta), B=2 (reforço). Tempos em segundos.
const ev = (time, code) => ({ time, code, timestamp: time * 100 });
const events = [ev(0, 1), ev(2, 2), ev(10, 1), ev(11, 1), ev(20, 2), ev(30, 1)];
const ca = (extra) => ({
  id: 'x', name: 'x', from: { codes: [1] }, to: { codes: [2] },
  directionAfter: 'next', operation: 'Probabilidade', createdAt: '', ...extra,
});

console.log('\n1. P(B depois de A)');
{
  const a = conditionalProbability(events, ca({ windowSeconds: 5 }));
  ok('janela 5 s: só a origem em t=0 tem B → 1/4', a.successes === 1 && a.trials === 4, JSON.stringify(a));
  const b = conditionalProbability(events, ca({ untilNextFrom: true }));
  // t=0 → B(2) ✓; t=10 → próxima origem em 11 ✗; t=11 → B(20) ✓; t=30 → nada ✗
  ok('sem outra origem no meio → 2/4', b.successes === 2 && b.trials === 4, JSON.stringify(b));
  const c = conditionalProbability(events, ca({ windowSeconds: 10, untilNextFrom: true }));
  ok('janela 10 s + sem origem no meio → 2/4', c.successes === 2, JSON.stringify(c));
  const d = conditionalProbability(events, ca({ directionAfter: 'previous', windowSeconds: 10 }));
  // t=0 ✗; t=10 → B(2) a 8 s ✓; t=11 → B(2) a 9 s ✓; t=30 → B(20) a 10 s ✓ (extremo incluso)
  ok('direção anterior, 10 s → 3/4', d.successes === 3, JSON.stringify(d));
  const e = conditionalProbability(events, ca({ to: { codes: [1] }, windowSeconds: 1 }));
  ok('A → A em 1 s (repetição) → 1/4', e.successes === 1, JSON.stringify(e));
  const res = resolveCustomAnalysis({ events }, ca({ windowSeconds: 5 }));
  ok('resolveCustomAnalysis devolve proporção e n', res.value === 0.25 && res.sampleSize === 4 && res.successes === 1, JSON.stringify(res));
  const empty = resolveCustomAnalysis({ events }, ca({ from: { codes: [9] }, windowSeconds: 5 }));
  ok('sem origem → traço, não 0%', empty.value === null, JSON.stringify(empty));
}

console.log('\n2. Matriz de transição');
{
  const m = transitionMatrix(events);
  // Sequência 1 2 1 1 2 1 → 1→2 ×2, 2→1 ×2, 1→1 ×1
  ok('códigos ordenados', m.codes.join() === '1,2');
  ok('contagens', JSON.stringify(m.counts) === '[[1,2],[2,0]]', JSON.stringify(m.counts));
  ok('totais', m.total === 5 && m.rowTotals.join() === '3,2' && m.colTotals.join() === '3,2');
  ok('vazio não quebra', transitionMatrix([]).total === 0);
}

console.log('\n3. Wilson');
{
  const [lo, hi] = wilsonInterval(5, 10);
  ok('5/10 ≈ [0.237, 0.763]', Math.abs(lo - 0.2366) < 1e-3 && Math.abs(hi - 0.7634) < 1e-3, `${lo} ${hi}`);
  const [lo0] = wilsonInterval(0, 10);
  ok('0/10 começa em 0', lo0 === 0);
  ok('n=0 → null', wilsonInterval(0, 0) === null);
}

console.log('\n4. Cabeçalho editado');
{
  ok('nunca editado → sem mudanças', headerChanges({ header: { Subject: '1' } }).length === 0);
  const ch = headerChanges({
    header: { Subject: '2', Group: 'A' },
    headerOriginal: { Subject: '1', Box: '3' },
  });
  const kinds = Object.fromEntries(ch.map((c) => [c.field, c.kind]));
  ok('alterado / adicionado / removido', kinds.Subject === 'alterado' && kinds.Group === 'adicionado' && kinds.Box === 'removido', JSON.stringify(kinds));
  ok('voltar ao original zera', headerChanges({ header: { A: '1' }, headerOriginal: { A: '1' } }).length === 0);
}

console.log(`\n${checks - failures}/${checks} verificações passaram.`);
process.exit(failures === 0 ? 0 : 1);
