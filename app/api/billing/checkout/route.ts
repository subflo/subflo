import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { 
  getPaymentProcessor, 
  getDefaultProcessor,
  PaymentProcessorType,
  PlanTier,
} from '@/lib/payments'

/**
 * Create a checkout session for subscription
 * 
 * POST /api/billing/checkout
 * Body: {
 *   plan: 'pro' | 'enterprise',
 *   processor?: 'stripe' | 'ccbill' | 'epoch' | 'segpay',
 *   successUrl?: string,
 *   cancelUrl?: string,
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  const body = await request.json()
  const { 
    plan,
    processor: requestedProcessor,
    successUrl,
    cancelUrl,
  } = body as {
    plan: PlanTier
    processor?: PaymentProcessorType
    successUrl?: string
    cancelUrl?: string
  }

  // Validate plan
  if (!plan || !['pro', 'enterprise'].includes(plan)) {
    return NextResponse.json(
      { error: 'Invalid plan. Must be "pro" or "enterprise"' },
      { status: 400 }
    )
  }

  // Get processor (requested or default)
  let processor
  try {
    processor = requestedProcessor 
      ? getPaymentProcessor(requestedProcessor)
      : getDefaultProcessor()
  } catch (error) {
    return NextResponse.json(
      { error: `Payment processor not configured: ${requestedProcessor}` },
      { status: 500 }
    )
  }

  // Get user's org
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, organizations:org_id(name, slug)')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json(
      { error: 'No organization found' },
      { status: 400 }
    )
  }

  const orgId = membership.org_id
  const org = membership.organizations as { name: string; slug: string }

  // Get or create customer
  const adminSupabase = createAdminClient()
  const { data: subscription } = await adminSupabase
    .from('subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .single()

  // Determine existing customer ID for this processor
  const existingCustomerId = subscription?.[`${processor.type}_customer_id` as keyof typeof subscription] as string | null

  // Build URLs
  const origin = request.headers.get('origin') || 'https://app.subflos.com'
  const defaultSuccessUrl = `${origin}/settings/billing?success=true`
  const defaultCancelUrl = `${origin}/settings/billing?canceled=true`

  try {
    // Create checkout session
    const session = await processor.createCheckoutSession({
      customerId: existingCustomerId || undefined,
      customerEmail: !existingCustomerId ? user.email! : undefined,
      customerName: !existingCustomerId ? org.name : undefined,
      plan,
      successUrl: successUrl || defaultSuccessUrl,
      cancelUrl: cancelUrl || defaultCancelUrl,
      metadata: {
        org_id: orgId,
        user_id: user.id,
        plan,
      },
    })

    // If this is a new customer, we'll get their ID from the webhook
    // For now, just create/update the subscription record
    if (!subscription) {
      await adminSupabase
        .from('subscriptions')
        .insert({
          org_id: orgId,
          payment_processor: processor.type,
          status: 'incomplete',
          plan: 'free',
        })
    } else if (!existingCustomerId) {
      // Mark that we're switching to a new processor
      await adminSupabase
        .from('subscriptions')
        .update({
          payment_processor: processor.type,
        })
        .eq('org_id', orgId)
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      processor: processor.type,
    })
  } catch (error) {
    console.error('Failed to create checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
