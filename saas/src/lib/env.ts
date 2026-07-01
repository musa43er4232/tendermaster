// Feature detection by environment. Everything degrades gracefully: when the
// keys for a capability aren't set, that capability is simply off and the app
// keeps working (single open workspace, no billing gate). This lets the app run
// with zero setup locally, and light up auth + billing the moment keys exist.

export function authEnabled(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function billingEnabled(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID && authEnabled());
}

export function serviceRoleAvailable(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
