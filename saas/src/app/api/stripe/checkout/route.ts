import { NextResponse } from 'next/server';
import { getStripe, PRICE_ID } from '@/lib/stripe';
import { getUser } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/env';

/** Create a Stripe Checkout Session for the $150/mo plan and redirect to it. */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !PRICE_ID) {
    return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
  }

  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const base = APP_URL || new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${base}/?checkout=success`,
    cancel_url: `${base}/subscribe?checkout=cancelled`,
  });

  if (!session.url) return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  return NextResponse.redirect(session.url, { status: 303 });
}
