-- Fanbucks Virtual Currency System
-- Migration: 20260227_add_fanbucks.sql

-- ─────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────

CREATE TYPE fanbucks_transaction_type AS ENUM (
  'purchase',      -- Bought fanbucks with real money
  'bonus',         -- Free fanbucks (promotions, referrals)
  'tip',           -- Sent/received a tip
  'subscription',  -- Paid for a subscription
  'ppv',           -- Paid for pay-per-view content
  'message',       -- Paid message
  'refund',        -- Refund from platform
  'payout',        -- Creator cashed out
  'adjustment',    -- Admin adjustment
  'transfer'       -- Internal transfer
);

CREATE TYPE fanbucks_transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'reversed'
);

CREATE TYPE payout_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'canceled'
);

CREATE TYPE payout_method AS ENUM (
  'bank_transfer',
  'paypal',
  'crypto',
  'check'
);

-- ─────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────

-- Wallets
CREATE TABLE fanbucks_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  pending_balance bigint NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  lifetime_purchased bigint NOT NULL DEFAULT 0,
  lifetime_spent bigint NOT NULL DEFAULT 0,
  lifetime_earned bigint NOT NULL DEFAULT 0,
  lifetime_paid_out bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Transactions
CREATE TABLE fanbucks_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES fanbucks_wallets(id) ON DELETE CASCADE,
  type fanbucks_transaction_type NOT NULL,
  amount bigint NOT NULL,  -- Positive = credit, negative = debit
  balance_after bigint NOT NULL,
  status fanbucks_transaction_status NOT NULL DEFAULT 'completed',
  description text,
  related_user_id uuid REFERENCES auth.users(id),
  related_transaction_id uuid REFERENCES fanbucks_transactions(id),
  payment_intent_id text,  -- Stripe/CCBill payment ID
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Purchase Packages
CREATE TABLE fanbucks_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fanbucks bigint NOT NULL,
  price_cents bigint NOT NULL,
  bonus_fanbucks bigint NOT NULL DEFAULT 0,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payout Requests
