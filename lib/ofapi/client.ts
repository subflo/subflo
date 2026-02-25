/**
 * OnlyFans API Client
 * 
 * Wrapper for OnlyFansAPI.com (https://app.onlyfansapi.com)
 * This is the core dependency - all OF interactions go through this API.
 */

const OFAPI_BASE_URL = process.env.OFAPI_BASE_URL || 'https://app.onlyfansapi.com/api'
const OFAPI_API_KEY = process.env.OFAPI_API_KEY!

interface OFAPIResponse<T> {
  data: T
  _meta?: {
    _credits: {
      balance: number
      used: number
    }
  }
}

interface AuthStartResponse {
  attempt_id: string
  polling_url: string
  status: 'pending' | '2fa_required' | 'connected' | 'failed'
}

interface AuthStatusResponse {
  status: 'pending' | '2fa_required' | 'connected' | 'failed'
  account_id?: string
  error?: string
}

interface CreatorProfile {
  id: string
  username: string
  name: string
  avatar: string
  subscribePrice: number
  postsCount: number
  photosCount: number
  videosCount: number
  subscribersCount: number
}

interface SmartLink {
  id: string
  name: string
  tracking_url: string
  clicks: number
  conversions: number
  revenue: number
}

class OFAPIClient {
  private headers: HeadersInit

  constructor() {
    this.headers = {
      'Authorization': `Bearer ${OFAPI_API_KEY}`,
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<OFAPIResponse<T>> {
    const response = await fetch(`${OFAPI_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `API error: ${response.status}`)
    }

    return response.json()
  }

  // ============ Authentication ============

  /**
   * Start authentication flow for a creator account
   */
  async startAuth(email: string, password: string, proxyCountry = 'US'): Promise<AuthStartResponse> {
    const { data } = await this.request<AuthStartResponse>('/authenticate', {
      method: 'POST',
      body: JSON.stringify({ email, password, proxyCountry }),
    })
    return data
  }

  /**
   * Poll authentication status
   */
  async getAuthStatus(attemptId: string): Promise<AuthStatusResponse> {
    const { data } = await this.request<AuthStatusResponse>(`/authenticate/${attemptId}`)
    return data
  }

  /**
   * Submit 2FA code
   */
  async submit2FA(attemptId: string, code: string): Promise<AuthStatusResponse> {
    const { data } = await this.request<AuthStatusResponse>(`/authenticate/${attemptId}`, {
      method: 'PUT',
      body: JSON.stringify({ code }),
    })
    return data
  }

  // ============ Account & Profile ============

  /**
   * Get creator profile
   */
  async getProfile(accountId: string): Promise<CreatorProfile> {
    const { data } = await this.request<CreatorProfile>(`/${accountId}/profile`)
    return data
  }

  /**
   * List all connected accounts
   */
  async listAccounts(): Promise<{ accounts: Array<{ id: string; username: string; status: string }> }> {
    const { data } = await this.request<{ accounts: Array<{ id: string; username: string; status: string }> }>('/accounts')
    return data
  }

  // ============ Smart Links ============

  /**
   * Create a new Smart Link
   */
  async createSmartLink(
    accountId: string,
    name: string,
    postbackUrl?: string,
    trafficSource?: string
  ): Promise<SmartLink> {
    const { data } = await this.request<SmartLink>(`/${accountId}/smart-links`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        postback_url: postbackUrl,
        traffic_source: trafficSource,
      }),
    })
    return data
  }

  /**
   * List all Smart Links for an account
   */
  async listSmartLinks(accountId: string): Promise<{ smart_links: SmartLink[] }> {
    const { data } = await this.request<{ smart_links: SmartLink[] }>(`/${accountId}/smart-links`)
    return data
  }

  /**
   * Get Smart Link details
   */
  async getSmartLink(accountId: string, linkId: string): Promise<SmartLink> {
    const { data } = await this.request<SmartLink>(`/${accountId}/smart-links/${linkId}`)
    return data
  }

  // ============ Fans & Subscribers ============

  /**
   * Get all fans for an account
   */
  async getFans(accountId: string, type: 'all' | 'active' | 'expired' | 'latest' = 'all') {
    const { data } = await this.request(`/${accountId}/fans/${type}`)
    return data
  }

  // ============ Earnings & Statistics ============

  /**
   * Get earnings statements
   */
  async getEarnings(accountId: string) {
    const { data } = await this.request(`/${accountId}/statistics/statements/earnings`)
    return data
  }

  /**
   * Get account statistics overview
   */
  async getStatistics(accountId: string) {
    const { data } = await this.request(`/${accountId}/statistics/overview`)
    return data
  }

  // ============ Tracking Links ============

  /**
   * Get native OF tracking links
   */
  async getTrackingLinks(accountId: string) {
    const { data } = await this.request(`/${accountId}/tracking-links`)
    return data
  }

  // ============ Trial Links ============

  /**
   * Create a free trial link
   */
  async createTrialLink(accountId: string, duration: number) {
    const { data } = await this.request(`/${accountId}/trial-links`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    })
    return data
  }

  /**
   * Get trial links
   */
  async getTrialLinks(accountId: string) {
    const { data } = await this.request(`/${accountId}/trial-links`)
    return data
  }
}

export const ofapi = new OFAPIClient()
export type { AuthStartResponse, AuthStatusResponse, CreatorProfile, SmartLink }
