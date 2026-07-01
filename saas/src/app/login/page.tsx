import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { AuthForm } from '@/components/AuthForm';
import { authEnabled } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  if (!authEnabled()) redirect('/');
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your TenderMaster workspace.">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
