import { ConfidentialClientApplication, type Configuration } from '@azure/msal-node'

const SCOPES = ['openid', 'profile', 'email', 'User.Read']

let cachedClient: ConfidentialClientApplication | null = null

function getClient(): ConfidentialClientApplication {
  if (cachedClient) return cachedClient
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const tenantId = process.env.MICROSOFT_TENANT_ID
  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET / MICROSOFT_TENANT_ID')
  }
  const config: Configuration = {
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  }
  cachedClient = new ConfidentialClientApplication(config)
  return cachedClient
}

function redirectUri(): string {
  const uri = process.env.MICROSOFT_CALLBACK_URL
  if (!uri) throw new Error('Missing MICROSOFT_CALLBACK_URL')
  return uri
}

export function getAuthCodeUrl(state: string): Promise<string> {
  return getClient().getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: redirectUri(),
    state,
  })
}

export async function exchangeCodeForToken(code: string) {
  return getClient().acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: redirectUri(),
  })
}
