import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { AuthForm } from '@/components/AuthForm';
import { authEnabled } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  if (!authEnabled()) redirect('/');
  return (
    <AuthShell title="Create your account" subtitle="Start winning more tenders with less effort.">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
