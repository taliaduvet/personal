import type { TokenSet, VeinDriveConfig } from './types'
import { DRIVE_CONFIG_KEY, TOKEN_KEY } from './types'

export function getTokens(): TokenSet | null {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TokenSet
  } catch {
    return null
  }
}

export function setTokens(tokens: TokenSet): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getDriveConfig(): VeinDriveConfig | null {
  const raw = localStorage.getItem(DRIVE_CONFIG_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as VeinDriveConfig
  } catch {
    return null
  }
}

export function setDriveConfig(config: VeinDriveConfig): void {
  localStorage.setItem(DRIVE_CONFIG_KEY, JSON.stringify(config))
}
