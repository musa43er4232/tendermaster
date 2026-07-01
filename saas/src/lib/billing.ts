import { createSupabaseServer } from './supabase/server';
import { billingEnabled } from './env';

const ACTIVE = ['active', 'trialing', 'past_due'];

/**
 * Does the current user have an active subscription?
 * When billing isn't configured, access is open (returns true).
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  if (!billingEnabled()) return true;
  const supabase = createSupabaseServer();
  if (!supabase) return true;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return false;
  if (!ACTIVE.includes(data.status)) return false;
  if (data.current_period_end && new Date(data.current_period_end).getTime() < Date.now()) return false;
  return true;
}
