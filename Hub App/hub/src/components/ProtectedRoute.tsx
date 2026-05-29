import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-paper)' }}>
        <span className="t-mono-cap" style={{ color: 'var(--ink-muted)' }}>loading…</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/sign-in" replace />
  }

  return <>{children}</>
}
