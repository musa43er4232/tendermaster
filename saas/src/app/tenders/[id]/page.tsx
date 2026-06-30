import Link from 'next/link';
import { notFound } from 'next/navigation';
import * as store from '@/lib/store';
import { VerdictBadge, StatusDot, StatusPill, StatusChip } from '@/components/ui';
import { pkr, pkrM, fmtDate, daysUntil, safeJson } from '@/lib/util';
import type { VerdictReason } from '@/lib/types';
import { toggleChecklistItem, setOutcome, setTenderStatus } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function TenderDetail({ params }: { params: { id: string } }) {
  const t = store.getTender(params.id);
  if (!t) notFound();

  const reasons = safeJson<VerdictReason[]>(t.verdictReasons, []) ?? [];
  const haveCount = t.checklist.filter((c) => c.status === 'have').length;
  const d = daysUntil(t.submissionDeadline);
  const score = t.predictedScore ?? 0;
  const scoreColor = score >= 70 ? 'text-good' : score >= 45 ? 'text-warn' : 'text-bad';

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-muted hover:text-white">← Dashboard</Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={t.verdict} />
            <StatusChip status={t.status} />
            {t.workType && <span className="pill border border-line bg-white/5 capitalize text-muted">{t.workType}</span>}
          </div>
          <h1 className="text-xl font-extrabold leading-snug text-white">{t.title}</h1>
          <p className="text-sm text-muted">{t.agency}{t.refNo ? ` · ${t.refNo}` : ''}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-line bg-white/[0.03] px-5 py-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted2">Predicted score</div>
          <div className={`text-3xl font-extrabold ${scoreColor}`}>{score}<span className="text-base text-muted">/100</span></div>
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Estimated cost" value={pkrM(t.estimatedCostPkr)} />
        <Fact label="Bid security" value={t.earnestMoneyPkr ? `${pkr(t.earnestMoneyPkr)}` : '—'} sub={t.earnestMoneyPct ? `${t.earnestMoneyPct}%` : undefined} />
        <Fact label="Required PEC" value={t.requiredPecCat ? `${t.requiredPecCat} & above` : '—'} />
        <Fact label="Deadline" value={fmtDate(t.submissionDeadline)} sub={d != null ? (d >= 0 ? `${d}d left` : 'passed') : undefined} danger={d != null && d < 3} />
      </div>

      {/* Summary */}
      {t.summary && (
        <div className="card">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted">Plain-language summary</h2>
          <p className="text-sm leading-relaxed text-ink">{t.summary}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Eligibility breakdown */}
        <section className="card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Eligibility breakdown</h2>
          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-lineSoft bg-white/[0.02] px-3 py-2">
                <span className="mt-1"><StatusDot result={r.result} /></span>
                <div>
                  <div className="text-sm font-semibold text-ink">{r.label}</div>
                  <div className="text-xs text-muted">{r.detail}</div>
                </div>
              </li>
            ))}
            {reasons.length === 0 && <li className="text-sm text-muted">No checks recorded.</li>}
          </ul>
        </section>

        {/* Checklist */}
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Document checklist</h2>
            <span className="text-xs text-muted">{haveCount}/{t.checklist.length} ready</span>
          </div>
          <ul className="space-y-2">
            {t.checklist.map((c) => (
              <li key={c.id} className="rounded-lg border border-lineSoft bg-white/[0.02] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-ink">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <StatusPill status={c.status} />
                    <form action={toggleChecklistItem.bind(null, c.id, t.id)}>
                      <button className="rounded-md border border-line px-2 py-1 text-[11px] text-muted hover:border-purple hover:text-white">
                        {c.status === 'have' ? 'Unmark' : 'Mark have'}
                      </button>
                    </form>
                  </div>
                </div>
                {c.aiHelp && c.status !== 'have' && (
                  <p className="mt-1 text-xs text-purple-soft/80">💡 {c.aiHelp}</p>
                )}
              </li>
            ))}
          </ul>
          <button className="btn btn-primary mt-4 w-full opacity-60" disabled title="Coming next">
            Generate submission PDF →
          </button>
          <p className="mt-1 text-center text-[11px] text-muted2">PDF builder (with auto stamp &amp; signature) ships next.</p>
        </section>
      </div>

      {/* Lifecycle / outcome */}
      <section className="card">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Lifecycle</h2>
        {t.outcome ? (
          <p className="text-sm text-ink">
            Outcome recorded: <b className={t.outcome === 'won' ? 'text-good' : t.outcome === 'lost' ? 'text-bad' : 'text-warn'}>{t.outcome.toUpperCase()}</b>.
            {t.outcome === 'won' && ' Upload the Acceptance Letter to store the agreement amount (coming next).'}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">Update us once you hear back:</span>
            <form action={setTenderStatus.bind(null, t.id, 'submitted')}>
              <button className="btn btn-ghost text-xs">Mark submitted</button>
            </form>
            <form action={setOutcome.bind(null, t.id, 'won')}>
              <button className="btn text-xs bg-good/20 text-good border border-good/30 hover:-translate-y-0.5">Won 🏆</button>
            </form>
            <form action={setOutcome.bind(null, t.id, 'lost')}>
              <button className="btn text-xs bg-bad/15 text-bad border border-bad/30 hover:-translate-y-0.5">Lost</button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="card py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted2">{label}</div>
      <div className={`text-sm font-bold ${danger ? 'text-bad' : 'text-ink'}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
