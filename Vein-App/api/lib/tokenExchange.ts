const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export interface TokenRequestBody {
  code?: string
  redirectUri?: string
  codeVerifier?: string
  refreshToken?: string
}

export interface TokenEnv {
  clientId: string
  clientSecret: string
}

export interface TokenExchangeResult {
  status: number
  body: Record<string, unknown>
}

async function postToken(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = (await res.json()) as Record<string, unknown>
  return { ok: res.ok, data }
}

export async function exchangeToken(
  reqBody: TokenRequestBody,
  env: TokenEnv,
): Promise<TokenExchangeResult> {
  const { clientId, clientSecret } = env
  if (!clientId || !clientSecret) {
    return { status: 500, body: { error: 'Server missing Google OAuth credentials' } }
  }

  if (reqBody.refreshToken) {
    const { ok, data } = await postToken({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: reqBody.refreshToken,
      grant_type: 'refresh_token',
    })
    if (!ok) {
      return {
        status: 401,
        body: {
          error:
            (data.error_description as string) ||
            (data.error as string) ||
            'Refresh failed',
        },
      }
    }
    return { status: 200, body: data }
  }

  if (!reqBody.code || !reqBody.redirectUri || !reqBody.codeVerifier) {
    return { status: 400, body: { error: 'Missing code, redirectUri, or codeVerifier' } }
  }

  const { ok, data } = await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    code: reqBody.code,
    redirect_uri: reqBody.redirectUri,
    code_verifier: reqBody.codeVerifier,
    grant_type: 'authorization_code',
  })

  if (!ok) {
    return {
      status: 400,
      body: {
        error:
          (data.error_description as string) ||
          (data.error as string) ||
          'Token exchange failed',
      },
    }
  }

  return { status: 200, body: data }
}

export function tokenEnvFromProcess(): TokenEnv {
  return {
    clientId: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  }
}
