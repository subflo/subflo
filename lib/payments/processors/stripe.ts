/**
 * Stripe Payment Processor
 * 
 * Implements the PaymentProcessor interface for Stripe.
 */

import Stripe from 'stripe'
import {
  PaymentProcessor,
  PaymentProcessorType,
  PaymentCustomer,
  PaymentSubscription,
  CheckoutSession,
  PortalSession,
  PaymentWebhookEvent,
  PaymentEventType,
  CreateCheckoutOptions,
  CreatePortalOptions,
  PlanPricing,
  PlanTier,
  SubscriptionStatus,
} from '../types'

export class StripeProcessor implements PaymentProcessor {
  readonly type: PaymentProcessorType = 'stripe'
  private client: Stripe
  private webhookSecret: string
  private pricing: PlanPricing[]

  constructor(config: {
    secretKey: string
    webhookSecret: string
    pricing: PlanPricing[]
  }) {
    this.client = new Stripe(config.secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
    this.webhookSecret = config.webhookSecret
    this.pricing = config.pricing
  }

  // ─────────────────────────────────────────────────────────────────
  // Customer Management
  // ─────────────────────────────────────────────────────────────────

  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<PaymentCustomer> {
    // Check if customer already exists
    const existing = await this.client.customers.list({ email, limit: 1 })
    
    if (existing.data.length > 0) {
      return this.mapCustomer(existing.data[0])
    }

    const customer = await this.client.customers.create({
      email,
      name,
      metadata,
    })

    return this.mapCustomer(customer)
  }

  async getCustomer(processorCustomerId: string): Promise<PaymentCustomer | null> {
    try {
      const customer = await this.client.customers.retrieve(processorCustomerId)
      if (customer.deleted) return null
      return this.mapCustomer(customer as Stripe.Customer)
    } catch {
      return null
    }
  }

  async updateCustomer(
    processorCustomerId: string,
    data: Partial<Pick<PaymentCustomer, 'email' | 'name' | 'metadata'>>
  ): Promise<PaymentCustomer> {
    const customer = await this.client.customers.update(processorCustomerId, {
      email: data.email,
      name: data.name,
      metadata: data.metadata,
    })

    return this.mapCustomer(customer)
  }

  private mapCustomer(customer: Stripe.Customer): PaymentCustomer {
    return {
      id: customer.id,
      processorId: customer.id,
      processor: 'stripe',
      email: customer.email!,
      name: customer.name || undefined,
      metadata: customer.metadata as Record<string, string>,
      createdAt: new Date(customer.created * 1000),
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Subscription Management
  // ─────────────────────────────────────────────────────────────────

  async createCheckoutSession(options: CreateCheckoutOptions): Promise<CheckoutSession> {
    const price = this.pricing.find(p => p.plan === options.plan)
    if (!price) {
      throw new Error(`No pricing configured for plan: ${options.plan}`)
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price.processorPriceId, quantity: 1 }],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata,
    }

    // Use existing customer or create via email
    if (options.customerId) {
      sessionParams.customer = options.customerId
    } else if (options.customerEmail) {
      sessionParams.customer_email = options.customerEmail
    }

    // Trial period
    if (options.trialDays) {
      sessionParams.subscription_data = {
        trial_period_days: options.trialDays,
      }
    }

    const session = await this.client.checkout.sessions.create(sessionParams)

    return {
      id: session.id,
      url: session.url!,
      processor: 'stripe',
      expiresAt: new Date(session.expires_at * 1000),
    }
  }

  async createPortalSession(options: CreatePortalOptions): Promise<PortalSession> {
    const session = await this.client.billingPortal.sessions.create({
      customer: options.customerId,
      return_url: options.returnUrl,
    })

    return {
      id: session.id,
      url: session.url,
      processor: 'stripe',
    }
  }

  async getSubscription(processorSubscriptionId: string): Promise<PaymentSubscription | null> {
    try {
      const sub = await this.client.subscriptions.retrieve(processorSubscriptionId)
      return this.mapSubscription(sub)
    } catch {
      return null
    }
  }

  async cancelSubscription(
    processorSubscriptionId: string,
    immediate = false
  ): Promise<PaymentSubscription> {
    let sub: Stripe.Subscription

    if (immediate) {
      sub = await this.client.subscriptions.cancel(processorSubscriptionId)
    } else {
      sub = await this.client.subscriptions.update(processorSubscriptionId, {
        cancel_at_period_end: true,
      })
    }

    return this.mapSubscription(sub)
  }

  private mapSubscription(sub: Stripe.Subscription): PaymentSubscription {
    // Determine plan from price ID
    const priceId = sub.items.data[0]?.price?.id
    const planConfig = this.pricing.find(p => p.processorPriceId === priceId)
    const plan: PlanTier = planConfig?.plan || 'free'

    return {
      id: sub.id,
      processorId: sub.id,
      processor: 'stripe',
      customerId: sub.customer as string,
      plan,
      status: this.mapStatus(sub.status),
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      metadata: sub.metadata as Record<string, string>,
    }
  }

  private mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const mapping: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'unpaid',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
      paused: 'paused',
    }
    return mapping[status] || 'active'
  }

  // ─────────────────────────────────────────────────────────────────
  // Webhook Handling
  // ─────────────────────────────────────────────────────────────────

  verifyWebhook(payload: string | Buffer, signature: string): PaymentWebhookEvent {
    const event = this.client.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    )

    return {
      id: event.id,
      processor: 'stripe',
      type: this.mapEventType(event.type),
      customerId: this.extractCustomerId(event),
      subscriptionId: this.extractSubscriptionId(event),
      data: event.data.object as Record<string, unknown>,
      raw: event,
    }
  }

  parseWebhookEvent(event: PaymentWebhookEvent): {
    type: PaymentEventType
    subscription?: Partial<PaymentSubscription>
    customerId?: string
  } {
    const stripeEvent = event.raw as Stripe.Event
    const obj = stripeEvent.data.object as Record<string, unknown>

    // Parse subscription events
    if (event.type.startsWith('subscription.')) {
      const sub = obj as unknown as Stripe.Subscription
      return {
        type: event.type,
        customerId: sub.customer as string,
        subscription: this.mapSubscription(sub),
      }
    }

    // Parse payment events
    if (event.type.startsWith('payment.')) {
      const invoice = obj as unknown as Stripe.Invoice
      return {
        type: event.type,
        customerId: invoice.customer as string,
        subscriptionId: invoice.subscription as string | undefined,
      }
    }

    return { type: event.type }
  }

  private mapEventType(stripeType: string): PaymentEventType {
    const mapping: Record<string, PaymentEventType> = {
      'customer.subscription.created': 'subscription.created',
      'customer.subscription.updated': 'subscription.updated',
      'customer.subscription.deleted': 'subscription.canceled',
      'invoice.paid': 'subscription.renewed',
      'invoice.payment_succeeded': 'payment.succeeded',
      'invoice.payment_failed': 'payment.failed',
      'customer.created': 'customer.created',
      'customer.updated': 'customer.updated',
      'charge.refunded': 'refund.created',
      'charge.dispute.created': 'chargeback.created',
    }
    return mapping[stripeType] || 'subscription.updated'
  }

  private extractCustomerId(event: Stripe.Event): string | undefined {
    const obj = event.data.object as Record<string, unknown>
    return (obj.customer as string) || undefined
  }

  private extractSubscriptionId(event: Stripe.Event): string | undefined {
    const obj = event.data.object as Record<string, unknown>
    if (obj.object === 'subscription') return obj.id as string
    return (obj.subscription as string) || undefined
  }

  // ─────────────────────────────────────────────────────────────────
  // Price Configuration
  // ─────────────────────────────────────────────────────────────────

  getPricing(): PlanPricing[] {
    return this.pricing
  }
}
