/**
 * Helpers de tempo. O MED-PC trabalha com "tenths of a second" como inteiro.
 * Convenções deste app:
 *  - timestamp "1644" → time (s) "16.440"
 *  - Para header, horários chegam como "9:36:59" — exibimos como string.
 *  - Duração calculada entre último e primeiro evento, em segundos.
 */

/**
 * Formata um timestamp (em décimos de segundo) como string "M:SS.mmm".
 * Para sessões inteiras, tratamos como um cronômetro que começa em 0.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const totalMs = Math.round(seconds * 1000);
  const totalSec = Math.floor(totalMs / 1000);
  const ms = totalMs % 1000;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/** "16.44s" — usado em legendas compactas. */
export function formatTimeShort(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  return `${seconds.toFixed(2)}s`;
}

/** "1:32:05" — para duração total. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const sec = Math.floor(totalSeconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** "10/02/25" → algo razoável para exibição; sem timezone. */
export function tryParseDate(input: string | undefined): Date | null {
  if (!input) return null;
  // dd/mm/yy[yy]
  const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(input.trim());
  if (m) {
    const day = Number.parseInt(m[1], 10);
    const month = Number.parseInt(m[2], 10) - 1;
    let year = Number.parseInt(m[3], 10);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Devolve "dd/mm/aa" ou o input se não parsear. */
export function formatDate(input: string | undefined): string {
  if (!input) return '—';
  const d = tryParseDate(input);
  if (!d) return input;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/** Headers chegam como "9:36:59" — exibimos como está. */
export function formatTimeRaw(value: string | undefined): string {
  if (!value) return '—';
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return value;
  const h = m[1];
  const min = m[2];
  const s = m[3] ?? '00';
  return `${h.padStart(2, '0')}:${min}:${s}`;
}

/** UUID v4 sem dependência externa. Bom o bastante para LocalStorage local. */
export function uuid(): string {
  // crypto.randomUUID é amplamente suportado nos navegadores atuais.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (não esperado em browser moderno).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Color helpers — usados na timeline para garantir contraste com bg. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const intVal = Number.parseInt(m[1], 16);
  const r = (intVal >> 16) & 0xff;
  const g = (intVal >> 8) & 0xff;
  const b = intVal & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Pequeno debounce util. */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
