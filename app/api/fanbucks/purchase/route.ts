import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getDefaultProcessor, PaymentProcessorType } from '@/lib/payments'

/**
 * Create a checkout session to purchase fanbucks
 * 
 * POST /api/fanbucks/purchase
 * Body: {
 *   packageId: string,
 *   processor?: 'stripe' | 'ccbill',
 *   successUrl?: string,
 *   cancelUrl?: string,
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { packageId, processor: requestedProcessor, successUrl, cancelUrl } = body

  if (!packageId) {
    return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
  }

  // Get the package
  const adminSupabase = createAdminClient()
  const { data: pkg, error: pkgError } = await adminSupabase
    .from('fanbucks_packages')
    .select('*')
    .eq('id', packageId)
    .eq('is_active', true)
    .single()

  if (pkgError || !pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  // Get payment processor
  const processor = getDefaultProcessor()

  // Build URLs
  const origin = request.headers.get('origin') || 'https://app.subflos.com'
  const defaultSuccessUrl = `${origin}/fanbucks?success=true&package=${packageId}`
  const defaultCancelUrl = `${origin}/fanbucks?canceled=true`

  try {
    // Create a one-time payment checkout
    // We use a custom approach since fanbucks aren't subscriptions
    const session = await createFanbucksCheckout(processor.type, {
      userId: user.id,
      email: user.email!,
      packageId: pkg.id,
      fanbucks: pkg.fanbucks,
      bonusFanbucks: pkg.bonus_fanbucks,
      priceCents: pkg.price_cents,
      successUrl: successUrl || defaultSuccessUrl,
      cancelUrl: cancelUrl || defaultCancelUrl,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      processor: processor.type,
    })
  } catch (error) {
    console.error('Failed to create fanbucks checkout:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

/**
 * Create a checkout session for fanbucks purchase
 * This is separate from subscription checkout
 */
async function createFanbucksCheckout(
  processorType: PaymentProcessorType,
  options: {
    userId: string
    email: string
    packageId: string
    fanbucks: number
    bonusFanbucks: number
    priceCents: number
    successUrl: string
    cancelUrl: string
  }
) {
  // For Stripe, we use a one-time payment checkout
  if (processorType === 'stripe') {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: options.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: options.priceCents,
            product_data: {
              name: `${options.fanbucks + options.bonusFanbucks} Fanbucks`,
              description: options.bonusFanbucks > 0
                ? `${options.fanbucks} Fanbucks + ${options.bonusFanbucks} Bonus`
                : `${options.fanbucks} Fanbucks`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: {
        type: 'fanbucks_purchase',
        user_id: options.userId,
        package_id: options.packageId,
        fanbucks: options.fanbucks.toString(),
        bonus_fanbucks: options.bonusFanbucks.toString(),
      },
    })

    return {
      id: session.id,
      url: session.url!,
    }
  }

  // For CCBill and others, use the FlexForm approach
  // (Implementation would be similar to the CCBill processor)
  throw new Error(`Fanbucks purchase not implemented for ${processorType}`)
}
