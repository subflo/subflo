import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPaymentProcessor, PaymentProcessorType } from '@/lib/payments'

/**
 * Create a billing portal session for managing subscription
 * 
 * POST /api/billing/portal
 * Body: {
 *   returnUrl?: string,
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
  const body = await request.json().catch(() => ({}))
  const { returnUrl } = body as { returnUrl?: string }

  // Get user's org and subscription
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json(
      { error: 'No organization found' },
      { status: 400 }
    )
  }

  const adminSupabase = createAdminClient()
  const { data: subscription } = await adminSupabase
    .from('subscriptions')
    .select('*')
    .eq('org_id', membership.org_id)
    .single()

  if (!subscription) {
    return NextResponse.json(
      { error: 'No subscription found' },
      { status: 400 }
    )
  }

  // Get the payment processor for this subscription
  const processorType = (subscription.payment_processor || 'stripe') as PaymentProcessorType
  
  let processor
  try {
    processor = getPaymentProcessor(processorType)
  } catch (error) {
    return NextResponse.json(
      { error: `Payment processor not configured: ${processorType}` },
      { status: 500 }
    )
  }

  // Get the customer ID for this processor
  const customerIdField = `${processorType}_customer_id`
  const customerId = subscription[customerIdField as keyof typeof subscription] as string | null

  if (!customerId) {
    return NextResponse.json(
      { error: 'No payment information found. Please subscribe first.' },
      { status: 400 }
    )
  }

  // Build return URL
  const origin = request.headers.get('origin') || 'https://app.subflos.com'
  const defaultReturnUrl = `${origin}/settings/billing`

  try {
    const session = await processor.createPortalSession({
      customerId,
      returnUrl: returnUrl || defaultReturnUrl,
    })

    return NextResponse.json({
      url: session.url,
      processor: processor.type,
    })
  } catch (error) {
    console.error('Failed to create portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}
