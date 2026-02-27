/**
 * Payment Processor Types
 * 
 * Defines the contract that all payment processors must implement.
 * This allows swapping between Stripe, CCBill, or any other processor.
 */

export type PaymentProcessorType = 'stripe' | 'ccbill' | 'epoch' | 'segpay'

export type SubscriptionStatus = 
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'paused'

export type PlanTier = 'free' | 'pro' | 'enterprise'

/**
 * Unified customer representation across processors
 */
export interface PaymentCustomer {
  id: string                    // Internal ID
  processorId: string           // Processor's customer ID (e.g., cus_xxx for Stripe)
  processor: PaymentProcessorType
  email: string
  name?: string
  metadata?: Record<string, string>
  createdAt: Date
}

/**
 * Unified subscription representation
 */
export interface PaymentSubscription {
  id: string                    // Internal ID
  processorId: string           // Processor's subscription ID
  processor: PaymentProcessorType
  customerId: string            // Processor's customer ID
  plan: PlanTier
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
  metadata?: Record<string, string>
}

/**
 * Checkout session for starting a subscription
 */
export interface CheckoutSession {
  id: string
  url: string                   // URL to redirect user to
  processor: PaymentProcessorType
  expiresAt?: Date
}

/**
 * Portal session for managing billing
 */
export interface PortalSession {
  id: string
  url: string
  processor: PaymentProcessorType
}

/**
 * Webhook event normalized across processors
 */
export interface PaymentWebhookEvent {
  id: string
  processor: PaymentProcessorType
  type: PaymentEventType
  customerId?: string
  subscriptionId?: string
  data: Record<string, unknown>
  raw: unknown                  // Original event from processor
}

export type PaymentEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.renewed'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'customer.created'
  | 'customer.updated'
  | 'refund.created'
  | 'chargeback.created'

/**
 * Options for creating a checkout session
 */
export interface CreateCheckoutOptions {
  customerId?: string           // Existing processor customer ID
  customerEmail?: string        // Email for new customer
  customerName?: string
  plan: PlanTier
  successUrl: string
  cancelUrl: string
  trialDays?: number
  metadata?: Record<string, string>
}

/**
 * Options for creating a portal session
 */
export interface CreatePortalOptions {
  customerId: string
  returnUrl: string
}

/**
 * Price configuration per plan
 */
export interface PlanPricing {
  plan: PlanTier
  processorPriceId: string      // Price ID in the processor (e.g., price_xxx)
  amountCents: number
  currency: string
  interval: 'month' | 'year'
}

/**
 * Payment Processor Interface
 * 
 * All payment processors must implement this interface.
 */
export interface PaymentProcessor {
  readonly type: PaymentProcessorType
  
  // Customer Management
  createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<PaymentCustomer>
  getCustomer(processorCustomerId: string): Promise<PaymentCustomer | null>
  updateCustomer(processorCustomerId: string, data: Partial<Pick<PaymentCustomer, 'email' | 'name' | 'metadata'>>): Promise<PaymentCustomer>
  
  // Subscription Management
  createCheckoutSession(options: CreateCheckoutOptions): Promise<CheckoutSession>
  createPortalSession(options: CreatePortalOptions): Promise<PortalSession>
  getSubscription(processorSubscriptionId: string): Promise<PaymentSubscription | null>
  cancelSubscription(processorSubscriptionId: string, immediate?: boolean): Promise<PaymentSubscription>
  
  // Webhook Handling
  verifyWebhook(payload: string | Buffer, signature: string): PaymentWebhookEvent
  parseWebhookEvent(event: PaymentWebhookEvent): {
    type: PaymentEventType
    subscription?: Partial<PaymentSubscription>
    customerId?: string
  }
  
  // Price Configuration
  getPricing(): PlanPricing[]
}

/**
 * Payment processor configuration
 */
export interface PaymentProcessorConfig {
  type: PaymentProcessorType
  enabled: boolean
  credentials: Record<string, string>
  webhookSecret?: string
  pricing: PlanPricing[]
  testMode?: boolean
}
