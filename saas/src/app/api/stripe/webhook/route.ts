import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, WEBHOOK_SECRET } from '@/lib/stripe';
import { createSupabaseAdmin } from '@/lib/supabase/server';

// Stripe needs the raw body to verify the signature.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Billing not configured.' }, { status: 503 });
  }

  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? '', WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Service role not configured.' }, { status: 503 });

  async function upsert(sub: Stripe.Subscription, userId?: string | null) {
    const uid = userId ?? (sub.metadata?.user_id as string | undefined);
    if (!uid) return;
    await admin!.from('subscriptions').upsert(
      {
        user_id: uid,
        status: sub.status,
        stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
        stripe_subscription_id: sub.id,
        price_id: sub.items.data[0]?.price?.id ?? null,
        current_period_end: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.metadata?.user_id as string) || session.client_reference_id;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsert(sub, userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsert(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
