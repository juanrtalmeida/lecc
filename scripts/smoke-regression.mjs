// Smoke test do motor de regressão (OLS simples + múltipla) e da matriz de blocos.
// Roda com: node scripts/smoke-regression.mjs
//
// Os módulos são TypeScript, então o script compila src/analysis e src/parser com o
// vite que já é devDependency (sem instalar nada novo) e importa o resultado.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'node_modules', '.smoke');

let failures = 0;
let checks = 0;

function ok(label, condition, detail = '') {
  checks++;
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function near(label, actual, expected, tol = 1e-9) {
  const diff = Math.abs(actual - expected);
  ok(
    `${label} = ${expected}`,
    Number.isFinite(actual) && diff <= tol,
    `obtido ${actual} (dif ${diff.toExponential(2)})`,
  );
}

function build(entry, outName) {
  const r = spawnSync(
    'npx',
    ['vite', 'build', '--ssr', entry, '--outDir', path.join('node_modules', '.smoke', outName),
     '--minify', 'false', '--logLevel', 'error'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (r.status !== 0) {
    console.error(`Falha ao compilar ${entry}:\n${r.stderr || r.stdout}`);
    process.exit(1);
  }
  return path.join(OUT, outName, 'index.js');
}

console.log('Compilando módulos…');
const analysisEntry = build('src/analysis/index.ts', 'analysis');
const parserEntry = build('src/parser/index.ts', 'parser');

const {
  fitOls,
  buildBinnedDataset,
  prepareRegressionInput,
  recomputeAllRegressions,
  sliceAnalysis,
  studentTTwoTailedP,
  fUpperTailP,
} = await import(`file://${analysisEntry}`);
const { parseAndExtract } = await import(`file://${parserEntry}`);

// ---------------------------------------------------------------- 1. simples
console.log('\n1. Regressão simples — pontos (1,2) (2,4) (3,5) (4,4) (5,5)');
{
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 5, 4, 5];
  const fit = fitOls(y, [x], ['x']);
  ok('ajuste bem-sucedido', fit.ok, fit.reason);
  if (fit.ok) {
    // Conferência independente pela fórmula fechada.
    const mx = 3, my = 4;
    const sxy = x.reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0); // 6
    const sxx = x.reduce((a, v) => a + (v - mx) ** 2, 0); // 10
    const slope = sxy / sxx; // 0.6
    const intercept = my - slope * mx; // 2.2
    const sst = y.reduce((a, v) => a + (v - my) ** 2, 0); // 6
    const ssr = sst - slope * sxy; // 2.4
    const sigma2 = ssr / (x.length - 2); // 0.8

    near('β0 (intercepto)', fit.coefficients[0].beta, intercept, 1e-10);
    near('β1 (inclinação)', fit.coefficients[1].beta, slope, 1e-10);
    near('R²', fit.r2, 1 - ssr / sst, 1e-12);
    near('R² ajustado', fit.adjR2, 1 - (1 - (1 - ssr / sst)) * 4 / 3, 1e-12);
    near('σ residual', fit.residualStdError, Math.sqrt(sigma2), 1e-12);
    near('EP(β1)', fit.coefficients[1].stdError, Math.sqrt(sigma2 / sxx), 1e-12);
    // Com k = 1 vale a identidade F = t².
    near('F = t² do preditor', fit.f, fit.coefficients[1].t ** 2, 1e-9);
    near('p(F) = p(t) do preditor', fit.fPValue, fit.coefficients[1].pValue, 1e-9);
    ok('IC 95% contém β1', fit.coefficients[1].ciLow < slope && slope < fit.coefficients[1].ciHigh);
  }
}

// ------------------------------------------------------- 2. múltipla exata
console.log('\n2. Regressão múltipla exata — y = 3 + 2·x1 − 5·x2');
{
  const x1 = [1, 2, 3, 4, 5, 6, 7, 8];
  const x2 = [2, 1, 4, 3, 6, 5, 8, 7];
  const y = x1.map((v, i) => 3 + 2 * v - 5 * x2[i]);
  const fit = fitOls(y, [x1, x2], ['x1', 'x2']);
  ok('ajuste bem-sucedido', fit.ok, fit.reason);
  if (fit.ok) {
    ok('k = 2 preditores', fit.k === 2, `k=${fit.k}`);
    near('β0', fit.coefficients[0].beta, 3, 1e-9);
    near('β1', fit.coefficients[1].beta, 2, 1e-9);
    near('β2', fit.coefficients[2].beta, -5, 1e-9);
    near('R²', fit.r2, 1, 1e-12);
    ok('σ residual ≈ 0', Math.abs(fit.residualStdError) < 1e-9, String(fit.residualStdError));
    ok('resíduos ≈ 0', fit.residuals.every((r) => Math.abs(r) < 1e-9));
  }
}

// ------------------------------------------------------ 3. múltipla com ruído
console.log('\n3. Regressão múltipla com ruído determinístico');
{
  const n = 40;
  const x1 = [], x2 = [], y = [];
  for (let i = 0; i < n; i++) {
    const a = i;
    const b = (i * 7) % 13;
    // Ruído reprodutível, média ~0.
    const noise = Math.sin(i * 1.7) * 0.5;
    x1.push(a);
    x2.push(b);
    y.push(3 + 2 * a - 5 * b + noise);
  }
  const fit = fitOls(y, [x1, x2], ['x1', 'x2']);
  ok('ajuste bem-sucedido', fit.ok, fit.reason);
  if (fit.ok) {
    ok('β1 próximo de 2', Math.abs(fit.coefficients[1].beta - 2) < 0.05, String(fit.coefficients[1].beta));
    ok('β2 próximo de −5', Math.abs(fit.coefficients[2].beta + 5) < 0.05, String(fit.coefficients[2].beta));
    ok('0 < R² < 1', fit.r2 > 0.99 && fit.r2 < 1, String(fit.r2));
    ok('preditores significativos (p < 0.001)', fit.coefficients.slice(1).every((c) => c.pValue < 0.001));
    ok('n usado = 40', fit.n === 40, String(fit.n));
  }
}

// ------------------------------------------------------ 4. colinearidade
console.log('\n4. Colinearidade perfeita (x2 = 2·x1) e outros casos degenerados');
{
  const x1 = [1, 2, 3, 4, 5, 6];
  const x2 = x1.map((v) => 2 * v);
  const y = [2, 3, 5, 4, 6, 7];
  const fit = fitOls(y, [x1, x2], ['x1', 'x2']);
  ok('rejeita matriz singular', fit.ok === false, JSON.stringify(fit).slice(0, 80));
  ok('motivo menciona colinearidade', !fit.ok && /colinear/i.test(fit.reason), fit.reason);

  const few = fitOls([1, 2, 3], [[1, 2, 3], [4, 5, 7], [2, 9, 4]], ['a', 'b', 'c']);
  ok('rejeita n insuficiente', few.ok === false, JSON.stringify(few).slice(0, 80));

  const constY = fitOls([5, 5, 5, 5, 5], [[1, 2, 3, 4, 5]], ['x']);
  ok('rejeita Y constante', constY.ok === false, JSON.stringify(constY).slice(0, 80));

  const constX = fitOls([1, 2, 3, 4, 9], [[2, 2, 2, 2, 2]], ['x']);
  ok('rejeita X constante', constX.ok === false, JSON.stringify(constX).slice(0, 80));
}

// -------------------------------------------------------- 5. valores tabelados
console.log('\n5. Distribuições contra valores tabelados');
{
  near('p bicaudal de t = 2.228, df = 10', studentTTwoTailedP(2.228, 10), 0.05, 1e-3);
  near('p bicaudal de t = 2.086, df = 20', studentTTwoTailedP(2.086, 20), 0.05, 1e-3);
  near('p de F = 4.965, df = (1, 10)', fUpperTailP(4.965, 1, 10), 0.05, 1e-3);
  near('p de F = 4.103, df = (2, 10)', fUpperTailP(4.103, 2, 10), 0.05, 1e-3);
  // Para df1 = 2 a cauda superior tem forma fechada: (1 + 2f/df2)^(-df2/2).
  for (const [f, df2] of [[4.103, 10], [1.5, 7], [0.8, 25], [12, 3]]) {
    const closed = (1 + (2 * f) / df2) ** (-df2 / 2);
    near(`p de F = ${f}, df = (2, ${df2}) pela forma fechada`, fUpperTailP(f, 2, df2), closed, 1e-9);
  }
  ok('df inválido devolve NaN', Number.isNaN(studentTTwoTailedP(1, 0)));
}

// --------------------------------------------------- 6. blocos no arquivo real
console.log('\n6. Matriz de blocos sobre o arquivo real');
{
  const REAL = path.join(ROOT, '.hermes', 'desktop-attachments', '!2025-10-02_09h36m.txt');
  let raw = null;
  try {
    raw = fs.readFileSync(REAL, 'utf8');
  } catch {
    console.log('  – arquivo real indisponível, pulando esta seção.');
  }

  if (raw) {
    const { events } = parseAndExtract(raw);
    const analysis = { events, eventDefinitions: {}, customAnalysis: [] };
    const bin = 300;
    const ds = buildBinnedDataset(analysis, bin);

    const times = events.map((e) => e.time);
    const t0 = Math.min(...times);
    const span = Math.max(...times) - t0;
    ok(`n de blocos = floor(${span.toFixed(1)}s / ${bin}s)`, ds.rows.length === Math.floor(span / bin),
       `obtido ${ds.rows.length}`);

    const codes = Array.from(new Set(events.map((e) => e.code))).sort((a, b) => a - b);
    const cutoff = t0 + ds.rows.length * bin;
    let allMatch = true;
    for (const code of codes) {
      // Total no arquivo, excluindo o que caiu no bloco parcial descartado.
      const expected = events.filter((e) => e.code === code && e.time < cutoff).length;
      const got = ds.rows.reduce((a, r) => a + r[`n_${code}`], 0);
      if (expected !== got) {
        allMatch = false;
        console.log(`    code ${code}: esperado ${expected}, obtido ${got}`);
      }
    }
    ok(`soma das contagens bate para os ${codes.length} codes`, allMatch);

    const totalRows = ds.rows.reduce((a, r) => a + r.n_total, 0);
    ok('n_total soma o mesmo que os codes',
       totalRows === events.filter((e) => e.time < cutoff).length, String(totalRows));

    ok('taxa = contagem / minutos do bloco',
       ds.rows.every((r) => codes.every((c) =>
         Math.abs(r[`taxa_${c}`] - r[`n_${c}`] / (bin / 60)) < 1e-9)));

    // Regressão de verdade sobre o arquivo: reforços ~ respostas + tempo.
    if (codes.length >= 2) {
      const yVar = `n_${codes[1]}`;
      const xVars = [`n_${codes[0]}`, 't_ini'];
      const input = prepareRegressionInput(ds, yVar, xVars);
      const fit = fitOls(input.y, input.X, input.labels, input.ids);
      ok(`ajuste múltiplo ${yVar} ~ ${xVars.join(' + ')}`, fit.ok, fit.ok ? '' : fit.reason);
      if (fit.ok) {
        console.log(
          `    n=${fit.n} R²=${fit.r2.toFixed(4)} R²aj=${fit.adjR2.toFixed(4)} ` +
          `F=${fit.f.toFixed(3)} p=${fit.fPValue.toExponential(2)}`,
        );
        ok('3 coeficientes (intercepto + 2)', fit.coefficients.length === 3);
        ok('todos os valores são finitos',
           fit.coefficients.every((c) =>
             [c.beta, c.stdError, c.t, c.pValue, c.ciLow, c.ciHigh].every(Number.isFinite)));
      }
    }
  }
}

// ------------------------------------------- 7. modelo salvo (caminho da UI)
console.log('\n7. Modelo salvo — resolveRegression / recomputeAllRegressions');
{
  const REAL = path.join(ROOT, '.hermes', 'desktop-attachments', '!2025-10-02_09h36m.txt');
  let raw = null;
  try {
    raw = fs.readFileSync(REAL, 'utf8');
  } catch {
    console.log('  – arquivo real indisponível, pulando esta seção.');
  }

  if (raw) {
    const { events } = parseAndExtract(raw);
    const sections = Array.from(new Set(events.map((e) => e.section))).sort();
    const codes = Array.from(new Set(events.map((e) => e.code))).sort((a, b) => a - b);
    // Para o modelo por sessão, escolhe a seção com mais eventos (A/B/F/M do MED-PC
    // guardam parâmetros, não a sessão de interesse) e os dois codes mais frequentes
    // DELA — um code global pode não existir na seção escolhida.
    const section = sections
      .map((s) => ({ s, n: events.filter((e) => e.section === s).length }))
      .sort((a, b) => b.n - a.n)[0].s;
    const inSection = events.filter((e) => e.section === section);
    const freq = new Map();
    for (const e of inSection) freq.set(e.code, (freq.get(e.code) ?? 0) + 1);
    const topCodes = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);

    const analysis = {
      id: 'smoke',
      name: 'smoke',
      createdAt: '', updatedAt: '',
      header: {},
      eventDefinitions: {},
      events,
      customAnalysis: [],
      regressions: [
        {
          id: 'm1',
          name: 'todas as sessões',
          session: 'ALL',
          binSeconds: 60,
          yVariable: `n_${codes[1]}`,
          xVariables: [`n_${codes[0]}`, 't_ini'],
          createdAt: '',
        },
        {
          id: 'm2',
          name: `sessão ${section}`,
          session: section,
          binSeconds: 60,
          yVariable: `n_${topCodes[0]}`,
          xVariables: [`n_${topCodes[1]}`],
          createdAt: '',
        },
        {
          id: 'm3',
          name: 'bloco impossível',
          session: 'ALL',
          binSeconds: 999999,
          yVariable: `n_${codes[1]}`,
          xVariables: [`n_${codes[0]}`],
          createdAt: '',
        },
      ],
    };

    const recomputed = recomputeAllRegressions(analysis);
    const [m1, m2, m3] = recomputed.regressions;

    ok('modelo ALL calculado', m1.result?.ok === true, m1.result?.reason);
    ok('modelo por sessão calculado', m2.result?.ok === true, m2.result?.reason);
    ok('bloco maior que a sessão é rejeitado com motivo',
       m3.result?.ok === false && /bloco/i.test(m3.result.reason), m3.result?.reason);

    // Um code que não ocorre na sessão escolhida não pode virar NaN silencioso.
    const absent = codes.find((c) => !freq.has(c));
    if (absent != null) {
      const orphan = recomputeAllRegressions({
        ...analysis,
        regressions: [{ ...analysis.regressions[1], id: 'm4', yVariable: `n_${absent}` }],
      }).regressions[0];
      ok(`variável ausente na sessão (n_${absent}) é rejeitada com motivo claro`,
         orphan.result?.ok === false && /indispon/i.test(orphan.result.reason),
         orphan.result?.reason);
    }

    // O cache gravado tem de bater com o cálculo direto — é o que a tela relê após F5.
    const ds = buildBinnedDataset(sliceAnalysis(analysis, 'ALL'), 60);
    const input = prepareRegressionInput(ds, m1.yVariable, m1.xVariables);
    const direct = fitOls(input.y, input.X, input.labels, input.ids);
    ok('R² cacheado == R² recalculado', direct.ok && m1.result.r2 === direct.r2,
       `${m1.result?.r2} vs ${direct.ok ? direct.r2 : direct.reason}`);
    ok('coeficientes cacheados == recalculados',
       direct.ok && JSON.stringify(m1.result.coefficients) === JSON.stringify(direct.coefficients));
    ok('resultado cacheado é serializável (sem fitted/residuals)',
       m1.result.fitted === undefined && m1.result.residuals === undefined &&
       JSON.parse(JSON.stringify(m1.result)).r2 === m1.result.r2);

    // A sessão realmente restringe os dados: o modelo por seção tem de bater com o
    // cálculo direto sobre a fatia, e não com o cálculo sobre todos os eventos.
    const dsSection = buildBinnedDataset(sliceAnalysis(analysis, section), 60);
    const inSec = prepareRegressionInput(dsSection, m2.yVariable, m2.xVariables);
    const fitSec = fitOls(inSec.y, inSec.X, inSec.labels, inSec.ids);
    ok('modelo por sessão == cálculo direto sobre a fatia',
       fitSec.ok && m2.result.r2 === fitSec.r2, `${m2.result.r2} vs ${fitSec.r2 ?? fitSec.reason}`);

    const dsAll = buildBinnedDataset(analysis, 60);
    const inAll = prepareRegressionInput(dsAll, m2.yVariable, m2.xVariables);
    const fitAll = fitOls(inAll.y, inAll.X, inAll.labels, inAll.ids);
    ok('a fatia difere de ALL para as mesmas variáveis',
       !fitAll.ok || fitAll.r2 !== fitSec.r2,
       `ALL R²=${fitAll.r2} seção R²=${fitSec.r2}`);

    console.log(
      `    ALL: n=${m1.result.n} R²=${m1.result.r2.toFixed(4)} · ` +
      `${section}: n=${m2.result.n} R²=${m2.result.r2.toFixed(4)}`,
    );

    // Análise antiga (sem o campo regressions) não pode quebrar.
    const legacy = { ...analysis, regressions: undefined };
    ok('análise sem regressions passa incólume', recomputeAllRegressions(legacy) === legacy);
  }
}

console.log(`\n${checks - failures}/${checks} verificações passaram.`);
process.exit(failures === 0 ? 0 : 1);
