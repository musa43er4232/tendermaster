import Link from 'next/link';
import { getCurrentCompany } from '@/lib/company';
import * as store from '@/lib/store';
import { matchLead } from '@/lib/discovery';
import { pkrM, fmtDate, daysUntil } from '@/lib/util';
import { importLead, dismissLead, refreshFeed } from './actions';

export const dynamic = 'force-dynamic';

const FIT_STYLE: Record<string, { cls: string; label: string }> = {
  strong: { cls: 'bg-good/15 text-good border border-good/30', label: 'Strong match' },
  possible: { cls: 'bg-warn/15 text-warn border border-warn/30', label: 'Worth a look' },
  weak: { cls: 'bg-bad/15 text-bad border border-bad/30', label: 'Long shot' },
};

export default function Discover() {
  const company = getCurrentCompany();
  if (!company) return <div className="card text-muted">No company found.</div>;

  const leads = store.listLeads('new');
  const scored = leads
    .map((lead) => ({ lead, match: matchLead(company, lead) }))
    .sort((a, b) => b.match.score - a.match.score);

  const importedCount = store.listLeads('imported').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="kicker">Discover</span>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Tenders matched to your firm</h1>
          <p className="text-sm text-muted">
            Auto-scanned from PPRA, EPADS &amp; press, then pre-screened against your PEC category, registrations and experience.
          </p>
        </div>
        <form action={refreshFeed}>
          <button className="btn btn-ghost text-sm">↻ Refresh feed</button>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card py-4 text-center"><div className="text-2xl font-extrabold text-purple-bright">{scored.length}</div><div className="text-[11px] uppercase tracking-wide text-muted">New matches</div></div>
        <div className="card py-4 text-center"><div className="text-2xl font-extrabold text-good">{scored.filter((s) => s.match.fit === 'strong').length}</div><div className="text-[11px] uppercase tracking-wide text-muted">Strong fit</div></div>
        <div className="card py-4 text-center"><div className="text-2xl font-extrabold text-purple-bright">{importedCount}</div><div className="text-[11px] uppercase tracking-wide text-muted">In your pipeline</div></div>
      </div>

      {scored.length === 0 ? (
        <div className="card text-center text-muted">
          <p>No new matches right now.</p>
          <p className="mt-1 text-xs text-muted2">New opportunities appear here as they&apos;re published. Try “Refresh feed”.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scored.map(({ lead, match }) => {
            const fit = FIT_STYLE[match.fit];
            const d = daysUntil(lead.submissionDeadline);
            return (
              <div key={lead.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`pill ${fit.cls}`}>{fit.label}</span>
                      <span className="pill border border-line bg-white/5 text-muted">{lead.source}</span>
                      {lead.workType && <span className="pill border border-line bg-white/5 capitalize text-muted">{lead.workType}</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-ink">{lead.title}</h3>
                    <p className="text-xs text-muted">{lead.agency}{lead.city ? ` · ${lead.city}` : ''}{lead.refNo ? ` · ${lead.refNo}` : ''}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-extrabold text-purple-bright">{match.score}</div>
                    <div className="text-[10px] uppercase text-muted2">fit score</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                  <span className="rounded border border-line bg-white/[0.02] px-2 py-1">{pkrM(lead.estimatedCostPkr)}</span>
                  {lead.requiredPecCat && <span className="rounded border border-line bg-white/[0.02] px-2 py-1">PEC {lead.requiredPecCat} &amp; above</span>}
                  <span className={`rounded border px-2 py-1 ${d != null && d < 5 ? 'border-bad/40 text-bad' : 'border-line'}`}>
                    Deadline {fmtDate(lead.submissionDeadline)}{d != null ? ` · ${d}d` : ''}
                  </span>
                </div>

                {(match.reasons.length > 0 || match.blockers.length > 0) && (
                  <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                    {match.reasons.slice(0, 3).map((r, i) => (
                      <div key={`r${i}`} className="text-good/90">✓ {r}</div>
                    ))}
                    {match.blockers.map((b, i) => (
                      <div key={`b${i}`} className="text-bad/90">✕ {b}</div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <form action={importLead.bind(null, lead.id)}>
                    <button className="btn btn-primary text-xs">Add to my tenders →</button>
                  </form>
                  <form action={dismissLead.bind(null, lead.id)}>
                    <button className="btn btn-ghost text-xs">Dismiss</button>
                  </form>
                  {lead.url && (
                    <a href={lead.url} target="_blank" rel="noreferrer" className="ml-auto text-xs text-muted hover:text-white">View source ↗</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] text-muted2">
        Starter feed of representative opportunities. Live portal integration (PPRA/EPADS scraping or an aggregator API) plugs into the same matcher — see <Link href="/company" className="underline">docs</Link>.
      </p>
    </div>
  );
}