CREATE TABLE fanbucks_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  wallet_id uuid NOT NULL REFERENCES fanbucks_wallets(id),
  fanbucks_amount bigint NOT NULL,
  payout_amount_cents bigint NOT NULL,
  fee_cents bigint NOT NULL DEFAULT 0,
  status payout_status NOT NULL DEFAULT 'pending',
  payout_method payout_method NOT NULL,
  payout_details jsonb NOT NULL DEFAULT '{}',
  notes text,
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Pending earnings (for hold period tracking)
CREATE TABLE fanbucks_pending_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES fanbucks_wallets(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES fanbucks_transactions(id),
  amount bigint NOT NULL,
  release_at timestamptz NOT NULL,
  released boolean NOT NULL DEFAULT false,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_fanbucks_wallets_user ON fanbucks_wallets(user_id);
CREATE INDEX idx_fanbucks_transactions_wallet ON fanbucks_transactions(wallet_id);
CREATE INDEX idx_fanbucks_transactions_created ON fanbucks_transactions(created_at DESC);
CREATE INDEX idx_fanbucks_transactions_type ON fanbucks_transactions(type);
CREATE INDEX idx_fanbucks_transactions_related_user ON fanbucks_transactions(related_user_id);
CREATE INDEX idx_fanbucks_payouts_user ON fanbucks_payouts(user_id);
CREATE INDEX idx_fanbucks_payouts_status ON fanbucks_payouts(status);
CREATE INDEX idx_fanbucks_pending_releases_wallet ON fanbucks_pending_releases(wallet_id);
CREATE INDEX idx_fanbucks_pending_releases_release ON fanbucks_pending_releases(release_at) 
  WHERE released = false;

-- ─────────────────────────────────────────────────────────────────
-- RPC Functions (Atomic Operations)
-- ─────────────────────────────────────────────────────────────────

-- Credit fanbucks to a wallet
CREATE OR REPLACE FUNCTION fanbucks_credit(
  p_wallet_id uuid,
  p_amount bigint,
  p_type fanbucks_transaction_type,
  p_description text DEFAULT NULL,
  p_related_user_id uuid DEFAULT NULL,
  p_related_transaction_id uuid DEFAULT NULL,
  p_payment_intent_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_pending boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance bigint;
  v_transaction_id uuid;
  v_result jsonb;
BEGIN
  -- Lock the wallet row
  IF p_pending THEN
    UPDATE fanbucks_wallets
    SET 
      pending_balance = pending_balance + p_amount,
      lifetime_earned = lifetime_earned + p_amount,
      updated_at = now()
    WHERE id = p_wallet_id
    RETURNING balance INTO v_new_balance;
  ELSE
    UPDATE fanbucks_wallets
    SET 
      balance = balance + p_amount,
      lifetime_purchased = CASE WHEN p_type = 'purchase' THEN lifetime_purchased + p_amount ELSE lifetime_purchased END,
      lifetime_earned = CASE WHEN p_type IN ('tip', 'subscription', 'ppv', 'message') THEN lifetime_earned + p_amount ELSE lifetime_earned END,
      updated_at = now()
    WHERE id = p_wallet_id
    RETURNING balance INTO v_new_balance;
  END IF;

  -- Create transaction record
  INSERT INTO fanbucks_transactions (
    wallet_id, type, amount, balance_after, status, description,
    related_user_id, related_transaction_id, payment_intent_id, metadata, completed_at
  ) VALUES (
    p_wallet_id, p_type, p_amount, v_new_balance, 'completed', p_description,
    p_related_user_id, p_related_transaction_id, p_payment_intent_id, p_metadata, now()
  )
  RETURNING id INTO v_transaction_id;

  -- Return transaction as JSON
  SELECT jsonb_build_object(
    'id', t.id,
    'wallet_id', t.wallet_id,
    'type', t.type,
    'amount', t.amount,
    'balance_after', t.balance_after,
    'status', t.status,
    'description', t.description,
    'created_at', t.created_at,
    'completed_at', t.completed_at
  ) INTO v_result
  FROM fanbucks_transactions t
  WHERE t.id = v_transaction_id;

  RETURN v_result;
END;
$$;

-- Debit fanbucks from a wallet
CREATE OR REPLACE FUNCTION fanbucks_debit(
  p_wallet_id uuid,
  p_amount bigint,
  p_type fanbucks_transaction_type,
  p_description text DEFAULT NULL,
  p_related_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance bigint;
  v_new_balance bigint;
  v_transaction_id uuid;
  v_result jsonb;
BEGIN
  -- Lock and check balance
  SELECT balance INTO v_current_balance
  FROM fanbucks_wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_current_balance, p_amount;
  END IF;

  -- Update wallet
  UPDATE fanbucks_wallets
  SET 
    balance = balance - p_amount,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = now()
  WHERE id = p_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Create transaction record
  INSERT INTO fanbucks_transactions (
    wallet_id, type, amount, balance_after, status, description,
    related_user_id, metadata, completed_at
  ) VALUES (
    p_wallet_id, p_type, -p_amount, v_new_balance, 'completed', p_description,
    p_related_user_id, p_metadata, now()
  )
  RETURNING id INTO v_transaction_id;

  -- Return transaction
  SELECT jsonb_build_object(
    'id', t.id,
    'wallet_id', t.wallet_id,
    'type', t.type,
    'amount', t.amount,
    'balance_after', t.balance_after,
    'status', t.status,
    'description', t.description,
    'created_at', t.created_at,
    'completed_at', t.completed_at
  ) INTO v_result
  FROM fanbucks_transactions t
  WHERE t.id = v_transaction_id;

  RETURN v_result;
END;
$$;

-- Transfer between wallets
CREATE OR REPLACE FUNCTION fanbucks_transfer(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_amount bigint,
  p_recipient_amount bigint,
  p_platform_fee bigint,
  p_type fanbucks_transaction_type,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_wallet_id uuid;
  v_to_wallet_id uuid;
  v_sender_tx jsonb;
  v_recipient_tx jsonb;
BEGIN
  -- Get wallet IDs
  SELECT id INTO v_from_wallet_id FROM fanbucks_wallets WHERE user_id = p_from_user_id;
  SELECT id INTO v_to_wallet_id FROM fanbucks_wallets WHERE user_id = p_to_user_id;

  -- Create recipient wallet if needed
  IF v_to_wallet_id IS NULL THEN
    INSERT INTO fanbucks_wallets (user_id) VALUES (p_to_user_id)
    RETURNING id INTO v_to_wallet_id;
  END IF;

  -- Debit sender
  SELECT fanbucks_debit(
    v_from_wallet_id,
    p_amount,
    p_type,
    p_description,
    p_to_user_id,
    p_metadata
  ) INTO v_sender_tx;

  -- Credit recipient (to pending if earnings hold is enabled)
  SELECT fanbucks_credit(
    v_to_wallet_id,
    p_recipient_amount,
    p_type,
    p_description,
    p_from_user_id,
    (v_sender_tx->>'id')::uuid,
    NULL,
    jsonb_build_object(
      'gross_amount', p_amount,
      'platform_fee', p_platform_fee,
      'net_amount', p_recipient_amount
    ) || p_metadata,
    true  -- Add to pending balance
  ) INTO v_recipient_tx;

  -- Schedule pending release (7 days)
  INSERT INTO fanbucks_pending_releases (wallet_id, transaction_id, amount, release_at)
  VALUES (
    v_to_wallet_id,
    (v_recipient_tx->>'id')::uuid,
    p_recipient_amount,
    now() + interval '7 days'
  );

  RETURN jsonb_build_object(
    'sender_transaction', v_sender_tx,
    'recipient_transaction', v_recipient_tx,
    'platform_fee', p_platform_fee
  );
END;
$$;

-- Release pending balance to available
CREATE OR REPLACE FUNCTION fanbucks_release_pending(
  p_wallet_id uuid,
  p_amount bigint
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE fanbucks_wallets
  SET 
    balance = balance + p_amount,
    pending_balance = pending_balance - p_amount,
    updated_at = now()
  WHERE id = p_wallet_id
    AND pending_balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot release amount: insufficient pending balance';
  END IF;
END;
$$;

-- Cron job function to release matured pending balances
CREATE OR REPLACE FUNCTION fanbucks_release_matured_pending()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN 
    SELECT wallet_id, SUM(amount) as total_amount
    FROM fanbucks_pending_releases
    WHERE release_at <= now() AND released = false
    GROUP BY wallet_id
  LOOP
    PERFORM fanbucks_release_pending(r.wallet_id, r.total_amount);
    
    UPDATE fanbucks_pending_releases
    SET released = true, released_at = now()
    WHERE wallet_id = r.wallet_id AND release_at <= now() AND released = false;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE fanbucks_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fanbucks_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fanbucks_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fanbucks_payouts ENABLE ROW LEVEL SECURITY;

-- Wallets: Users can only see their own wallet
CREATE POLICY "Users can view own wallet"
  ON fanbucks_wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Transactions: Users can only see their own transactions
CREATE POLICY "Users can view own transactions"
  ON fanbucks_transactions FOR SELECT
  USING (wallet_id IN (SELECT id FROM fanbucks_wallets WHERE user_id = auth.uid()));

-- Packages: Everyone can view active packages
CREATE POLICY "Anyone can view active packages"
  ON fanbucks_packages FOR SELECT
  USING (is_active = true);

-- Payouts: Users can only see their own payouts
CREATE POLICY "Users can view own payouts"
  ON fanbucks_payouts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own payouts"
  ON fanbucks_payouts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────
-- Seed Data
-- ─────────────────────────────────────────────────────────────────

INSERT INTO fanbucks_packages (name, fanbucks, price_cents, bonus_fanbucks, is_popular, sort_order) VALUES
  ('Starter', 500, 500, 0, false, 1),
  ('Popular', 1000, 999, 50, true, 2),
  ('Value', 2500, 2299, 200, false, 3),
  ('Premium', 5000, 4499, 500, false, 4),
  ('Ultimate', 10000, 8499, 1500, false, 5);

-- ─────────────────────────────────────────────────────────────────
-- Comments
-- ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE fanbucks_wallets IS 'User fanbucks balances. 1 fanbuck = $0.01 USD';
COMMENT ON TABLE fanbucks_transactions IS 'All fanbucks credits and debits';
COMMENT ON TABLE fanbucks_packages IS 'Purchase packages for buying fanbucks';
COMMENT ON TABLE fanbucks_payouts IS 'Creator payout requests';
COMMENT ON COLUMN fanbucks_wallets.pending_balance IS 'Earnings awaiting clearance (7 day hold)';
