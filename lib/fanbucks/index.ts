/**
 * Fanbucks Virtual Currency Module
 * 
 * Usage:
 * ```ts
 * import { createWalletService, formatFanbucks } from '@/lib/fanbucks'
 * 
 * const wallet = createWalletService(supabase)
 * const balance = await wallet.getBalance(userId)
 * 
 * // Tip a creator
 * await wallet.transfer(fromUserId, toUserId, 100, 'tip', {
 *   applyCreatorFee: true,
 *   description: 'Great content!'
 * })
 * ```
 */

export * from './types'
export * from './wallet'
