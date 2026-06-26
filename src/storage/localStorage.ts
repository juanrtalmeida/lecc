/**
 * Wrapper sobre LocalStorage com namespace e serialização JSON.
 * API mínima:
 *  - get<T>(key)
 *  - set<T>(key, value)
 *  - remove(key)
 *
 * Toda chamada try/catch para nunca quebrar a UX por quota corrompido.
 */

const NS = 'medpc-analyzer:v1:';

function safeParse<T>(raw: string | null): T | undefined {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function readKey<T>(key: string): T | undefined {
  try {
    if (typeof window === 'undefined') return undefined;
    return safeParse<T>(window.localStorage.getItem(NS + key));
  } catch {
    return undefined;
  }
}

export function writeKey<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    // QuotaExceeded ou serialização inválida — silenciamos e seguimos.
  }
}

export function removeKey(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(NS + key);
  } catch {
    /* noop */
  }
}

export function listKeys(prefix: string): string[] {
  const out: string[] = [];
  try {
    if (typeof window === 'undefined') return out;
    const fullPrefix = NS + prefix;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        out.push(k.slice(NS.length));
      }
    }
  } catch {
    /* noop */
  }
  return out;
}
