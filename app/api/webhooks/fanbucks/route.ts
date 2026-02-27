import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createWalletService } from '@/lib/fanbucks'
import Stripe from 'stripe'

/**
 * Webhook handler for fanbucks purchases
 * Handles payment completion and credits fanbucks to user
 * 
 * POST /api/webhooks/fanbucks
 * 
 * This is separate from the subscription webhooks because
 * fanbucks purchases are one-time payments, not subscriptions.
 */
export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
  })

  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_FANBUCKS_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle checkout.session.completed for fanbucks purchases
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Check if this is a fanbucks purchase
    if (session.metadata?.type !== 'fanbucks_purchase') {
      // Not a fanbucks purchase, ignore
      return NextResponse.json({ received: true })
    }

    // Only process successful payments
    if (session.payment_status !== 'paid') {
      console.log('Payment not completed:', session.payment_status)
      return NextResponse.json({ received: true })
    }

    const userId = session.metadata.user_id
    const packageId = session.metadata.package_id
    const fanbucks = parseInt(session.metadata.fanbucks || '0', 10)
    const bonusFanbucks = parseInt(session.metadata.bonus_fanbucks || '0', 10)

    if (!userId || !fanbucks) {
      console.error('Missing metadata in fanbucks purchase:', session.metadata)
      return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const wallet = createWalletService(supabase)

    try {
      // Credit fanbucks to user
      const transaction = await wallet.completePurchase(
        userId,
        fanbucks,
        bonusFanbucks,
        session.payment_intent as string,
        {
          session_id: session.id,
          package_id: packageId,
          amount_paid_cents: session.amount_total,
        }
      )

      console.log('Fanbucks credited:', {
        userId,
        fanbucks,
        bonusFanbucks,
        transactionId: transaction.id,
      })

      // TODO: Send notification to user

    } catch (error) {
      console.error('Failed to credit fanbucks:', error)
      // Don't return error - we don't want Stripe to retry
      // Log for manual investigation
    }
  }

  // Handle refunds
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    
    // Check if this was a fanbucks purchase by looking up the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(
      charge.payment_intent as string
    )

    // Get the checkout session to check metadata
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1,
    })

    if (sessions.data.length === 0) {
      return NextResponse.json({ received: true })
    }

    const session = sessions.data[0]
    if (session.metadata?.type !== 'fanbucks_purchase') {
      return NextResponse.json({ received: true })
    }

    // This was a fanbucks purchase that was refunded
    // We need to deduct the fanbucks
    const userId = session.metadata.user_id
    const fanbucks = parseInt(session.metadata.fanbucks || '0', 10)
    const bonusFanbucks = parseInt(session.metadata.bonus_fanbucks || '0', 10)
    const totalFanbucks = fanbucks + bonusFanbucks

    const supabase = createAdminClient()
    const wallet = createWalletService(supabase)

    try {
      await wallet.debit(userId, totalFanbucks, 'refund', {
        description: 'Refund: Fanbucks purchase reversed',
        metadata: {
          original_payment_intent: charge.payment_intent,
          refund_id: charge.id,
        },
      })

      console.log('Fanbucks refunded:', {
        userId,
        totalFanbucks,
        chargeId: charge.id,
      })
    } catch (error) {
      console.error('Failed to debit fanbucks for refund:', error)
      // Log for manual investigation
    }
  }

  return NextResponse.json({ received: true })
}
