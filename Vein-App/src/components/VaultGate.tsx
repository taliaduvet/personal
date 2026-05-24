import { Navigate } from 'react-router-dom'
import { useVein } from '@/context/VeinContext'
import type { ReactNode } from 'react'

export function VaultGate({ children }: { children: ReactNode }) {
  const { vaultLoading, parseError, vaultReady } = useVein()

  if (vaultLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <p className="text-sm text-vein-muted">Connecting to Google Drive…</p>
      </div>
    )
  }

  if (parseError) {
    return <Navigate to="/recovery" replace />
  }

  if (!vaultReady) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-vein-error" role="alert">
          Could not open your vault.
        </p>
        <Navigate to="/recovery" replace />
      </div>
    )
  }

  return <>{children}</>
}
