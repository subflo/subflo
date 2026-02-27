/**
 * Payment Processing Module
 * 
 * Pluggable payment processor architecture.
 * Supports Stripe, CCBill, and other processors.
 * 
 * Usage:
 * ```ts
 * import { getPaymentProcessor, getDefaultProcessor } from '@/lib/payments'
 * 
 * // Get specific processor
 * const stripe = getPaymentProcessor('stripe')
 * 
 * // Get default (configured) processor
 * const processor = getDefaultProcessor()
 * 
 * // Create checkout
 * const session = await processor.createCheckoutSession({
 *   plan: 'pro',
 *   customerEmail: 'user@example.com',
 *   successUrl: 'https://app.example.com/success',
 *   cancelUrl: 'https://app.example.com/cancel',
 * })
 * ```
 */

import { PaymentProcessor, PaymentProcessorType, PaymentProcessorConfig, PlanPricing } from './types'
import { StripeProcessor } from './processors/stripe'
import { CCBillProcessor } from './processors/ccbill'

// Re-export types
export * from './types'
export { StripeProcessor } from './processors/stripe'
export { CCBillProcessor } from './processors/ccbill'

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

/**
 * Default pricing configuration
 * Override with PAYMENT_PRICING env var (JSON)
 */
const DEFAULT_PRICING: PlanPricing[] = [
  {
    plan: 'pro',
    processorPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    amountCents: 2900, // $29/month
    currency: 'USD',
    interval: 'month',
  },
  {
    plan: 'enterprise',
    processorPriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    amountCents: 9900, // $99/month
    currency: 'USD',
    interval: 'month',
  },
]

/**
 * Get pricing configuration from env or defaults
 */
function getPricing(): PlanPricing[] {
  const envPricing = process.env.PAYMENT_PRICING
  if (envPricing) {
    try {
      return JSON.parse(envPricing)
    } catch {
      console.warn('Invalid PAYMENT_PRICING env var, using defaults')
    }
  }
  return DEFAULT_PRICING
}

// ─────────────────────────────────────────────────────────────────
// Processor Registry
// ─────────────────────────────────────────────────────────────────

const processors: Map<PaymentProcessorType, PaymentProcessor> = new Map()

/**
 * Initialize a processor if credentials are available
 */
function initializeProcessor(type: PaymentProcessorType): PaymentProcessor | null {
  const pricing = getPricing()

  switch (type) {
    case 'stripe': {
      const secretKey = process.env.STRIPE_SECRET_KEY
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      
      if (!secretKey || !webhookSecret) {
        console.warn('Stripe credentials not configured')
        return null
      }

      return new StripeProcessor({
        secretKey,
        webhookSecret,
        pricing,
      })
    }

    case 'ccbill': {
      const accountNumber = process.env.CCBILL_ACCOUNT_NUMBER
      const subAccountNumber = process.env.CCBILL_SUBACCOUNT_NUMBER
      const flexId = process.env.CCBILL_FLEX_ID
      const salt = process.env.CCBILL_SALT
      const webhookSecret = process.env.CCBILL_WEBHOOK_SECRET

      if (!accountNumber || !subAccountNumber || !flexId || !salt || !webhookSecret) {
        console.warn('CCBill credentials not configured')
        return null
      }

      return new CCBillProcessor({
        accountNumber,
        subAccountNumber,
        flexId,
        salt,
        webhookSecret,
        dataLinkUsername: process.env.CCBILL_DATALINK_USERNAME,
        dataLinkPassword: process.env.CCBILL_DATALINK_PASSWORD,
        testMode: process.env.CCBILL_TEST_MODE === 'true',
        pricing,
      })
    }

    case 'epoch': {
      // TODO: Implement Epoch processor
      console.warn('Epoch processor not yet implemented')
      return null
    }

    case 'segpay': {
      // TODO: Implement Segpay processor
      console.warn('Segpay processor not yet implemented')
      return null
    }

    default:
      return null
  }
}

/**
 * Get a specific payment processor
 */
export function getPaymentProcessor(type: PaymentProcessorType): PaymentProcessor {
  // Check cache
  let processor = processors.get(type)
  if (processor) return processor

  // Initialize
  processor = initializeProcessor(type)
  if (!processor) {
    throw new Error(`Payment processor '${type}' is not configured`)
  }

  // Cache and return
  processors.set(type, processor)
  return processor
}

/**
 * Get the default payment processor
 * Configurable via PAYMENT_PROCESSOR env var
 */
export function getDefaultProcessor(): PaymentProcessor {
  const defaultType = (process.env.PAYMENT_PROCESSOR || 'stripe') as PaymentProcessorType
  return getPaymentProcessor(defaultType)
}

/**
 * Check if a processor is configured
 */
export function isProcessorConfigured(type: PaymentProcessorType): boolean {
  try {
    getPaymentProcessor(type)
    return true
  } catch {
    return false
  }
}

/**
 * Get all configured processors
 */
export function getConfiguredProcessors(): PaymentProcessorType[] {
  const types: PaymentProcessorType[] = ['stripe', 'ccbill', 'epoch', 'segpay']
  return types.filter(type => isProcessorConfigured(type))
}

// ─────────────────────────────────────────────────────────────────
// Webhook Utilities
// ─────────────────────────────────────────────────────────────────

/**
 * Verify and parse a webhook from any processor
 * Detects processor from headers or payload
 */
export function verifyWebhook(
  processor: PaymentProcessorType,
  payload: string | Buffer,
  signature: string
) {
  const proc = getPaymentProcessor(processor)
  return proc.verifyWebhook(payload, signature)
}

/**
 * Get the webhook signature header name for a processor
 */
export function getWebhookSignatureHeader(processor: PaymentProcessorType): string {
  const headers: Record<PaymentProcessorType, string> = {
    stripe: 'stripe-signature',
    ccbill: 'x-ccbill-digest',
    epoch: 'x-epoch-signature',
    segpay: 'x-segpay-signature',
  }
  return headers[processor]
}
