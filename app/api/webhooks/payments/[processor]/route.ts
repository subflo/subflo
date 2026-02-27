import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'
import {
  getPaymentProcessor,
  getWebhookSignatureHeader,
  PaymentProcessorType,
  PaymentEventType,
} from '@/lib/payments'

/**
 * Unified Payment Webhook Handler
 * 
 * Handles webhooks from any configured payment processor.
 * Route: /api/webhooks/payments/[processor]
 * 
 * Examples:
 * - /api/webhooks/payments/stripe
 * - /api/webhooks/payments/ccbill
 * - /api/webhooks/payments/epoch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ processor: string }> }
) {
  const { processor: processorType } = await params

  // Validate processor type
  const validProcessors: PaymentProcessorType[] = ['stripe', 'ccbill', 'epoch', 'segpay']
  if (!validProcessors.includes(processorType as PaymentProcessorType)) {
    return NextResponse.json(
      { error: `Invalid processor: ${processorType}` },
      { status: 400 }
    )
  }

  const processor = processorType as PaymentProcessorType

  // Get processor instance
  let paymentProcessor
  try {
    paymentProcessor = getPaymentProcessor(processor)
  } catch (error) {
    console.error(`Processor ${processor} not configured:`, error)
    return NextResponse.json(
      { error: `Processor ${processor} not configured` },
      { status: 500 }
    )
  }

  // Get webhook signature
  const signatureHeader = getWebhookSignatureHeader(processor)
  const signature = request.headers.get(signatureHeader)

  if (!signature) {
    return NextResponse.json(
      { error: `Missing ${signatureHeader} header` },
      { status: 400 }
    )
  }

  // Get payload
  const payload = await request.text()

  // Verify and parse webhook
  let event
  try {
    event = paymentProcessor.verifyWebhook(payload, signature)
  } catch (error) {
    console.error(`Webhook verification failed for ${processor}:`, error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Emit to Inngest for durable processing
  await inngest.send({
    name: 'payments/webhook.received',
    data: {
      processor,
      event_type: event.type,
      event_id: event.id,
      customer_id: event.customerId,
      subscription_id: event.subscriptionId,
      payload: event.data,
    },
  })

  // Handle critical events synchronously
  const supabase = createAdminClient()
  const parsed = paymentProcessor.parseWebhookEvent(event)

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.renewed': {
      if (!parsed.subscription || !parsed.customerId) break

      // Find org by processor customer ID
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('org_id')
        .or(`stripe_customer_id.eq.${parsed.customerId},ccbill_customer_id.eq.${parsed.customerId}`)
        .single()

      if (existingSub && parsed.subscription) {
        await supabase
          .from('subscriptions')
          .update({
            [`${processor}_subscription_id`]: parsed.subscription.processorId,
            plan: parsed.subscription.plan || 'pro',
            status: parsed.subscription.status,
            current_period_start: parsed.subscription.currentPeriodStart?.toISOString(),
            current_period_end: parsed.subscription.currentPeriodEnd?.toISOString(),
            cancel_at_period_end: parsed.subscription.cancelAtPeriodEnd,
            trial_end: parsed.subscription.trialEnd?.toISOString(),
            payment_processor: processor,
          })
          .eq('org_id', existingSub.org_id)

        // Update org plan
        if (parsed.subscription.plan) {
          await supabase
            .from('organizations')
            .update({ plan: parsed.subscription.plan })
            .eq('id', existingSub.org_id)
        }
      }
      break
    }

    case 'subscription.canceled': {
      if (!parsed.customerId) break

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('org_id')
        .or(`stripe_customer_id.eq.${parsed.customerId},ccbill_customer_id.eq.${parsed.customerId}`)
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

    case 'payment.failed': {
      console.error(`Payment failed for ${processor} customer:`, parsed.customerId)
      // TODO: Send notification to admin/user
      break
    }

    case 'chargeback.created': {
      console.error(`Chargeback received for ${processor}:`, event.data)
      // TODO: Handle chargeback (pause account, notify admin)
      break
    }

    default:
      console.log(`Unhandled ${processor} event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

/**
 * GET handler for webhook endpoint verification
 * Some processors (like CCBill) require endpoint verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ processor: string }> }
) {
  const { processor } = await params
  
  // CCBill verification
  if (processor === 'ccbill') {
    const challenge = request.nextUrl.searchParams.get('challenge')
    if (challenge) {
      return new NextResponse(challenge, {
        headers: { 'Content-Type': 'text/plain' },
      })
    }
  }

  return NextResponse.json({ status: 'ok', processor })
}
