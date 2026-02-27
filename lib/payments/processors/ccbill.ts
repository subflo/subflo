/**
 * CCBill Payment Processor
 * 
 * Implements the PaymentProcessor interface for CCBill.
 * 
 * CCBill Flow:
 * 1. Create a FlexForm or hosted payment page URL
 * 2. User completes payment on CCBill's page
 * 3. CCBill sends webhooks (Webhooks/Postback URL)
 * 4. We update subscription status based on webhooks
 * 
 * Key Differences from Stripe:
 * - No customer portal - management via support or custom UI
 * - FlexForms for checkout instead of Checkout Sessions
 * - Different webhook format (form-encoded POST)
 * - Subscription IDs are different format
 */

import crypto from 'crypto'
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

interface CCBillConfig {
  accountNumber: string          // CCBill merchant account number
  subAccountNumber: string       // CCBill sub-account number
  flexId: string                 // FlexForm ID
  salt: string                   // For digest validation
  dataLinkUsername?: string      // For API access
  dataLinkPassword?: string      // For API access
  webhookSecret: string          // For webhook validation
  testMode?: boolean
  pricing: PlanPricing[]
}

interface CCBillWebhookPayload {
  eventType: string
  subscriptionId: string
  transactionId?: string
  clientAccnum: string
  clientSubacc: string
  timestamp: string
  email?: string
  username?: string
  billingCycleDate?: string
  nextBillingDate?: string
  [key: string]: string | undefined
}

export class CCBillProcessor implements PaymentProcessor {
  readonly type: PaymentProcessorType = 'ccbill'
  private config: CCBillConfig
  private baseUrl: string

  constructor(config: CCBillConfig) {
    this.config = config
    this.baseUrl = config.testMode
      ? 'https://sandbox-api.ccbill.com'
      : 'https://api.ccbill.com'
  }

  // ─────────────────────────────────────────────────────────────────
  // Customer Management
  // ─────────────────────────────────────────────────────────────────

  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<PaymentCustomer> {
    // CCBill doesn't have explicit customer creation
    // Customers are created when they complete a payment
    // We'll generate a local customer ID and store the email
    const customerId = `ccbill_${crypto.randomUUID()}`

    return {
      id: customerId,
      processorId: customerId,
      processor: 'ccbill',
      email,
      name,
      metadata,
      createdAt: new Date(),
    }
  }

  async getCustomer(processorCustomerId: string): Promise<PaymentCustomer | null> {
    // CCBill doesn't have a customer lookup API
    // This would need to query our local database
    console.warn('CCBill: getCustomer requires local database lookup')
    return null
  }

  async updateCustomer(
    processorCustomerId: string,
    data: Partial<Pick<PaymentCustomer, 'email' | 'name' | 'metadata'>>
  ): Promise<PaymentCustomer> {
    // CCBill doesn't support customer updates via API
    // Updates happen through their support portal
    throw new Error('CCBill: Customer updates must be done through CCBill support portal')
  }

  // ─────────────────────────────────────────────────────────────────
  // Subscription Management
  // ─────────────────────────────────────────────────────────────────

  async createCheckoutSession(options: CreateCheckoutOptions): Promise<CheckoutSession> {
    const price = this.config.pricing.find(p => p.plan === options.plan)
    if (!price) {
      throw new Error(`No pricing configured for plan: ${options.plan}`)
    }

    // Build CCBill FlexForm URL
    const formUrl = this.buildFlexFormUrl({
      email: options.customerEmail,
      priceId: price.processorPriceId,
      amountCents: price.amountCents,
      currency: price.currency,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      metadata: options.metadata,
    })

    const sessionId = `ccbill_session_${crypto.randomUUID()}`

    return {
      id: sessionId,
      url: formUrl,
      processor: 'ccbill',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
    }
  }

