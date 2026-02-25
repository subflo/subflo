-- Subflo Database Schema
-- Migration: 00001_initial_schema
-- Based on Spec v2.0

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'unpaid');
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'media_buyer', 'viewer');
CREATE TYPE platform_admin_role AS ENUM ('super_admin', 'admin', 'support');
CREATE TYPE traffic_source AS ENUM ('meta', 'google', 'tiktok', 'native', 'other');
CREATE TYPE conversion_type AS ENUM ('new_subscriber', 'new_transaction');
CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'completed', 'archived');
CREATE TYPE audit_action AS ENUM (
  'impersonate_start', 'impersonate_end', 'org_suspended', 'org_reactivated',
  'plan_changed', 'credit_allocation_changed', 'manual_refund', 'org_deleted'
);
CREATE TYPE ad_platform AS ENUM ('meta', 'google', 'tiktok', 'other');

-- CORE TABLES

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan plan_tier DEFAULT 'free',
  meta_pixel_id TEXT,
  meta_access_token TEXT, -- Encrypted via Supabase Vault
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'viewer',
  email TEXT NOT NULL,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Creators (OnlyFans accounts connected via OF API)
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ofapi_account_id TEXT NOT NULL, -- acct_XXX from OF API
  of_user_id TEXT,
  of_username TEXT,
  of_display_name TEXT,
  of_avatar_url TEXT,
  subscription_price DECIMAL(10, 2),
  is_connected BOOLEAN DEFAULT true,
  auth_attempt_id TEXT, -- Latest auth_XXXX for re-auth
  of_email_encrypted TEXT, -- Encrypted via Vault
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  meta_pixel_id TEXT, -- Creator-specific pixel override
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart Links
CREATE TABLE smart_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ofapi_smart_link_id TEXT,
  name TEXT NOT NULL,
  tracking_url TEXT, -- trk.of-traffic.com URL
  traffic_source traffic_source DEFAULT 'meta',
  campaign_name TEXT,
  ad_set_name TEXT,
  creative_name TEXT,
  landing_page_id UUID, -- FK to landing_pages, added later
  postback_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clicks
CREATE TABLE clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  smart_link_id UUID REFERENCES smart_links(id) ON DELETE SET NULL,
  landing_page_id UUID, -- FK added later
  click_id TEXT UNIQUE, -- OF API globally unique click ID
  external_click_id TEXT, -- Meta/Google click ID (ecid)
  subflo_click_id TEXT UNIQUE NOT NULL, -- Our composite click ID
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  country TEXT,
  device_type TEXT,
  browser TEXT,
  referrer TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversions
CREATE TABLE conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  click_id TEXT REFERENCES clicks(subflo_click_id),
  smart_link_id UUID REFERENCES smart_links(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  fan_of_id TEXT,
  fan_username TEXT,
  conversion_type conversion_type NOT NULL,
  transaction_type TEXT, -- new_subscription, recurring, tip, post, message, stream
  amount_gross DECIMAL(10, 2),
  amount_net DECIMAL(10, 2),
  conversion_at TIMESTAMPTZ DEFAULT NOW(),
  meta_event_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Landing Pages
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  custom_domain TEXT,
  template_id TEXT,
  config_json JSONB DEFAULT '{}',
  smart_link_id UUID REFERENCES smart_links(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from smart_links to landing_pages
ALTER TABLE smart_links ADD CONSTRAINT fk_landing_page 
  FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE SET NULL;

-- Add FK from clicks to landing_pages
ALTER TABLE clicks ADD CONSTRAINT fk_landing_page 
  FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE SET NULL;

-- Ad Campaigns
CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  platform ad_platform DEFAULT 'meta',
  platform_campaign_id TEXT,
  platform_campaign_name TEXT,
  platform_adset_id TEXT,
  platform_adset_name TEXT,
  platform_ad_id TEXT,
  platform_ad_name TEXT,
  smart_link_id UUID REFERENCES smart_links(id) ON DELETE SET NULL,
  status campaign_status DEFAULT 'active',
  daily_budget DECIMAL(10, 2),
  lifetime_budget DECIMAL(10, 2),
  utm_source TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad Spend (daily records synced from Meta Marketing API)
CREATE TABLE ad_spend (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  platform ad_platform DEFAULT 'meta',
  date DATE NOT NULL,
  spend_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cpm DECIMAL(10, 4),
  cpc DECIMAL(10, 4),
  reach INTEGER DEFAULT 0,
  platform_campaign_id TEXT,
  platform_adset_id TEXT,
  platform_ad_id TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_campaign_id, date)
);

-- Meta Ad Accounts
CREATE TABLE meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meta_account_id TEXT UNIQUE NOT NULL, -- act_XXXXXXXX
  meta_account_name TEXT,
  access_token_encrypted TEXT, -- Stored in Vault
  token_expires_at TIMESTAMPTZ,
  permissions TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform Admins (for admin.subflos.com)
CREATE TABLE platform_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role platform_admin_role NOT NULL DEFAULT 'support',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Trail (immutable log)
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  action audit_action NOT NULL,
  target_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent updates/deletes on audit_trail
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit trail is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_trail_immutable
  BEFORE UPDATE OR DELETE ON audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- Subscriptions (Stripe billing)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan plan_tier DEFAULT 'free',
  status subscription_status DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_team_members_org ON team_members(org_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_creators_org ON creators(org_id);
CREATE INDEX idx_smart_links_org ON smart_links(org_id);
CREATE INDEX idx_smart_links_creator ON smart_links(creator_id);
CREATE INDEX idx_clicks_org ON clicks(org_id);
CREATE INDEX idx_clicks_smart_link ON clicks(smart_link_id);
CREATE INDEX idx_clicks_subflo_id ON clicks(subflo_click_id);
CREATE INDEX idx_conversions_org ON conversions(org_id);
CREATE INDEX idx_conversions_creator ON conversions(creator_id);
CREATE INDEX idx_conversions_click ON conversions(click_id);
CREATE INDEX idx_landing_pages_org ON landing_pages(org_id);
CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX idx_ad_spend_org_date ON ad_spend(org_id, date);
CREATE INDEX idx_ad_spend_campaign ON ad_spend(ad_campaign_id);

-- ROW LEVEL SECURITY POLICIES
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their organization's data
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view team members of their org" ON team_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their org's creators" ON creators
  FOR ALL USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their org's smart links" ON smart_links
  FOR ALL USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their org's clicks" ON clicks
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their org's conversions" ON conversions
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their org's landing pages" ON landing_pages
  FOR ALL USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their org's campaigns" ON ad_campaigns
  FOR ALL USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their org's ad spend" ON ad_spend
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their org's meta accounts" ON meta_ad_accounts
  FOR ALL USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their org's subscription" ON subscriptions
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid())
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_smart_links_updated_at
  BEFORE UPDATE ON smart_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ad_campaigns_updated_at
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meta_ad_accounts_updated_at
  BEFORE UPDATE ON meta_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
