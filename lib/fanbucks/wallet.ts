/**
 * Fanbucks Wallet Service
 * 
 * Handles all wallet operations: balance checks, credits, debits, transfers.
 * All operations are atomic and use database transactions.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  FanbucksWallet,
  FanbucksTransaction,
  FanbucksTransactionType,
  FanbucksTransactionStatus,
  calculateCreatorEarnings,
  calculatePlatformFee,
  PLATFORM_CONFIG,
} from './types'

export class FanbucksWalletService {
  constructor(private supabase: SupabaseClient) {}

  // ─────────────────────────────────────────────────────────────────
  // Wallet Management
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get or create wallet for a user
   */
  async getOrCreateWallet(userId: string): Promise<FanbucksWallet> {
    // Try to get existing wallet
    const { data: existing } = await this.supabase
      .from('fanbucks_wallets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existing) {
      return this.mapWallet(existing)
    }

    // Create new wallet
    const { data: created, error } = await this.supabase
      .from('fanbucks_wallets')
      .insert({
        user_id: userId,
        balance: 0,
        pending_balance: 0,
        lifetime_purchased: 0,
        lifetime_spent: 0,
        lifetime_earned: 0,
        lifetime_paid_out: 0,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create wallet: ${error.message}`)
    return this.mapWallet(created)
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<FanbucksWallet | null> {
    const { data } = await this.supabase
      .from('fanbucks_wallets')
      .select('*')
      .eq('id', walletId)
      .single()

    return data ? this.mapWallet(data) : null
  }

  /**
   * Get wallet by user ID
   */
  async getWalletByUserId(userId: string): Promise<FanbucksWallet | null> {
    const { data } = await this.supabase
      .from('fanbucks_wallets')
      .select('*')
      .eq('user_id', userId)
      .single()

    return data ? this.mapWallet(data) : null
  }

  /**
   * Get balance for a user
   */
  async getBalance(userId: string): Promise<{ balance: number; pending: number }> {
    const wallet = await this.getOrCreateWallet(userId)
    return {
      balance: wallet.balance,
      pending: wallet.pendingBalance,
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Transactions
  // ─────────────────────────────────────────────────────────────────

  /**
   * Credit fanbucks to a wallet (add funds)
   */
  async credit(
    userId: string,
    amount: number,
    type: FanbucksTransactionType,
    options: {
      description?: string
      relatedUserId?: string
      relatedTransactionId?: string
      paymentIntentId?: string
      metadata?: Record<string, unknown>
      pending?: boolean  // Add to pending balance instead
    } = {}
  ): Promise<FanbucksTransaction> {
    if (amount <= 0) throw new Error('Credit amount must be positive')

    const wallet = await this.getOrCreateWallet(userId)
    
    // Use RPC for atomic update
    const { data, error } = await this.supabase.rpc('fanbucks_credit', {
      p_wallet_id: wallet.id,
      p_amount: amount,
      p_type: type,
      p_description: options.description,
      p_related_user_id: options.relatedUserId,
      p_related_transaction_id: options.relatedTransactionId,
      p_payment_intent_id: options.paymentIntentId,
      p_metadata: options.metadata || {},
      p_pending: options.pending || false,
    })

    if (error) throw new Error(`Credit failed: ${error.message}`)
    return this.mapTransaction(data)
  }

  /**
   * Debit fanbucks from a wallet (remove funds)
   */
  async debit(
    userId: string,
    amount: number,
    type: FanbucksTransactionType,
    options: {
      description?: string
      relatedUserId?: string
      metadata?: Record<string, unknown>
    } = {}
  ): Promise<FanbucksTransaction> {
    if (amount <= 0) throw new Error('Debit amount must be positive')

    const wallet = await this.getOrCreateWallet(userId)
    
    // Check sufficient balance
    if (wallet.balance < amount) {
      throw new Error('Insufficient balance')
    }

    // Use RPC for atomic update
    const { data, error } = await this.supabase.rpc('fanbucks_debit', {
      p_wallet_id: wallet.id,
      p_amount: amount,
      p_type: type,
      p_description: options.description,
      p_related_user_id: options.relatedUserId,
      p_metadata: options.metadata || {},
    })

    if (error) throw new Error(`Debit failed: ${error.message}`)
    return this.mapTransaction(data)
  }

  /**
   * Transfer fanbucks between users (e.g., tip)
   * Handles creator fee automatically
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    type: FanbucksTransactionType,
    options: {
      description?: string
      applyCreatorFee?: boolean  // Take platform cut from recipient
      metadata?: Record<string, unknown>
    } = {}
  ): Promise<{
    senderTransaction: FanbucksTransaction
    recipientTransaction: FanbucksTransaction
    platformFee: number
  }> {
    if (amount <= 0) throw new Error('Transfer amount must be positive')
    if (fromUserId === toUserId) throw new Error('Cannot transfer to self')

    const senderWallet = await this.getOrCreateWallet(fromUserId)
    
    if (senderWallet.balance < amount) {
      throw new Error('Insufficient balance')
    }

    // Calculate amounts
    const platformFee = options.applyCreatorFee 
      ? calculatePlatformFee(amount)
      : 0
    const recipientAmount = amount - platformFee

    // Use RPC for atomic transfer
    const { data, error } = await this.supabase.rpc('fanbucks_transfer', {
      p_from_user_id: fromUserId,
      p_to_user_id: toUserId,
      p_amount: amount,
      p_recipient_amount: recipientAmount,
      p_platform_fee: platformFee,
      p_type: type,
      p_description: options.description,
      p_metadata: options.metadata || {},
    })

    if (error) throw new Error(`Transfer failed: ${error.message}`)
    
    return {
      senderTransaction: this.mapTransaction(data.sender_transaction),
      recipientTransaction: this.mapTransaction(data.recipient_transaction),
      platformFee,
    }
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactions(
    userId: string,
    options: {
      limit?: number
      offset?: number
      types?: FanbucksTransactionType[]
    } = {}
  ): Promise<FanbucksTransaction[]> {
    const wallet = await this.getWalletByUserId(userId)
    if (!wallet) return []

    let query = this.supabase
      .from('fanbucks_transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })

    if (options.types?.length) {
      query = query.in('type', options.types)
    }
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to get transactions: ${error.message}`)

    return (data || []).map(this.mapTransaction)
  }

  // ─────────────────────────────────────────────────────────────────
  // Purchase Flow
  // ─────────────────────────────────────────────────────────────────

  /**
   * Complete a fanbucks purchase (called after payment succeeds)
   */
  async completePurchase(
    userId: string,
    fanbucks: number,
    bonusFanbucks: number,
    paymentIntentId: string,
    metadata?: Record<string, unknown>
  ): Promise<FanbucksTransaction> {
    const totalFanbucks = fanbucks + bonusFanbucks

    return this.credit(userId, totalFanbucks, 'purchase', {
      description: bonusFanbucks > 0
        ? `Purchased ${fanbucks} fanbucks (+${bonusFanbucks} bonus)`
        : `Purchased ${fanbucks} fanbucks`,
      paymentIntentId,
      metadata: {
        ...metadata,
        base_fanbucks: fanbucks,
        bonus_fanbucks: bonusFanbucks,
      },
    })
  }

  // ─────────────────────────────────────────────────────────────────
  // Pending Balance (Creator Earnings)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Move pending balance to available balance
   * Called by cron job after hold period
   */
  async releasePendingBalance(
    userId: string,
    amount?: number  // If not specified, release all
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(userId)
    const releaseAmount = amount || wallet.pendingBalance

    if (releaseAmount <= 0) return
    if (releaseAmount > wallet.pendingBalance) {
      throw new Error('Cannot release more than pending balance')
    }

    const { error } = await this.supabase.rpc('fanbucks_release_pending', {
      p_wallet_id: wallet.id,
      p_amount: releaseAmount,
    })

    if (error) throw new Error(`Failed to release pending: ${error.message}`)
  }

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────

  private mapWallet(data: Record<string, unknown>): FanbucksWallet {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      balance: data.balance as number,
      pendingBalance: data.pending_balance as number,
      lifetimePurchased: data.lifetime_purchased as number,
      lifetimeSpent: data.lifetime_spent as number,
      lifetimeEarned: data.lifetime_earned as number,
      lifetimePaidOut: data.lifetime_paid_out as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    }
  }

  private mapTransaction(data: Record<string, unknown>): FanbucksTransaction {
    return {
      id: data.id as string,
      walletId: data.wallet_id as string,
      type: data.type as FanbucksTransactionType,
      amount: data.amount as number,
      balanceAfter: data.balance_after as number,
      status: data.status as FanbucksTransactionStatus,
      description: data.description as string | undefined,
      relatedUserId: data.related_user_id as string | undefined,
      relatedTransactionId: data.related_transaction_id as string | undefined,
      paymentIntentId: data.payment_intent_id as string | undefined,
      metadata: data.metadata as Record<string, unknown> | undefined,
      createdAt: new Date(data.created_at as string),
      completedAt: data.completed_at ? new Date(data.completed_at as string) : undefined,
    }
  }
}

/**
 * Create a wallet service instance
 */
export function createWalletService(supabase: SupabaseClient): FanbucksWalletService {
  return new FanbucksWalletService(supabase)
}
