import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Landing Page Click Capture Route
 * 
 * URL: subflos.com/go/{slug}?utm_source=meta&utm_medium=cpc&utm_campaign=xxx&utm_content=xxx
 * 
 * This is the critical UTM capture point in the attribution flow:
 * 1. Parse all UTM parameters from URL
 * 2. Generate unique subflo_click_id
 * 3. Detect geo/device from headers
 * 4. Store click in Supabase
 * 5. Render landing page (in page.tsx) or redirect
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  
  // Look up the landing page
  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .select(`
      *,
      smart_links!inner(
        id,
        tracking_url,
        org_id,
        creator_id
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !landingPage) {
    // Landing page not found, return 404
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

  // Record the click
  await supabase.from('clicks').insert({
    org_id: landingPage.smart_links.org_id,
    smart_link_id: landingPage.smart_links.id,
    landing_page_id: landingPage.id,
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

  // Increment landing page view counter
  await supabase.rpc('increment_landing_page_views', {
    page_id: landingPage.id,
  })

  // Set click ID in cookie for the landing page to use
  const response = NextResponse.next()
  response.cookies.set('subflo_click_id', subflo_click_id, {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  })

  // Store smart link URL with click ID for CTA button
  response.cookies.set('subflo_smart_link', 
    `${landingPage.smart_links.tracking_url}?ecid=${subflo_click_id}`,
    {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false, // Accessible by client JS
      secure: true,
      sameSite: 'lax',
    }
  )

  return response
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
