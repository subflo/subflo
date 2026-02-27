/**
 * Fanbucks Virtual Currency System
 * 
 * Users purchase Fanbucks with real money, then spend them on the platform.
 * Creators earn Fanbucks and can cash out to real money.
 * 
 * Exchange Rate: 1 Fanbuck = $0.01 USD (100 Fanbucks = $1)
 * This makes math easy and allows microtransactions.
 */

// 1 Fanbuck = 1 cent USD
export const FANBUCKS_PER_DOLLAR = 100
export const FANBUCKS_SYMBOL = '🪙'
export const FANBUCKS_NAME = 'Fanbucks'

/**
 * Transaction types
 */
export type FanbucksTransactionType =
  | 'purchase'        // Bought fanbucks with real money
  | 'bonus'           // Free fanbucks (promotions, referrals)
  | 'tip'             // Sent/received a tip
  | 'subscription'    // Paid for a subscription
  | 'ppv'             // Paid for pay-per-view content
  | 'message'         // Paid message (if enabled)
  | 'refund'          // Refund from platform
  | 'payout'          // Creator cashed out to real money
  | 'adjustment'      // Admin adjustment
  | 'transfer'        // Internal transfer

/**
 * Transaction status
 */
export type FanbucksTransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'reversed'

/**
 * Wallet balance
 */
export interface FanbucksWallet {
  id: string
  userId: string
  balance: number              // Current spendable balance
  pendingBalance: number       // Pending (e.g., creator earnings not yet available)
  lifetimePurchased: number    // Total ever purchased
  lifetimeSpent: number        // Total ever spent
  lifetimeEarned: number       // Total ever earned (for creators)
  lifetimePaidOut: number      // Total cashed out (for creators)
  createdAt: Date
  updatedAt: Date
}

/**
 * Transaction record
 */
export interface FanbucksTransaction {
  id: string
  walletId: string
  type: FanbucksTransactionType
  amount: number               // Positive = credit, negative = debit
  balanceAfter: number         // Balance after this transaction
  status: FanbucksTransactionStatus
  description?: string
  
  // Related entities
  relatedUserId?: string       // Other party (e.g., creator for tips)
  relatedTransactionId?: string // Matching transaction (e.g., creator's earning)
  paymentIntentId?: string     // Stripe/CCBill payment ID for purchases
  
  // Metadata
  metadata?: Record<string, unknown>
  createdAt: Date
  completedAt?: Date
}

/**
 * Purchase package (buy fanbucks with real money)
 */
export interface FanbucksPackage {
  id: string
  name: string
  fanbucks: number             // Amount of fanbucks
  priceCents: number           // Price in cents USD
  bonusFanbucks: number        // Bonus fanbucks (e.g., "Buy 1000, get 100 free")
  isPopular?: boolean          // Highlight this package
  isActive: boolean
  sortOrder: number
}

/**
 * Payout request (creator cashing out)
 */
export interface FanbucksPayoutRequest {
  id: string
  userId: string
  walletId: string
  fanbucksAmount: number       // Fanbucks being cashed out
  payoutAmountCents: number    // Real money amount (minus fees)
  feeCents: number             // Platform fee
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled'
  payoutMethod: 'bank_transfer' | 'paypal' | 'crypto' | 'check'
  payoutDetails: Record<string, string>  // Account details
  processedAt?: Date
  createdAt: Date
}

/**
 * Default purchase packages
 */
export const DEFAULT_PACKAGES: Omit<FanbucksPackage, 'id'>[] = [
  {
    name: 'Starter',
    fanbucks: 500,
    priceCents: 500,           // $5
    bonusFanbucks: 0,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Popular',
    fanbucks: 1000,
    priceCents: 999,           // $9.99
    bonusFanbucks: 50,         // 5% bonus
    isPopular: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Value',
    fanbucks: 2500,
    priceCents: 2299,          // $22.99
    bonusFanbucks: 200,        // 8% bonus
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'Premium',
    fanbucks: 5000,
    priceCents: 4499,          // $44.99
    bonusFanbucks: 500,        // 10% bonus
    isActive: true,
    sortOrder: 4,
  },
  {
    name: 'Ultimate',
    fanbucks: 10000,
    priceCents: 8499,          // $84.99
    bonusFanbucks: 1500,       // 15% bonus
    isActive: true,
    sortOrder: 5,
  },
]

/**
 * Platform fee configuration
 */
export const PLATFORM_CONFIG = {
  // Fee taken from creator earnings (e.g., 20% = creator gets 80%)
  creatorFeePercent: 20,
  
  // Minimum payout amount in fanbucks
  minPayoutFanbucks: 5000,     // $50 minimum payout
  
  // Payout fee (flat fee in cents)
  payoutFeeCents: 0,           // No payout fee (optional)
  
  // Days before earnings are available for payout
  earningsHoldDays: 7,
}

/**
 * Convert fanbucks to display string
 */
export function formatFanbucks(amount: number): string {
  return `${FANBUCKS_SYMBOL} ${amount.toLocaleString()}`
}

/**
 * Convert fanbucks to USD cents
 */
export function fanbucksToCents(fanbucks: number): number {
  return fanbucks // 1 fanbuck = 1 cent
}

/**
 * Convert USD cents to fanbucks
 */
export function centsToFanbucks(cents: number): number {
  return cents // 1 cent = 1 fanbuck
}

/**
 * Format fanbucks as USD
 */
export function fanbucksToUSD(fanbucks: number): string {
  const dollars = fanbucks / FANBUCKS_PER_DOLLAR
  return `$${dollars.toFixed(2)}`
}

/**
 * Calculate creator earnings after platform fee
 */
export function calculateCreatorEarnings(grossFanbucks: number): number {
  const feePercent = PLATFORM_CONFIG.creatorFeePercent
  return Math.floor(grossFanbucks * (100 - feePercent) / 100)
}

/**
 * Calculate platform fee from gross amount
 */
export function calculatePlatformFee(grossFanbucks: number): number {
  const feePercent = PLATFORM_CONFIG.creatorFeePercent
  return Math.floor(grossFanbucks * feePercent / 100)
}
