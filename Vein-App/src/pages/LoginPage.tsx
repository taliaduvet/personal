import { useState } from 'react'
import { startGoogleLogin } from '@/lib/auth'
import { Button } from '@/components/Button'

export function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError(null)
    setLoading(true)
    try {
      await startGoogleLogin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start login')
      setLoading(false)
    }
  }

  const missingClientId = !import.meta.env.VITE_GOOGLE_CLIENT_ID

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-serif text-4xl tracking-tight text-vein-accent">Vein</h1>
        <p className="mt-2 text-sm text-vein-muted">Voice memo catalog for songwriting</p>

        {missingClientId ? (
          <p className="mt-8 rounded-lg border border-vein-error/40 bg-vein-surface p-4 text-left text-sm text-vein-error">
            Add <code className="font-mono text-xs">VITE_GOOGLE_CLIENT_ID</code> to a{' '}
            <code className="font-mono text-xs">.env</code> file (see .env.example).
          </p>
        ) : (
          <Button className="mt-8 w-full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Redirecting…' : 'Sign in with Google'}
          </Button>
        )}

        {error && (
          <p className="mt-4 text-sm text-vein-error" role="alert">
            {error}
          </p>
        )}

        <p className="mt-8 text-xs text-vein-muted">
          Uses Google Drive (files this app creates only). Run{' '}
          <code className="font-mono">npx vercel dev</code> locally so auth works.
        </p>
      </div>
    </div>
  )
}
