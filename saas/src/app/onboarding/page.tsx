import Link from 'next/link';
import { getCompany, listCredentials, listProjects, listFinancials } from '@/lib/store';
import { listPeople } from '@/lib/store';
import { STEPS, ORG_TYPES, SECTORS, PROJECT_ROLES } from '@/lib/options';
import { normalizePec } from '@/lib/pec';
import { pkrM, fmtDate } from '@/lib/util';
import { CredentialForm } from '@/components/onboarding/CredentialForm';
import {
  saveIdentity, addProject, removeProject, addPerson, removePerson,
  addFinancial, removeFinancial, removeCredential, saveAsset, finishOnboarding,
} from './actions';

export const dynamic = 'force-dynamic';

export default function Onboarding({ searchParams }: { searchParams: { step?: string } }) {
  const company = getCompany();
  if (!company) return <div className="card text-muted">No company found.</div>;
  const step = Math.min(6, Math.max(1, parseInt(searchParams.step ?? '1', 10) || 1));

  return (
    <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
      <Rail step={step} readiness={company.readinessScore} />
      <div>
        <div className="mb-6">
          <span className="kicker">Onboarding · Step {step} of 6</span>
          <h1 className="mt-1 text-2xl font-extrabold text-white">{STEPS[step - 1].label}</h1>
          <p className="text-sm text-muted">{STEP_INTRO[step]}</p>
        </div>
        {step === 1 && <StepCompany company={company} />}
        {step === 2 && <StepRegistrations />}
        {step === 3 && <StepExperience />}
        {step === 4 && <StepTeam />}
        {step === 5 && <StepFinancials />}
        {step === 6 && <StepAssets company={company} />}
      </div>
    </div>
  );
}

const STEP_INTRO: Record<number, string> = {
  1: 'The basics. Only your company name is required — fill what you can, refine later.',
  2: 'Your licences and tax registrations. These power every eligibility check, so add as many as you have.',
  3: 'Past projects become your experience evidence — the more relevant ones, the stronger your bids.',
  4: 'Your key engineers and management. Used for technical scoring.',
  5: 'Annual turnover. Many tenders set a minimum, so add your recent years.',
  6: 'Your company seal & signature get stamped onto every generated submission. Then you\'re done.',
};

