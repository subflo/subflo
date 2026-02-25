import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

/**
 * Process Smart Link postback - 7-step durable workflow
 * 
 * This is the core attribution pipeline:
 * 1. Write to Supabase (conversions table)
 * 2. Fire Meta CAPI event
 * 3. Fire custom postbacks
 * 4. Send notifications (Slack + email)
 * 5. Update Redis counters
 * 6. Broadcast to Supabase Realtime
 * 7. Log completion
 */
export const processSmartLinkPostback = inngest.createFunction(
  {
    id: 'process-smart-link-postback',
    retries: 3,
  },
  { event: 'smart-link/postback.received' },
  async ({ event, step }) => {
    const { data } = event
    
    // Step 1: Write to Supabase
    const conversion = await step.run('write-to-supabase', async () => {
      // First, find the click and get UTM data
      const { data: click } = await supabase
        .from('clicks')
        .select('*, smart_links!inner(org_id, creator_id)')
        .eq('subflo_click_id', data.external_click_id || data.click_id)
        .single()
      
      if (!click) {
        // Create a conversion without click attribution
        const { data: smartLink } = await supabase
          .from('smart_links')
          .select('org_id, creator_id')
          .eq('ofapi_smart_link_id', data.smart_link_id)
          .single()
        
        if (!smartLink) throw new Error(`Smart link not found: ${data.smart_link_id}`)
        
        const { data: conversion, error } = await supabase
          .from('conversions')
          .insert({
            org_id: smartLink.org_id,
            creator_id: smartLink.creator_id,
            smart_link_id: data.smart_link_id,
            fan_of_id: data.fan_of_id,
            fan_username: data.fan_username,
            conversion_type: data.conversion_type,
            transaction_type: data.transaction_type,
            amount_gross: data.amount_gross,
            amount_net: data.amount_net,
            conversion_at: data.conversion_at,
          })
          .select()
          .single()
        
        if (error) throw error
        return { ...conversion, click: null }
      }
      
      // Insert conversion with click attribution
      const { data: conversion, error } = await supabase
        .from('conversions')
        .insert({
          org_id: click.smart_links.org_id,
          creator_id: click.smart_links.creator_id,
          click_id: click.subflo_click_id,
          smart_link_id: click.smart_link_id,
          fan_of_id: data.fan_of_id,
          fan_username: data.fan_username,
          conversion_type: data.conversion_type,
          transaction_type: data.transaction_type,
          amount_gross: data.amount_gross,
          amount_net: data.amount_net,
          conversion_at: data.conversion_at,
        })
        .select()
        .single()
      
      if (error) throw error
      return { ...conversion, click }
    })

    // Step 2: Fire Meta CAPI event
    await step.run('fire-meta-capi', async () => {
      // Get org's Meta credentials
      const { data: org } = await supabase
        .from('organizations')
        .select('meta_pixel_id, meta_access_token')
        .eq('id', conversion.org_id)
        .single()
      
      if (!org?.meta_pixel_id || !org?.meta_access_token) {
        console.log('No Meta credentials configured, skipping CAPI')
        return { skipped: true }
      }
      
      const eventName = data.conversion_type === 'new_subscriber' ? 'Subscribe' : 'Purchase'
      
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${org.meta_pixel_id}/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [{
              event_name: eventName,
              event_time: Math.floor(new Date(data.conversion_at).getTime() / 1000),
              action_source: 'website',
              user_data: {
                external_id: data.external_click_id || data.click_id,
              },
              custom_data: {
                value: data.amount_gross,
                currency: 'USD',
                content_type: 'product',
              },
            }],
            access_token: org.meta_access_token,
          }),
        }
      )
      
      const result = await response.json()
      
      // Update conversion record
      await supabase
        .from('conversions')
        .update({ meta_event_sent: true })
        .eq('id', conversion.id)
      
      return result
    })

    // Step 3: Fire custom postbacks
    await step.run('fire-custom-postbacks', async () => {
      const { data: smartLink } = await supabase
        .from('smart_links')
        .select('postback_url')
        .eq('id', conversion.smart_link_id)
        .single()
      
      if (!smartLink?.postback_url) {
        return { skipped: true }
      }
      
      // Fire custom postback
      const url = smartLink.postback_url
        .replace('{click_id}', data.click_id)
        .replace('{amount}', String(data.amount_net || 0))
        .replace('{fan_id}', data.fan_of_id || '')
      
      await fetch(url, { method: 'GET' })
      return { fired: url }
    })

    // Step 4: Send notifications
    await step.run('send-notifications', async () => {
      const isHighValue = (data.amount_net || 0) >= 50
      
      if (!isHighValue) return { skipped: true }
      
      // Slack notification
      if (process.env.SLACK_WEBHOOK_URL) {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `💰 High-value conversion!\n*${data.fan_username}* subscribed to *${data.creator_username}*\nRevenue: $${data.amount_net?.toFixed(2)}\nSource: Smart Link`,
          }),
        })
      }
      
      return { notified: true }
    })

    // Step 5: Update Redis counters
    await step.run('update-redis-counters', async () => {
      const today = new Date().toISOString().split('T')[0]
      const orgKey = `org:${conversion.org_id}`
      
      await redis.hincrby(`${orgKey}:stats:${today}`, 'conversions', 1)
      await redis.hincrbyfloat(`${orgKey}:stats:${today}`, 'revenue', data.amount_net || 0)
      
      if (data.conversion_type === 'new_subscriber') {
        await redis.hincrby(`${orgKey}:stats:${today}`, 'subscribers', 1)
      }
      
      return { updated: true }
    })

    // Step 6: Broadcast to Supabase Realtime
    await step.run('broadcast-realtime', async () => {
      // Supabase Realtime will auto-broadcast on insert
      // This step exists for explicit notification if needed
      return { broadcast: true }
    })

    // Step 7: Log completion
    return {
      success: true,
      conversion_id: conversion.id,
      revenue: data.amount_net,
      type: data.conversion_type,
    }
  }
)
