import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { getUser } from '@/lib/supabase/server';
import { authEnabled, billingEnabled } from '@/lib/env';
import { hasActiveSubscription } from '@/lib/billing';

export const dynamic = 'force-dynamic';

const FEATURES = [
  'Unlimited AI tender reading & eligibility verdicts',
  'Dynamic document checklists',
  'One-click submission PDF builder (auto stamp & signature)',
  'Tender discovery matched to your firm',
  'Deadline, security & licence reminders',
  'Full tender history & win tracking',
];

export default async function SubscribePage({ searchParams }: { searchParams: { checkout?: string } }) {
  if (!authEnabled() || !billingEnabled()) redirect('/');
  const user = await getUser();
  if (!user) redirect('/login?next=/subscribe');
  if (await hasActiveSubscription(user.id)) redirect('/');

  return (
    <AuthShell title="Activate TenderMaster" subtitle="One plan. Everything included.">
      {searchParams.checkout === 'cancelled' && (
        <p className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">Checkout cancelled — you can try again anytime.</p>
      )}

      <div className="rounded-xl border border-purple bg-gradient-to-b from-panel2 to-bg2 p-5 text-center shadow-glow">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-extrabold text-purple-bright">$150</span>
          <span className="text-sm text-muted">/ month</span>
        </div>
        <ul className="mt-4 space-y-2 text-left text-sm">
          {FEATURES.map((f) => (
            <li key={f} className="flex gap-2"><span className="text-good">✓</span><span className="text-ink">{f}</span></li>
          ))}
        </ul>
        <form action="/api/stripe/checkout" method="post" className="mt-5">
          <button className="btn btn-primary w-full">Subscribe &amp; get started →</button>
        </form>
        <p className="mt-3 text-[11px] text-muted2">Secure checkout via Stripe. Cancel anytime.</p>
      </div>

      <form action="/auth/signout" method="post" className="mt-4 text-center">
        <button className="text-xs text-muted hover:text-white">Sign out ({user.email})</button>
      </form>
    </AuthShell>
  );
}
