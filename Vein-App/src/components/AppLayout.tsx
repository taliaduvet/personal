import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { SaveIndicator } from '@/components/SaveIndicator'
import { BottomNav } from '@/components/BottomNav'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/Button'
import { searchMemos } from '@/lib/search'
import { useVein } from '@/context/VeinContext'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm ${
    isActive ? 'bg-vein-accent/15 text-vein-accent' : 'text-vein-muted hover:text-vein-text'
  }`

export function AppLayout() {
  const { data } = useVein()
  const location = useLocation()
  const memos = data ? searchMemos(data, '') : []

  const onMemoRoute = location.pathname.startsWith('/memo/')
  const onSongRoute = location.pathname.startsWith('/song/')

  return (
    <div className="min-h-dvh bg-vein-bg md:flex">
      <aside className="hidden w-[300px] shrink-0 flex-col border-r border-vein-border md:flex">
        <div className="flex items-center justify-between border-b border-vein-border px-4 py-4">
          <span className="text-lg font-semibold text-vein-accent">Vein</span>
          <SaveIndicator />
        </div>
        <nav className="border-b border-vein-border px-2 py-2">
          <NavLink to="/library" className={navLink}>
            Library
          </NavLink>
          <NavLink to="/songs" className={navLink}>
            Songs
          </NavLink>
        </nav>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-vein-muted">
            Memos
          </p>
          {memos.map((m) => (
            <NavLink
              key={m.id}
              to={`/memo/${m.id}`}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-vein-accent/15 text-vein-accent' : 'text-vein-text hover:bg-vein-surface'}`
              }
            >
              <span className="line-clamp-1">{m.title}</span>
            </NavLink>
          ))}
        </div>
        <div className="border-t border-vein-border p-3">
          <Button
            variant="ghost"
            className="w-full !text-xs"
            onClick={() => {
              signOut()
              window.location.href = '/login'
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex items-center justify-between border-b border-vein-border px-4 py-3 md:hidden">
          <span className="text-lg font-semibold text-vein-accent">Vein</span>
          <div className="flex items-center gap-2">
            <SaveIndicator />
            <Button
              variant="ghost"
              className="!min-h-8 !px-2 !text-xs"
              onClick={() => {
                signOut()
                window.location.href = '/login'
              }}
            >
              Out
            </Button>
          </div>
        </header>

        <main
          className={`mx-auto w-full flex-1 ${
            onMemoRoute || onSongRoute ? 'max-w-3xl' : 'max-w-lg'
          } px-4 py-4 md:max-w-none md:px-8`}
        >
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
