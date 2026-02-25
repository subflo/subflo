/**
 * Database Types for Subflo
 * 
 * Generated from supabase/migrations/00001_initial_schema.sql
 * Run `supabase gen types typescript` to regenerate after schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'free' | 'pro' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: 'free' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: 'free' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
      }
      org_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
      }
      creators: {
        Row: {
          id: string
          org_id: string
          ofapi_account_id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          subscribers_count: number | null
          is_active: boolean
          auth_status: 'pending' | 'connected' | '2fa_required' | 'failed' | 'expired'
          last_sync_at: string | null
          meta: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          ofapi_account_id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          subscribers_count?: number | null
          is_active?: boolean
          auth_status?: 'pending' | 'connected' | '2fa_required' | 'failed' | 'expired'
          last_sync_at?: string | null
          meta?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          ofapi_account_id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          subscribers_count?: number | null
          is_active?: boolean
          auth_status?: 'pending' | 'connected' | '2fa_required' | 'failed' | 'expired'
          last_sync_at?: string | null
          meta?: Json
          created_at?: string
          updated_at?: string
        }
      }
      smart_links: {
        Row: {
          id: string
          org_id: string
          creator_id: string
          name: string
          slug: string
          ofapi_link_id: string
          tracking_url: string
          traffic_source: string | null
          is_active: boolean
          total_clicks: number
          total_conversions: number
          total_revenue_cents: number
          meta: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          creator_id: string
          name: string
          slug: string
          ofapi_link_id: string
          tracking_url: string
          traffic_source?: string | null
          is_active?: boolean
          total_clicks?: number
          total_conversions?: number
          total_revenue_cents?: number
          meta?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          creator_id?: string
          name?: string
          slug?: string
          ofapi_link_id?: string
          tracking_url?: string
          traffic_source?: string | null
          is_active?: boolean
          total_clicks?: number
          total_conversions?: number
          total_revenue_cents?: number
          meta?: Json
          created_at?: string
          updated_at?: string
        }
      }
      conversions: {
        Row: {
          id: string
          smart_link_id: string
          creator_id: string
          org_id: string
          event_type: 'click' | 'subscribe' | 'purchase' | 'rebill'
          revenue_cents: number
          currency: string
          fan_id: string | null
          click_id: string | null
          sub_id: string | null
          source_url: string | null
          user_agent: string | null
          ip_hash: string | null
          country_code: string | null
          ofapi_event_id: string | null
          meta: Json
          created_at: string
        }
        Insert: {
          id?: string
          smart_link_id: string
          creator_id: string
          org_id: string
          event_type: 'click' | 'subscribe' | 'purchase' | 'rebill'
          revenue_cents?: number
          currency?: string
          fan_id?: string | null
          click_id?: string | null
          sub_id?: string | null
          source_url?: string | null
          user_agent?: string | null
          ip_hash?: string | null
          country_code?: string | null
          ofapi_event_id?: string | null
          meta?: Json
          created_at?: string
        }
        Update: {
          id?: string
          smart_link_id?: string
          creator_id?: string
          org_id?: string
          event_type?: 'click' | 'subscribe' | 'purchase' | 'rebill'
          revenue_cents?: number
          currency?: string
          fan_id?: string | null
          click_id?: string | null
          sub_id?: string | null
          source_url?: string | null
          user_agent?: string | null
          ip_hash?: string | null
          country_code?: string | null
          ofapi_event_id?: string | null
          meta?: Json
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          org_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan: 'free' | 'pro' | 'enterprise'
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: 'free' | 'pro' | 'enterprise'
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: 'free' | 'pro' | 'enterprise'
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      plan_tier: 'free' | 'pro' | 'enterprise'
      org_role: 'owner' | 'admin' | 'member'
      auth_status: 'pending' | 'connected' | '2fa_required' | 'failed' | 'expired'
      conversion_type: 'click' | 'subscribe' | 'purchase' | 'rebill'
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = 
  Database['public']['Enums'][T]

// Convenience aliases
export type Organization = Tables<'organizations'>
export type OrgMember = Tables<'org_members'>
export type Creator = Tables<'creators'>
export type SmartLink = Tables<'smart_links'>
export type Conversion = Tables<'conversions'>
export type Subscription = Tables<'subscriptions'>
