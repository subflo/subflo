import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createWalletService, formatFanbucks, FanbucksTransactionType } from '@/lib/fanbucks'

/**
 * Get transaction history
 * 
 * GET /api/fanbucks/transactions
 * Query params:
 *   - limit: number (default 50)
 *   - offset: number (default 0)
 *   - types: comma-separated transaction types
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const typesParam = searchParams.get('types')
  const types = typesParam
    ? typesParam.split(',') as FanbucksTransactionType[]
    : undefined

  const wallet = createWalletService(supabase)

  try {
    const transactions = await wallet.getTransactions(user.id, {
      limit,
      offset,
      types,
    })

    const formatted = transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      amountFormatted: formatFanbucks(Math.abs(tx.amount)),
      isCredit: tx.amount > 0,
      balanceAfter: tx.balanceAfter,
      balanceAfterFormatted: formatFanbucks(tx.balanceAfter),
      description: tx.description,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
      metadata: tx.metadata,
    }))

    return NextResponse.json({
      transactions: formatted,
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit,
      },
    })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
