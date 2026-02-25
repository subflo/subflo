import { Inngest } from 'inngest'

// Create a client to send and receive events
export const inngest = new Inngest({
  id: 'subflo',
  schemas: new EventSchemas().fromRecord<Events>(),
})

// Event types for type safety
export type Events = {
  // Smart Link postback received
  'smart-link/postback.received': {
    data: {
      click_id: string
      external_click_id?: string
      conversion_type: 'new_subscriber' | 'new_transaction'
      transaction_type?: string
      amount_gross?: number
      amount_net?: number
      fan_of_id?: string
      fan_username?: string
      creator_acct_id: string
      creator_username?: string
      smart_link_id: string
      smart_link_name?: string
      conversion_at: string
    }
  }
  
  // OF API webhook received
  'ofapi/webhook.received': {
    data: {
      event_type: string
      account_id: string
      payload: Record<string, unknown>
    }
  }
  
  // Auth flow started
  'ofapi/auth.started': {
    data: {
      attempt_id: string
      creator_id: string
      org_id: string
    }
  }
  
  // Creator connected
  'creator/connected': {
    data: {
      creator_id: string
      account_id: string
      org_id: string
    }
  }
  
  // Creator sync requested (for fan-out)
  'creator/sync.requested': {
    data: {
      creator_id: string
      org_id: string
      sync_type: 'profile' | 'earnings' | 'fans' | 'all'
    }
  }
  
  // Meta ad account connected
  'meta/account.connected': {
    data: {
      meta_account_id: string
      org_id: string
    }
  }
  
  // High-value conversion alert
  'conversion/high-value': {
    data: {
      conversion_id: string
      amount: number
      creator_username: string
      fan_username: string
      org_id: string
    }
  }
  
  // Stripe webhook received
  'stripe/webhook.received': {
    data: {
      event_type: string
      event_id: string
      payload: Record<string, unknown>
    }
  }
}

import { EventSchemas } from 'inngest'
