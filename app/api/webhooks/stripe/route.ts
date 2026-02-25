import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent, stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'

/**
 * Stripe Webhook Handler
 * 
 * Handles subscription lifecycle events from Stripe.
 * Updates local subscriptions table to keep in sync.
 */
export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event

  try {
    event = constructWebhookEvent(payload, signature)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Emit to Inngest for durable processing
  await inngest.send({
    name: 'stripe/webhook.received',
    data: {
      event_type: event.type,
      event_id: event.id,
      payload: event.data.object as Record<string, unknown>,
    },
  })

  // Handle critical events synchronously for immediate feedback
  const supabase = createAdminClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as any
      const customerId = subscription.customer as string

      // Find org by Stripe customer ID
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('org_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (existingSub) {
        // Determine plan from price
        const priceId = subscription.items.data[0]?.price?.id
        let plan: 'free' | 'pro' | 'enterprise' = 'free'
        
        if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) {
          plan = 'pro'
        } else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY) {
          plan = 'enterprise'
        }

        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            plan,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_end: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString() 
              : null,
          })
          .eq('org_id', existingSub.org_id)

        // Also update org's plan
        await supabase
          .from('organizations')
          .update({ plan })
          .eq('id', existingSub.org_id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any
      const customerId = subscription.customer as string

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('org_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            plan: 'free',
          })
          .eq('org_id', existingSub.org_id)

        await supabase
          .from('organizations')
          .update({ plan: 'free' })
          .eq('id', existingSub.org_id)
      }
      break
    }

    case 'invoice.paid': {
      // Successful payment - could trigger notification
      console.log('Invoice paid:', event.data.object)
      break
    }

    case 'invoice.payment_failed': {
      // Failed payment - trigger alert
      const invoice = event.data.object as any
      console.error('Payment failed for customer:', invoice.customer)
      // TODO: Send notification to admin
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
