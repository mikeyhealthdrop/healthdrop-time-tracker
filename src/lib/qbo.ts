/**
 * QuickBooks Online API helper utilities
 * Handles OAuth2 token management and QBO API calls
 */

const QBO_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'
const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const QBO_API_BASE = 'https://quickbooks.api.intuit.com/v3'

interface QBOTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface QBOProject {
  Id: string
  ProjectName: string
  ProjectStatus: string
  CustomerId: string
  CustomerRef?: { value: string; name: string }
}

/**
 * Build the OAuth2 authorization URL for QuickBooks
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID!,
    redirect_uri: process.env.QBO_REDIRECT_URI!,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state,
  })
  return `${QBO_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange an authorization code for access/refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<QBOTokens> {
  const basicAuth = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(QBO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.QBO_REDIRECT_URI!,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }

  return res.json()
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<QBOTokens> {
  const basicAuth = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(QBO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token refresh failed: ${res.status} ${text}`)
  }

  return res.json()
}

/**
 * Make an authenticated request to the QBO API.
 * Automatically refreshes the token if expired.
 */
export async function qboApiRequest(
  realmId: string,
  accessToken: string,
  refreshToken: string,
  endpoint: string,
  updateTokens: (tokens: QBOTokens) => Promise<void>
): Promise<{ data: any; accessToken: string; refreshToken: string }> {
  let currentAccessToken = accessToken
  let currentRefreshToken = refreshToken

  let res = await fetch(`${QBO_API_BASE}/company/${realmId}/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${currentAccessToken}`,
      Accept: 'application/json',
    },
  })

  // If 401, try refreshing the token
  if (res.status === 401) {
    const newTokens = await refreshAccessToken(currentRefreshToken)
    currentAccessToken = newTokens.access_token
    currentRefreshToken = newTokens.refresh_token
    await updateTokens(newTokens)

    res = await fetch(`${QBO_API_BASE}/company/${realmId}/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${currentAccessToken}`,
        Accept: 'application/json',
      },
    })
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`QBO API error: ${res.status} ${text}`)
  }

  const data = await res.json()
  return { data, accessToken: currentAccessToken, refreshToken: currentRefreshToken }
}

/**
 * Fetch all projects from QuickBooks Online
 */
export async function fetchQBOProjects(
  realmId: string,
  accessToken: string,
  refreshToken: string,
  updateTokens: (tokens: QBOTokens) => Promise<void>
): Promise<{ projects: QBOProject[]; accessToken: string; refreshToken: string }> {
  // QBO Projects API - query all active projects
  const query = encodeURIComponent("SELECT * FROM Project WHERE ProjectStatus = 'InProgress' MAXRESULTS 1000")

  try {
    const result = await qboApiRequest(
      realmId,
      accessToken,
      refreshToken,
      `query?query=${query}`,
      updateTokens
    )

    const projects = result.data?.QueryResponse?.Project || []
    return {
      projects,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }
  } catch (error: any) {
    // If Projects API isn't available (older QBO plans), try the estimate/project endpoint
    if (error.message?.includes('400') || error.message?.includes('not supported')) {
      // Fall back to using Customers as projects
      console.log('QBO Projects API not available, falling back to Customer query')
      const customerQuery = encodeURIComponent("SELECT Id, DisplayName, Active FROM Customer WHERE Active = true MAXRESULTS 1000")
      const result = await qboApiRequest(
        realmId,
        accessToken,
        refreshToken,
        `query?query=${customerQuery}`,
        updateTokens
      )

      const customers = result.data?.QueryResponse?.Customer || []
      // Map customers to project-like format
      const projects = customers.map((c: any) => ({
        Id: c.Id,
        ProjectName: c.DisplayName,
        ProjectStatus: 'InProgress',
        CustomerId: c.Id,
      }))

      return {
        projects,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }
    }
    throw error
  }
}
