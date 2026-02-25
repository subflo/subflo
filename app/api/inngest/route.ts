import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'

// Import all Inngest functions
import { processSmartLinkPostback } from '@/inngest/functions/process-smart-link-postback'

// Serve Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processSmartLinkPostback,
    // Add more functions here as they're created:
    // processOfapiWebhook,
    // pollAuthStatus,
    // syncCreatorProfile,
    // syncMetaSpend,
    // refreshAggregationTables,
    // etc.
  ],
})
