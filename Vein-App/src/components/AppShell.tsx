import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from '@/lib/auth'
import { SaveIndicator } from '@/components/SaveIndicator'
import { Button } from '@/components/Button'

export function AppShell({
  children,
  title,
  backTo,
}: {
  children: ReactNode
  title?: string
  backTo?: string
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {backTo && (
            <Link to={backTo} className="text-sm text-vein-muted hover:text-vein-text">
              ← Back
            </Link>
          )}
          {title && (
            <h1 className={`font-semibold text-vein-accent ${backTo ? 'mt-2' : ''} text-xl`}>
              {title}
            </h1>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <SaveIndicator />
          <Button
            variant="ghost"
            className="!min-h-8 !px-2 text-xs"
            onClick={() => {
              signOut()
              window.location.href = '/login'
            }}
          >
            Sign out
          </Button>
        </div>
      </header>
      {children}
    </div>
  )
}
