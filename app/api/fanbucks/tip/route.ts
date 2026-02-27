import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createWalletService, formatFanbucks } from '@/lib/fanbucks'

/**
 * Send a tip to another user
 * 
 * POST /api/fanbucks/tip
 * Body: {
 *   recipientId: string,     // User ID to tip
 *   amount: number,          // Fanbucks amount
 *   message?: string,        // Optional message
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { recipientId, amount, message } = body

  // Validation
  if (!recipientId) {
    return NextResponse.json({ error: 'Recipient ID required' }, { status: 400 })
  }
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }
  if (amount < 10) {
    return NextResponse.json({ error: 'Minimum tip is 10 fanbucks' }, { status: 400 })
  }
  if (recipientId === user.id) {
    return NextResponse.json({ error: 'Cannot tip yourself' }, { status: 400 })
  }

  // Verify recipient exists
  const { data: recipient } = await adminSupabase
    .from('auth.users')
    .select('id, email')
    .eq('id', recipientId)
    .single()

  // Alternative: check if they have a creator profile
  const { data: creator } = await adminSupabase
    .from('creators')
    .select('id, username, display_name')
    .eq('user_id', recipientId)
    .single()

  if (!creator) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
  }

  // Create wallet service with admin client for cross-user operations
  const wallet = createWalletService(adminSupabase)

  try {
    const result = await wallet.transfer(
      user.id,
      recipientId,
      amount,
      'tip',
      {
        applyCreatorFee: true,
        description: message || 'Tip',
        metadata: {
          creator_username: creator.username,
          message,
        },
      }
    )

    return NextResponse.json({
      success: true,
      transactionId: result.senderTransaction.id,
      amount,
      amountFormatted: formatFanbucks(amount),
      platformFee: result.platformFee,
      creatorReceived: amount - result.platformFee,
      creatorReceivedFormatted: formatFanbucks(amount - result.platformFee),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transfer failed'
    
    if (message.includes('Insufficient balance')) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    console.error('Tip failed:', error)
    return NextResponse.json({ error: 'Failed to send tip' }, { status: 500 })
  }
}