  private buildFlexFormUrl(params: {
    email?: string
    priceId: string
    amountCents: number
    currency: string
    successUrl: string
    cancelUrl: string
    metadata?: Record<string, string>
  }): string {
    const { accountNumber, subAccountNumber, flexId, salt } = this.config

    // CCBill requires a digest for security
    const formDigest = this.generateFormDigest(
      params.amountCents,
      params.currency,
      salt
    )

    const baseUrl = this.config.testMode
      ? 'https://sandbox-api.ccbill.com/wap-frontflex/flexforms'
      : 'https://api.ccbill.com/wap-frontflex/flexforms'

    const urlParams = new URLSearchParams({
      clientAccnum: accountNumber,
      clientSubacc: subAccountNumber,
      formName: flexId,
      formPrice: (params.amountCents / 100).toFixed(2),
      formPeriod: '30', // Monthly
      currencyCode: this.getCurrencyCode(params.currency),
      formDigest,
    })

    // Add optional params
    if (params.email) {
      urlParams.set('email', params.email)
    }

    // Pass-through parameters (returned in webhooks)
    if (params.metadata) {
      Object.entries(params.metadata).forEach(([key, value]) => {
        urlParams.set(`X-${key}`, value)
      })
    }

    // Success/failure URLs
    urlParams.set('successUrl', params.successUrl)
    urlParams.set('failUrl', params.cancelUrl)

    return `${baseUrl}/${flexId}?${urlParams.toString()}`
  }

  private generateFormDigest(
    amountCents: number,
    currency: string,
    salt: string
  ): string {
    const price = (amountCents / 100).toFixed(2)
    const period = '30'
    const currencyCode = this.getCurrencyCode(currency)
    
    const digestString = `${price}${period}${currencyCode}${salt}`
    return crypto.createHash('md5').update(digestString).digest('hex')
  }

  private getCurrencyCode(currency: string): string {
    const codes: Record<string, string> = {
      USD: '840',
      EUR: '978',
      GBP: '826',
      CAD: '124',
      AUD: '036',
    }
    return codes[currency.toUpperCase()] || '840'
  }

  async createPortalSession(options: CreatePortalOptions): Promise<PortalSession> {
    // CCBill doesn't have a customer portal like Stripe
    // Options:
    // 1. Build a custom management UI that uses DataLink API
    // 2. Redirect to a support contact form
    // 3. Provide cancel-only functionality via API

    // For now, return a link to a custom billing management page
    const portalUrl = `${options.returnUrl}?manage_billing=ccbill&customer=${options.customerId}`

    return {
      id: `ccbill_portal_${crypto.randomUUID()}`,
      url: portalUrl,
      processor: 'ccbill',
    }
  }

