/**
 * Distribuições usadas na inferência da regressão (t de Student e F de Snedecor).
 * Sem bibliotecas externas — tudo em cima da função beta incompleta regularizada.
 *
 * Todas as funções são defensivas: devolvem NaN para graus de liberdade inválidos
 * ou entradas não finitas, nunca lançam.
 */

const LANCZOS = [
  76.18009172947146, -86.50532032941677, 24.01409824083091,
  -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
];

/** ln Γ(x), aproximação de Lanczos. Válida para x > 0. */
export function logGamma(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return NaN;
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += LANCZOS[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

const FPMIN = 1e-300;
const EPS = 3e-14;

/**
 * Fração continuada de I_x(a,b) (algoritmo modificado de Lentz).
 * Só converge bem para x < (a+1)/(a+b+2) — o wrapper cuida da troca.
 */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    // Passo par.
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    // Passo ímpar.
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Beta incompleta regularizada I_x(a, b), em [0, 1]. */
export function incompleteBeta(a: number, b: number, x: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(x)) return NaN;
  if (a <= 0 || b <= 0) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
      a * Math.log(x) + b * Math.log(1 - x),
  );
  // Troca para o lado de convergência rápida.
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaContinuedFraction(a, b, x)) / a;
  }
  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** P(|T| >= |t|) para T ~ t(df) — valor-p bicaudal. */
export function studentTTwoTailedP(t: number, df: number): number {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return NaN;
  const x = df / (df + t * t);
  return incompleteBeta(df / 2, 0.5, x);
}

/** CDF de t de Student: P(T <= t). */
export function studentTCdf(t: number, df: number): number {
  const p = studentTTwoTailedP(t, df);
  if (!Number.isFinite(p)) return NaN;
  return t >= 0 ? 1 - p / 2 : p / 2;
}

/** P(F >= f) para F ~ F(df1, df2) — cauda superior. */
export function fUpperTailP(f: number, df1: number, df2: number): number {
  if (!Number.isFinite(f) || !Number.isFinite(df1) || !Number.isFinite(df2)) return NaN;
  if (df1 <= 0 || df2 <= 0) return NaN;
  if (f <= 0) return 1;
  return incompleteBeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * f));
}

/**
 * Valor crítico bicaudal t_{1-alpha/2}(df) — usado no IC 95% dos coeficientes.
 * Busca binária sobre o valor-p (monótono decrescente em t).
 */
export function tCritical(df: number, alpha = 0.05): number {
  if (!Number.isFinite(df) || df <= 0) return NaN;
  let lo = 0;
  let hi = 1000;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (studentTTwoTailedP(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
