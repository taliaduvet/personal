import { createPkcePair } from './pkce'
import { clearTokens, getTokens, setTokens } from './storage'
import type { TokenSet } from './types'
import { DRIVE_SCOPE, PKCE_VERIFIER_KEY } from './types'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

function appUrl(): string {
  return import.meta.env.VITE_APP_URL || window.location.origin
}

function clientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!id) throw new Error('Missing VITE_GOOGLE_CLIENT_ID')
  return id
}

export function redirectUri(): string {
  return `${appUrl()}/auth/callback`
}

export async function startGoogleLogin(): Promise<void> {
  const { verifier, challenge } = await createPkcePair()
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)

  const tokens = getTokens()
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: DRIVE_SCOPE,
    access_type: 'offline',
    prompt: tokens?.refreshToken ? 'select_account' : 'consent',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  window.location.href = `${GOOGLE_AUTH_URL}?${params}`
}

export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  if (!verifier) throw new Error('Login session expired. Please try again.')

  const res = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri: redirectUri(), codeVerifier: verifier }),
  })

  sessionStorage.removeItem(PKCE_VERIFIER_KEY)

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `Login failed (${res.status})`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  const existing = getTokens()
  const tokens: TokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || existing?.refreshToken || '',
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  if (!tokens.refreshToken) {
    throw new Error('Google did not return a refresh token. Sign out in Google, then log in again.')
  }

  setTokens(tokens)
  return tokens
}

export async function refreshAccessToken(): Promise<TokenSet> {
  const current = getTokens()
  if (!current?.refreshToken) throw new Error('Not signed in')

  const res = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || 'Session expired. Please sign in again.')
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
    refresh_token?: string
  }

  const tokens: TokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || current.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  setTokens(tokens)
  return tokens
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000

export async function getValidAccessToken(): Promise<string> {
  const tokens = getTokens()
  if (!tokens) throw new Error('Not signed in')

  if (tokens.expiresAt - Date.now() > REFRESH_BUFFER_MS) {
    return tokens.accessToken
  }

  const refreshed = await refreshAccessToken()
  return refreshed.accessToken
}

export function signOut(): void {
  clearTokens()
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
}
