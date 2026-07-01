'use client';

import { createBrowserClient } from '@supabase/ssr';

// These are inlined at BUILD time, so the app must be built with them set.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseConfiguredInBrowser(): boolean {
  return !!(URL && ANON);
}

/** Supabase client for Client Components (login/signup forms). */
export function createSupabaseBrowser() {
  if (!URL || !ANON) {
    throw new Error('Supabase public env vars are missing at build time. Rebuild with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set.');
  }
  return createBrowserClient(URL, ANON);
}