// ---------- Rail ----------
function Rail({ step, readiness }: { step: number; readiness: number }) {
  return (
    <aside className="space-y-4">
      <div className="card">
        <div className="mb-1 flex items-end justify-between">
          <span className="text-xs uppercase tracking-wide text-muted2">Readiness</span>
          <span className="text-lg font-extrabold text-purple-soft">{readiness}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-gradient-to-r from-purple to-accent transition-all" style={{ width: `${readiness}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted2">Every field you add raises your score and unlocks more tenders.</p>
      </div>
      <ol className="space-y-1">
        {STEPS.map((s) => {
          const active = s.n === step;
          const done = s.n < step;
          return (
            <li key={s.n}>
              <Link
                href={`/onboarding?step=${s.n}`}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                  active ? 'border-purple bg-purple/10' : 'border-line hover:border-purple/60'
                }`}
              >
                <span className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold ${active ? 'bg-gradient-to-br from-purple to-accent text-white' : done ? 'bg-good/20 text-good' : 'bg-white/5 text-muted'}`}>
                  {done ? '✓' : s.n}
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${active ? 'text-white' : 'text-ink'}`}>{s.label}</span>
                  <span className="block text-[11px] text-muted2">{s.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

// ---------- Nav buttons ----------
function StepNav({ step, primaryLabel, primaryType }: { step: number; primaryLabel?: string; primaryType?: 'submit' | 'link' }) {
  const next = step + 1;
  return (
    <div className="mt-6 flex items-center justify-between">
      {step > 1 ? (
        <Link href={`/onboarding?step=${step - 1}`} className="btn btn-ghost">← Back</Link>
      ) : <span />}
      {primaryType === 'submit' ? (
        <button className="btn btn-primary">{primaryLabel ?? 'Save & continue →'}</button>
      ) : (
        <Link href={`/onboarding?step=${next}`} className="btn btn-primary">{primaryLabel ?? 'Continue →'}</Link>
      )}
    </div>
  );
}

// ---------- Step 1: Company ----------
function StepCompany({ company }: { company: ReturnType<typeof getCompany> }) {
  if (!company) return null;
  return (
    <form action={saveIdentity} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="legalName" label="Registered company name *" defaultValue={company.legalName} required />
        <Field name="brandName" label="Brand / trading name" defaultValue={company.brandName} />
        <div>
          <label className="label">Organisation type</label>
          <select name="orgType" defaultValue={company.orgType ?? ''} className="input">
            <option value="">Select…</option>
            {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Field name="headOffice" label="Head office address" defaultValue={company.headOffice} />
        <Field name="phone" label="Phone" defaultValue={company.phone} />
        <Field name="email" label="Email" defaultValue={company.email} type="email" />
        <Field name="incorpPlace" label="Place of incorporation" defaultValue={company.incorpPlace} />
        <Field name="incorpYear" label="Year of incorporation" defaultValue={company.incorpYear?.toString()} type="number" />
        <Field name="secpNumber" label="SECP / registration number" defaultValue={company.secpNumber} />
        <Field name="ntn" label="NTN" defaultValue={company.ntn} />
      </div>
      <StepNav step={1} primaryType="submit" />
    </form>
  );
}

// ---------- Step 2: Registrations ----------
function StepRegistrations() {
  const creds = listCredentials();
  return (
    <div className="space-y-5">
      <ItemList
        items={creds.map((c) => ({
          id: c.id,
          title: c.label || c.kind,
          meta: [c.number, c.category ? normalizePec(c.category) ?? c.category : null, c.expiryDate ? `exp ${fmtDate(c.expiryDate)}` : null].filter(Boolean).join(' · '),
          remove: removeCredential,
        }))}
        empty="No registrations yet. Add your PEC licence first — it's the biggest eligibility gate."
      />
      <div className="card">
        <h3 className="mb-3 text-sm font-bold text-purple-soft">Add a registration</h3>
        <CredentialForm />
      </div>
      <StepNav step={2} />
    </div>
  );
}

// ---------- Step 3: Experience ----------
function StepExperience() {
  const projects = listProjects();
  return (
    <div className="space-y-5">
      <ItemList
        items={projects.map((p) => ({
          id: p.id,
          title: p.name,
          meta: [p.client, p.sector, p.valuePkr ? pkrM(p.valuePkr) : null, p.status].filter(Boolean).join(' · '),
          remove: removeProject,
        }))}
        empty="No projects yet. Add your completed works — they're your experience evidence."
      />
      <form action={addProject} className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
        <h3 className="text-sm font-bold text-purple-soft sm:col-span-2">Add a project</h3>
        <Field name="name" label="Project name *" required />
        <Field name="client" label="Client / employer" />
        <Field name="valuePkr" label="Contract value (PKR)" type="number" />
        <div>
          <label className="label">Sector</label>
          <select name="sector" className="input" defaultValue="solar">
            {SECTORS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Role</label>
          <select name="role" className="input" defaultValue="prime">
            {PROJECT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" className="input" defaultValue="completed">
            <option value="completed">completed</option>
            <option value="ongoing">ongoing</option>
          </select>
        </div>
        <Field name="capacity" label="Capacity (e.g. 120 kW, 5 km)" />
        <Field name="endDate" label="Completion date" type="date" />
        <div className="sm:col-span-2"><button className="btn btn-primary">+ Add project</button></div>
      </form>
      <StepNav step={3} />
    </div>
  );
}

// ---------- Step 4: Team ----------
function StepTeam() {
  const people = listPeople();
  return (
    <div className="space-y-5">
      <ItemList
        items={people.map((p) => ({
          id: p.id,
          title: p.name,
          meta: [p.designation, p.qualification, p.years ? `${p.years} yrs` : null, p.pecReg ? `PEC ${p.pecReg}` : null].filter(Boolean).join(' · '),
          remove: removePerson,
        }))}
        empty="No people yet. Add your key engineers and management."
      />
      <form action={addPerson} className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
        <h3 className="text-sm font-bold text-purple-soft sm:col-span-2">Add a person</h3>
        <Field name="name" label="Full name *" required />
        <Field name="designation" label="Designation" />
        <Field name="qualification" label="Qualification" />
        <Field name="pecReg" label="PEC registration #" />
        <Field name="years" label="Years of experience" type="number" />
        <Field name="nationality" label="Nationality" defaultValue="Pakistani" />
        <div className="sm:col-span-2"><button className="btn btn-primary">+ Add person</button></div>
      </form>
      <StepNav step={4} />
    </div>
  );
}

// ---------- Step 5: Financials ----------
function StepFinancials() {
  const fin = listFinancials();
  return (
    <div className="space-y-5">
      <ItemList
        items={fin.map((f) => ({
          id: f.id,
          title: `${f.year}`,
          meta: [f.turnoverPkr ? `${pkrM(f.turnoverPkr)} turnover` : null, f.netWorthPkr ? `${pkrM(f.netWorthPkr)} net worth` : null].filter(Boolean).join(' · '),
          remove: removeFinancial,
        }))}
        empty="No financial years yet. Add your recent turnover — many tenders set a minimum."
      />
      <form action={addFinancial} className="card grid grid-cols-1 gap-3 sm:grid-cols-3">
        <h3 className="text-sm font-bold text-purple-soft sm:col-span-3">Add a financial year</h3>
        <Field name="year" label="Year *" type="number" required />
        <Field name="turnoverPkr" label="Turnover (PKR)" type="number" />
        <Field name="netWorthPkr" label="Net worth (PKR)" type="number" />
        <div className="sm:col-span-3"><button className="btn btn-primary">+ Add year</button></div>
      </form>
      <StepNav step={5} />
    </div>
  );
}

// ---------- Step 6: Assets + finish ----------
function StepAssets({ company }: { company: ReturnType<typeof getCompany> }) {
  if (!company) return null;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <AssetCard kind="stamp" label="Company e-stamp (seal)" hint="Applied to every page of generated submissions." present={!!company.stampDocId} />
        <AssetCard kind="signature" label="Authorised signature" hint="Stamped beside the seal on each page." present={!!company.signatureDocId} />
      </div>
      <div className="card text-center">
        <h3 className="text-lg font-bold text-white">That&apos;s your profile.</h3>
        <p className="mx-auto mb-4 mt-1 max-w-md text-sm text-muted">
          You can refine any step anytime. Upload a tender and TenderMaster will check your eligibility and build the checklist in about a minute.
        </p>
        <form action={finishOnboarding}>
          <button className="btn btn-primary btn-lg">Finish &amp; go to dashboard →</button>
        </form>
      </div>
      <StepNav step={6} primaryLabel="Continue →" />
    </div>
  );
}

function AssetCard({ kind, label, hint, present }: { kind: 'stamp' | 'signature'; label: string; hint: string; present: boolean }) {
  return (
    <form action={saveAsset} className="card">
      <input type="hidden" name="kind" value={kind} />
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">{label}</h3>
        {present && <span className="pill bg-good/15 text-good">✓ Added</span>}
      </div>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      <input type="file" name="file" accept="image/png,image/jpeg" className="input mb-3 file:mr-3 file:rounded file:border-0 file:bg-purple/20 file:px-3 file:py-1 file:text-purple-soft" />
      <button className="btn btn-ghost w-full text-sm">{present ? 'Replace' : 'Save'} {label.toLowerCase()}</button>
    </form>
  );
}

// ---------- Shared bits ----------
function Field({ name, label, defaultValue, type = 'text', required }: { name: string; label: string; defaultValue?: string | null; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue ?? ''} required={required} className="input" />
    </div>
  );
}

function ItemList({ items, empty }: { items: { id: string; title: string; meta: string; remove: (id: string) => Promise<void> }[]; empty: string }) {
  if (items.length === 0) return <div className="card text-sm text-muted">{empty}</div>;
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{it.title}</div>
            {it.meta && <div className="truncate text-xs text-muted">{it.meta}</div>}
          </div>
          <form action={it.remove.bind(null, it.id)}>
            <button className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-bad hover:text-bad" title="Remove">Remove</button>
          </form>
        </div>
      ))}
    </div>
  );
}
