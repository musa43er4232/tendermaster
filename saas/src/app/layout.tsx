import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import './globals.css';
import { Nav } from '@/components/Nav';
import { getCurrentCompany } from '@/lib/company';
import { aiEnabled } from '@/lib/ai';
import { getUser } from '@/lib/supabase/server';
import { authEnabled, billingEnabled } from '@/lib/env';
import { hasActiveSubscription } from '@/lib/billing';

export const metadata: Metadata = {
  title: 'TenderMaster',
  description: 'AI tender automation for EPC firms in Pakistan.',
};

const BARE_ROUTES = ['/login', '/signup', '/subscribe'];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const path = headers().get('x-pathname') || '';
  const bare = BARE_ROUTES.some((p) => path.startsWith(p));

  const user = authEnabled() ? await getUser() : null;

  // Subscription gate: signed-in but unsubscribed users go to /subscribe.
  if (!bare && user && billingEnabled() && !(await hasActiveSubscription(user.id))) {
    redirect('/subscribe');
  }

  const company = bare ? null : getCurrentCompany();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans text-ink antialiased">
        {bare ? (
          children
        ) : (
          <>
            <Nav readiness={company?.readinessScore} aiLive={aiEnabled()} userEmail={user?.email ?? null} />
            <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
          </>
        )}
      </body>
    </html>
  );
}
