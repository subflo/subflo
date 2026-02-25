import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/inngest/client'

/**
 * Smart Link Postback Receiver
 * 
 * Receives GET requests from trk.of-traffic.com with conversion data.
 * Immediately emits event to Inngest and returns 200 OK.
 * 
 * URL Template configured on Smart Links:
 * https://subflos.com/api/webhooks/smart-link?click_id={click_id}&ecid={external_click_id}&type={conversion_type}&tx_type={transaction_type}&gross={amount_gross}&net={amount_net}&fan_id={fan_onlyfans_id}&fan_user={fan_onlyfans_username}&creator_acct={ofapi_account_id}&creator_user={creator_onlyfans_username}&link_id={smart_link_id}&link_name={smart_link_name}&ts={conversion_at}
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Parse postback parameters
  const click_id = searchParams.get('click_id') || ''
  const external_click_id = searchParams.get('ecid') || undefined
  const conversion_type = searchParams.get('type') as 'new_subscriber' | 'new_transaction'
  const transaction_type = searchParams.get('tx_type') || undefined
  const amount_gross = parseFloat(searchParams.get('gross') || '0')
  const amount_net = parseFloat(searchParams.get('net') || '0')
  const fan_of_id = searchParams.get('fan_id') || undefined
  const fan_username = searchParams.get('fan_user') || undefined
  const creator_acct_id = searchParams.get('creator_acct') || ''
  const creator_username = searchParams.get('creator_user') || undefined
  const smart_link_id = searchParams.get('link_id') || ''
  const smart_link_name = searchParams.get('link_name') || undefined
  const conversion_at = searchParams.get('ts') || new Date().toISOString()

  // Validate required fields
  if (!click_id || !conversion_type || !smart_link_id) {
    return NextResponse.json(
      { error: 'Missing required parameters: click_id, type, link_id' },
      { status: 400 }
    )
  }

  // Emit event to Inngest for durable processing
  await inngest.send({
    name: 'smart-link/postback.received',
    data: {
      click_id,
      external_click_id,
      conversion_type,
      transaction_type,
      amount_gross,
      amount_net,
      fan_of_id,
      fan_username,
      creator_acct_id,
      creator_username,
      smart_link_id,
      smart_link_name,
      conversion_at,
    },
  })

  // Return 200 OK immediately
  return NextResponse.json({ received: true })
}
