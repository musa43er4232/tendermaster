import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}

export const PRICE_ID = process.env.STRIPE_PRICE_ID || '';
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
