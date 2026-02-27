import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatFanbucks, fanbucksToUSD } from '@/lib/fanbucks'

/**
 * Get available fanbucks purchase packages
 * 
 * GET /api/fanbucks/packages
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: packages, error } = await supabase
    .from('fanbucks_packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
  }

  const formattedPackages = packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    fanbucks: pkg.fanbucks,
    bonusFanbucks: pkg.bonus_fanbucks,
    totalFanbucks: pkg.fanbucks + pkg.bonus_fanbucks,
    priceCents: pkg.price_cents,
    priceFormatted: `$${(pkg.price_cents / 100).toFixed(2)}`,
    fanbucksFormatted: formatFanbucks(pkg.fanbucks + pkg.bonus_fanbucks),
    isPopular: pkg.is_popular,
    // Value indicator (fanbucks per dollar)
    valuePerDollar: Math.round((pkg.fanbucks + pkg.bonus_fanbucks) / (pkg.price_cents / 100)),
  }))

  return NextResponse.json({ packages: formattedPackages })
}
