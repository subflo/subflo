-- Add support for multiple payment processors
-- Migration: 20260227_add_payment_processor.sql

-- Add payment processor enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_processor') THEN
    CREATE TYPE payment_processor AS ENUM ('stripe', 'ccbill', 'epoch', 'segpay');
  END IF;
END
$$;

-- Add new columns to subscriptions table
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS payment_processor payment_processor DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS ccbill_customer_id text,
  ADD COLUMN IF NOT EXISTS ccbill_subscription_id text,
  ADD COLUMN IF NOT EXISTS epoch_customer_id text,
  ADD COLUMN IF NOT EXISTS epoch_subscription_id text,
  ADD COLUMN IF NOT EXISTS segpay_customer_id text,
  ADD COLUMN IF NOT EXISTS segpay_subscription_id text;

-- Create indexes for processor lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_ccbill_customer 
  ON subscriptions(ccbill_customer_id) WHERE ccbill_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_epoch_customer 
  ON subscriptions(epoch_customer_id) WHERE epoch_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_segpay_customer 
  ON subscriptions(segpay_customer_id) WHERE segpay_customer_id IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN subscriptions.payment_processor IS 'Active payment processor for this subscription';
COMMENT ON COLUMN subscriptions.ccbill_customer_id IS 'CCBill customer/subscriber ID';
COMMENT ON COLUMN subscriptions.ccbill_subscription_id IS 'CCBill subscription ID';

-- Create a view for unified processor lookup
CREATE OR REPLACE VIEW subscriptions_with_processor AS
SELECT 
  s.*,
  COALESCE(
    CASE s.payment_processor
      WHEN 'stripe' THEN s.stripe_customer_id
      WHEN 'ccbill' THEN s.ccbill_customer_id
      WHEN 'epoch' THEN s.epoch_customer_id
      WHEN 'segpay' THEN s.segpay_customer_id
    END,
    s.stripe_customer_id -- fallback
  ) as processor_customer_id,
  COALESCE(
    CASE s.payment_processor
      WHEN 'stripe' THEN s.stripe_subscription_id
      WHEN 'ccbill' THEN s.ccbill_subscription_id
      WHEN 'epoch' THEN s.epoch_subscription_id
      WHEN 'segpay' THEN s.segpay_subscription_id
    END,
    s.stripe_subscription_id -- fallback
  ) as processor_subscription_id
FROM subscriptions s;

-- Grant access to the view
GRANT SELECT ON subscriptions_with_processor TO authenticated;
