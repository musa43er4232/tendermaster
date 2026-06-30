import { getCurrentCompany } from '@/lib/company';
import * as store from '@/lib/store';
import { fmtDate, pkrM, daysUntil } from '@/lib/util';
import { normalizePec } from '@/lib/pec';
import { recomputeReadiness } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function CompanyPage() {
  const company = getCurrentCompany();
  if (!company) return <div className="card text-muted">No company found.</div>;

  const people = store.listPeople();
  const financials = store.listFinancials();
  const documents = store.listDocuments();

  const hasStamp = !!company.stampDocId;
  const hasSignature = !!company.signatureDocId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="kicker">Company profile</span>
          <h1 className="mt-1 text-2xl font-extrabold text-white">{company.legalName}</h1>
          <p className="text-sm text-muted">The knowledge graph every bid reads from.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-line bg-white/[0.03] px-5 py-3 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted2">Tender readiness</div>
            <div className="text-2xl font-extrabold text-purple-soft">{company.readinessScore}%</div>
          </div>
          <form action={recomputeReadiness}>
            <button className="btn btn-ghost text-xs">Recompute</button>
          </form>
        </div>
      </div>

      {/* Identity */}
      <section className="card">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Identity</h2>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Type" value={company.orgType} />
          <Field label="Head office" value={company.headOffice} />
          <Field label="Phone" value={company.phone} />
          <Field label="Email" value={company.email} />
          <Field label="Incorporated" value={company.incorpYear ? `${company.incorpPlace ?? ''} ${company.incorpYear}` : null} />
          <Field label="SECP #" value={company.secpNumber} />
          <Field label="NTN" value={company.ntn} />
        </div>
      </section>

      {/* Credentials */}
      <section className="card">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Licences &amp; registrations</h2>
        <div className="overflow-hidden rounded-lg border border-lineSoft">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wide text-muted">
              <tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Number</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Expiry</th><th className="px-3 py-2">Status</th></tr>
            </thead>
            <tbody>
              {company.credentials.map((c) => {
                const dd = daysUntil(c.expiryDate);
                const soon = dd != null && dd < 45;
                return (
                  <tr key={c.id} className="border-t border-lineSoft">
                    <td className="px-3 py-2 font-medium text-ink">{c.label || c.kind}</td>
                    <td className="px-3 py-2 text-muted">{c.number || '—'}</td>
                    <td className="px-3 py-2 text-muted">{c.category ? normalizePec(c.category) ?? c.category : '—'}</td>
                    <td className={`px-3 py-2 ${soon ? 'text-warn' : 'text-muted'}`}>{fmtDate(c.expiryDate)}{soon && dd != null ? ` (${dd}d)` : ''}</td>
                    <td className="px-3 py-2"><span className={`pill ${c.status === 'active' ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'}`}>{c.status}</span></td>
                  </tr>
                );
              })}
              {company.credentials.length === 0 && <tr><td colSpan={5} className="px-3 py-3 text-muted">No registrations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Projects */}
        <section className="card">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Experience</h2>
          <ul className="space-y-2">
            {company.projects.map((p) => (
              <li key={p.id} className="rounded-lg border border-lineSoft bg-white/[0.02] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{p.name}</span>
                  <span className="text-xs text-purple-soft">{pkrM(p.valuePkr)}</span>
                </div>
                <div className="text-xs text-muted">{p.client} · <span className="capitalize">{p.sector}</span> · {p.status}</div>
              </li>
            ))}
            {company.projects.length === 0 && <li className="text-sm text-muted">No projects yet.</li>}
          </ul>
        </section>

        {/* People + financials + assets */}
        <section className="space-y-6">
          <div className="card">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Key people</h2>
            <ul className="space-y-1 text-sm">
              {people.map((p) => (
                <li key={p.id} className="flex justify-between"><span className="text-ink">{p.name}</span><span className="text-muted">{p.designation}</span></li>
              ))}
              {people.length === 0 && <li className="text-muted">None recorded.</li>}
            </ul>
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Financials</h2>
            <ul className="space-y-1 text-sm">
              {financials.map((f) => (
                <li key={f.id} className="flex justify-between"><span className="text-muted">{f.year}</span><span className="text-ink">{pkrM(f.turnoverPkr)} turnover</span></li>
              ))}
              {financials.length === 0 && <li className="text-muted">No financials yet.</li>}
            </ul>
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Stamp &amp; signature</h2>
            <p className="mb-3 text-xs text-muted">Applied automatically to every page of generated submissions.</p>
            <div className="flex gap-3">
              <AssetChip ok={hasStamp} label="Company e-stamp" />
              <AssetChip ok={hasSignature} label="Authorised signature" />
            </div>
            <p className="mt-3 text-[11px] text-muted2">Vault: {documents.length} document(s) stored.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted2">{label}</div>
      <div className="text-ink">{value || '—'}</div>
    </div>
  );
}

function AssetChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs ${ok ? 'border-good/30 bg-good/10 text-good' : 'border-warn/30 bg-warn/10 text-warn'}`}>
      {ok ? '✓ ' : '+ '}{label}{ok ? '' : ' — add'}
    </div>
  );
}