  async getSubscription(processorSubscriptionId: string): Promise<PaymentSubscription | null> {
    // CCBill DataLink API for subscription lookup
    if (!this.config.dataLinkUsername || !this.config.dataLinkPassword) {
      console.warn('CCBill: DataLink credentials required for subscription lookup')
      return null
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/transactions/subscription/${processorSubscriptionId}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${this.config.dataLinkUsername}:${this.config.dataLinkPassword}`
            ).toString('base64')}`,
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) return null

      const data = await response.json()
      return this.mapSubscription(data)
    } catch (error) {
      console.error('CCBill: Error fetching subscription', error)
      return null
    }
  }

  async cancelSubscription(
    processorSubscriptionId: string,
    immediate = false
  ): Promise<PaymentSubscription> {
    if (!this.config.dataLinkUsername || !this.config.dataLinkPassword) {
      throw new Error('CCBill: DataLink credentials required for cancellation')
    }

    const response = await fetch(
      `${this.baseUrl}/transactions/subscription/${processorSubscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.config.dataLinkUsername}:${this.config.dataLinkPassword}`
          ).toString('base64')}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          immediate,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`CCBill cancellation failed: ${error}`)
    }

    const data = await response.json()
    return this.mapSubscription(data)
  }

  private mapSubscription(data: Record<string, unknown>): PaymentSubscription {
    // Determine plan from the recurring price
    const amountCents = Math.round(Number(data.recurringPrice || 0) * 100)
    const planConfig = this.config.pricing.find(p => p.amountCents === amountCents)
    const plan: PlanTier = planConfig?.plan || 'pro'

    return {
      id: data.subscriptionId as string,
      processorId: data.subscriptionId as string,
      processor: 'ccbill',
      customerId: data.clientAccnum as string,
      plan,
      status: this.mapStatus(data.subscriptionStatus as string),
      currentPeriodStart: new Date(data.signupDate as string),
      currentPeriodEnd: new Date(data.nextRenewalDate as string || Date.now()),
      cancelAtPeriodEnd: data.cancelStatus === 'pending',
      metadata: data.passthrough as Record<string, string>,
    }
  }

  private mapStatus(status: string): SubscriptionStatus {
    const mapping: Record<string, SubscriptionStatus> = {
      ACTIVE: 'active',
      CANCELED: 'canceled',
      EXPIRED: 'canceled',
      SUSPENDED: 'past_due',
      PENDING: 'incomplete',
    }
    return mapping[status?.toUpperCase()] || 'active'
  }

  // ─────────────────────────────────────────────────────────────────
  // Webhook Handling
  // ─────────────────────────────────────────────────────────────────

  verifyWebhook(payload: string | Buffer, signature: string): PaymentWebhookEvent {
    // CCBill webhooks use digest verification
    // The signature is typically MD5(subscriptionId + eventType + timestamp + secret)
    
    const data = typeof payload === 'string' 
      ? this.parseFormData(payload)
      : this.parseFormData(payload.toString())

    // Verify the digest
    const expectedDigest = crypto
      .createHash('md5')
      .update(`${data.subscriptionId}${data.eventType}${data.timestamp}${this.config.webhookSecret}`)
      .digest('hex')

    if (signature !== expectedDigest) {
      throw new Error('CCBill webhook signature verification failed')
    }

    return {
      id: `ccbill_event_${data.transactionId || crypto.randomUUID()}`,
      processor: 'ccbill',
      type: this.mapEventType(data.eventType),
      customerId: data.email, // CCBill uses email as identifier
      subscriptionId: data.subscriptionId,
      data: data as Record<string, unknown>,
      raw: data,
    }
  }

  private parseFormData(payload: string): CCBillWebhookPayload {
    const params = new URLSearchParams(payload)
    const data: Record<string, string> = {}
    params.forEach((value, key) => {
      data[key] = value
    })
    return data as CCBillWebhookPayload
  }

  parseWebhookEvent(event: PaymentWebhookEvent): {
    type: PaymentEventType
    subscription?: Partial<PaymentSubscription>
    customerId?: string
  } {
    const data = event.data as CCBillWebhookPayload

    if (event.type.startsWith('subscription.')) {
      return {
        type: event.type,
        customerId: data.email,
        subscription: {
          processorId: data.subscriptionId,
          processor: 'ccbill',
          status: this.mapEventToStatus(event.type),
          currentPeriodEnd: data.nextBillingDate 
            ? new Date(data.nextBillingDate) 
            : undefined,
        },
      }
    }

    return { type: event.type, customerId: data.email }
  }

  private mapEventType(ccbillEvent: string): PaymentEventType {
    const mapping: Record<string, PaymentEventType> = {
      NewSaleSuccess: 'subscription.created',
      NewSaleFailure: 'payment.failed',
      Renewal: 'subscription.renewed',
      RenewalFailure: 'payment.failed',
      Cancellation: 'subscription.canceled',
      Expiration: 'subscription.canceled',
      Chargeback: 'chargeback.created',
      Refund: 'refund.created',
      BillingUpdate: 'subscription.updated',
      UserReactivation: 'subscription.created',
    }
    return mapping[ccbillEvent] || 'subscription.updated'
  }

  private mapEventToStatus(eventType: PaymentEventType): SubscriptionStatus {
    const mapping: Record<PaymentEventType, SubscriptionStatus> = {
      'subscription.created': 'active',
      'subscription.updated': 'active',
      'subscription.canceled': 'canceled',
      'subscription.renewed': 'active',
      'payment.succeeded': 'active',
      'payment.failed': 'past_due',
      'customer.created': 'active',
      'customer.updated': 'active',
      'refund.created': 'active',
      'chargeback.created': 'past_due',
    }
    return mapping[eventType] || 'active'
  }

  // ─────────────────────────────────────────────────────────────────
  // Price Configuration
  // ─────────────────────────────────────────────────────────────────

  getPricing(): PlanPricing[] {
    return this.config.pricing
  }
}
