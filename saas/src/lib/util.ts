export function pkr(n?: number | null): string {
  if (n == null) return '—';
  return 'Rs ' + Math.round(n).toLocaleString('en-PK');
}

export function pkrM(n?: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(2)}M`;
  return pkr(n);
}

export function fmtDate(d?: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(d?: Date | string | null): number | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function safeJson<T>(s?: string | null, fallback?: T): T | undefined {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
