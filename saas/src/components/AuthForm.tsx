'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowser, supabaseConfiguredInBrowser } from '@/lib/supabase/client';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);

  if (!supabaseConfiguredInBrowser()) {
    return (
      <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-3 text-sm text-warn">
        Authentication isn&apos;t configured for this build. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and
        <code> NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and rebuild.
      </p>
    );
  }

  const supabase = createSupabaseBrowser();

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        setMsg({ kind: 'ok', text: 'Account created. Check your email to confirm, then log in.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message ?? 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!email) return setMsg({ kind: 'err', text: 'Enter your email first.' });
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
      setMsg({ kind: 'ok', text: 'Magic link sent — check your email to sign in.' });
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message ?? 'Could not send link.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handlePassword} className="space-y-4">
      <div>
        <label className="label">Work email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@company.com" autoComplete="email" />
      </div>
      <div>
        <label className="label">Password</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="At least 8 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
      </div>

      {msg && <p className={`text-sm font-medium ${msg.kind === 'ok' ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
        {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>

      <div className="flex items-center gap-3 text-xs text-muted2">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <button type="button" onClick={handleMagicLink} disabled={busy} className="btn btn-ghost w-full">
        Email me a magic link
      </button>

      <p className="pt-2 text-center text-sm text-muted">
        {mode === 'signup' ? (
          <>Already have an account? <Link href="/login" className="text-purple-soft hover:underline">Log in</Link></>
        ) : (
          <>New here? <Link href="/signup" className="text-purple-soft hover:underline">Create an account</Link></>
        )}
      </p>
    </form>
  );
}
