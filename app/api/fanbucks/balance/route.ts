import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createWalletService, formatFanbucks, fanbucksToUSD } from '@/lib/fanbucks'

/**
 * Get current user's fanbucks balance
 * 
 * GET /api/fanbucks/balance
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const wallet = createWalletService(supabase)
  const { balance, pending } = await wallet.getBalance(user.id)

  return NextResponse.json({
    balance,
    pending,
    formatted: formatFanbucks(balance),
    pendingFormatted: formatFanbucks(pending),
    usdValue: fanbucksToUSD(balance),
    pendingUsdValue: fanbucksToUSD(pending),
  })
}
