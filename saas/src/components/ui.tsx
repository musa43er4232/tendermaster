import type { ReactNode } from 'react';

export function VerdictBadge({ verdict }: { verdict?: string | null }) {
  const map: Record<string, { cls: string; icon: string; label: string }> = {
    eligible: { cls: 'bg-good/15 text-good border border-good/30', icon: '✓', label: 'Eligible' },
    eligible_with_gaps: { cls: 'bg-warn/15 text-warn border border-warn/30', icon: '▲', label: 'Eligible with gaps' },
    not_eligible: { cls: 'bg-bad/15 text-bad border border-bad/30', icon: '✕', label: 'Not eligible' },
    pending: { cls: 'bg-white/5 text-muted border border-line', icon: '…', label: 'Pending' },
  };
  const v = map[verdict ?? 'pending'] ?? map.pending;
  return (
    <span className={`pill ${v.cls}`}>
      <span className="mr-1">{v.icon}</span>
      {v.label}
    </span>
  );
}

export function StatusDot({ result }: { result?: string | null }) {
  const color = result === 'pass' || result === 'have' ? 'bg-good' : result === 'fail' ? 'bg-bad' : 'bg-warn';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    have: 'bg-good/15 text-good border border-good/30',
    missing: 'bg-bad/15 text-bad border border-bad/30',
    expired: 'bg-warn/15 text-warn border border-warn/30',
  };
  const label: Record<string, string> = { have: 'Have', missing: 'Missing', expired: 'Expired' };
  return <span className={`pill ${map[status] ?? map.missing}`}>{label[status] ?? status}</span>;
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    evaluating: 'bg-purple/15 text-purple-soft border border-line',
    preparing: 'bg-accent/15 text-accent border border-line',
    submitted: 'bg-white/5 text-muted border border-line',
    won: 'bg-good/15 text-good border border-good/30',
    lost: 'bg-bad/15 text-bad border border-bad/30',
  };
  return <span className={`pill capitalize ${map[status] ?? map.evaluating}`}>{status}</span>;
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted2">{label}</div>
      <div className="text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

export function ScoreRing({ score }: { score?: number | null }) {
  const s = score ?? 0;
  const color = s >= 70 ? 'text-good' : s >= 45 ? 'text-warn' : 'text-bad';
  return (
    <div className="flex items-baseline gap-1">
      <span className={`text-3xl font-extrabold ${color}`}>{s}</span>
      <span className="text-sm text-muted">/ 100</span>
    </div>
  );
}
