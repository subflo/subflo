import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Lightweight Redirect Route (No Landing Page)
 * 
 * URL: subflos.com/r/{smart_link_id}?utm_source=meta&utm_medium=cpc&utm_campaign=xxx&utm_content=xxx
 * 
 * For campaigns that skip the landing page and link directly to the Smart Link.
 * Still captures UTMs and generates subflo_click_id for attribution.
 * 
 * Flow:
 * 1. Capture UTMs
 * 2. Generate subflo_click_id
 * 3. Record click in Supabase
 * 4. 302 redirect to Smart Link with ecid
 * 
 * Total added latency: ~20ms (Vercel Edge)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { smart_link_id: string } }
) {
  const { smart_link_id } = params
  const { searchParams } = new URL(request.url)

  // Look up the smart link
  const { data: smartLink, error } = await supabase
    .from('smart_links')
    .select('id, tracking_url, org_id')
    .eq('id', smart_link_id)
    .eq('is_active', true)
    .single()

  if (error || !smartLink) {
    // Smart link not found or inactive
    return NextResponse.redirect(new URL('/404', request.url))
  }

  // Extract UTM parameters
  const utm_source = searchParams.get('utm_source') || 'direct'
  const utm_medium = searchParams.get('utm_medium') || 'none'
  const utm_campaign = searchParams.get('utm_campaign') || ''
  const utm_content = searchParams.get('utm_content') || ''

  // Generate unique click ID
  const subflo_click_id = nanoid(21)

  // Get geo/device info from headers
  const country = request.headers.get('cf-ipcountry') || 
                  request.headers.get('x-vercel-ip-country') || 
                  'unknown'
  const userAgent = request.headers.get('user-agent') || ''
  const device_type = detectDeviceType(userAgent)
  const browser = detectBrowser(userAgent)
  const referrer = request.headers.get('referer') || ''

  // Record the click (non-blocking would be ideal, but Edge doesn't support background tasks)
  await supabase.from('clicks').insert({
    org_id: smartLink.org_id,
    smart_link_id: smartLink.id,
    subflo_click_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    country,
    device_type,
    browser,
    referrer,
  })

  // Build Smart Link URL with our click ID
  const redirectUrl = new URL(smartLink.tracking_url)
  redirectUrl.searchParams.set('ecid', subflo_click_id)

  // 302 redirect to Smart Link
  return NextResponse.redirect(redirectUrl.toString(), 302)
}

function detectDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'mobile'
  if (/tablet|ipad/i.test(userAgent)) return 'tablet'
  return 'desktop'
}

function detectBrowser(userAgent: string): string {
  if (/chrome/i.test(userAgent)) return 'Chrome'
  if (/firefox/i.test(userAgent)) return 'Firefox'
  if (/safari/i.test(userAgent)) return 'Safari'
  if (/edge/i.test(userAgent)) return 'Edge'
  return 'Other'
}
