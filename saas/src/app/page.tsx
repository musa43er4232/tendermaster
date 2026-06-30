import Link from 'next/link';
import { getCurrentCompany } from '@/lib/company';
import * as store from '@/lib/store';
import { VerdictBadge, StatusChip } from '@/components/ui';
import { pkrM, fmtDate, daysUntil } from '@/lib/util';
import { dismissReminder } from './actions';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const company = getCurrentCompany();
  if (!company) {
    return (
      <div className="card text-center">
        <p className="text-muted">No company found. Seed the database first:</p>
        <code className="mt-2 inline-block rounded bg-bg px-3 py-1 text-purple-soft">npm run db:seed</code>
      </div>
    );
  }

  const tenders = store.listTenders();
  const reminders = store.listReminders(true).slice(0, 6);
  const wonCount = tenders.filter((t) => t.status === 'won').length;
  const live = tenders.filter((t) => !['won', 'lost'].includes(t.status));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="kicker">Dashboard</span>
          <h1 className="mt-1 text-2xl font-extrabold text-white">{company.brandName || company.legalName}</h1>
          <p className="text-sm text-muted">{company.headOffice}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/company" className="rounded-xl border border-line bg-white/[0.03] px-4 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted2">Readiness</div>
            <div className="text-lg font-extrabold text-purple-soft">{company.readinessScore}%</div>
          </Link>
          <Link href="/tenders/new" className="btn btn-primary">+ New tender</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Live tenders', value: live.length },
          { label: 'Won', value: wonCount },
          { label: 'Total bids', value: tenders.length },
          { label: 'Open reminders', value: reminders.length },
        ].map((s) => (
          <div key={s.label} className="card py-4 text-center">
            <div className="text-3xl font-extrabold text-purple-bright">{s.value}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tenders list */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Your tenders</h2>
          {tenders.length === 0 ? (
            <div className="card text-center text-muted">
              <p>No tenders yet.</p>
              <Link href="/tenders/new" className="btn btn-primary mt-3">Upload your first tender</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tenders.map((t) => {
                const ready = t.checklist.filter((c) => c.status === 'have').length;
                const d = daysUntil(t.submissionDeadline);
                return (
                  <Link key={t.id} href={`/tenders/${t.id}`} className="card block transition hover:border-purple">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <VerdictBadge verdict={t.verdict} />
                          <StatusChip status={t.status} />
                        </div>
                        <h3 className="truncate text-sm font-semibold text-ink">{t.title}</h3>
                        <p className="truncate text-xs text-muted">{t.agency}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-extrabold text-purple-bright">{t.predictedScore ?? '—'}</div>
                        <div className="text-[10px] uppercase text-muted2">score</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                      <span className="rounded border border-line bg-white/[0.02] px-2 py-1">{pkrM(t.estimatedCostPkr)}</span>
                      <span className="rounded border border-line bg-white/[0.02] px-2 py-1">Docs {ready}/{t.checklist.length}</span>
                      {d != null && (
                        <span className={`rounded border px-2 py-1 ${d < 3 ? 'border-bad/40 text-bad' : 'border-line text-muted'}`}>
                          {d >= 0 ? `${d}d to deadline` : 'deadline passed'}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Reminders */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Reminders</h2>
          {reminders.length === 0 ? (
            <div className="card text-sm text-muted">Nothing due. 🎉</div>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => {
                const d = daysUntil(r.dueDate);
                return (
                  <div key={r.id} className="card flex items-start justify-between gap-2 p-3">
                    <div>
                      <p className="text-sm text-ink">{r.message}</p>
                      <p className={`text-xs ${d != null && d < 3 ? 'text-bad' : 'text-muted'}`}>
                        {fmtDate(r.dueDate)}{d != null ? ` · ${d >= 0 ? `in ${d}d` : `${-d}d ago`}` : ''}
                      </p>
                    </div>
                    <form action={dismissReminder.bind(null, r.id)}>
                      <button className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-white" title="Dismiss">✓</button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
