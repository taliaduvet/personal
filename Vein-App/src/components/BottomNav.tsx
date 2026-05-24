import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
    isActive ? 'text-vein-accent' : 'text-vein-muted'
  }`

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-vein-border bg-vein-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg">
        <NavLink to="/library" className={linkClass}>
          Library
        </NavLink>
        <NavLink to="/songs" className={linkClass}>
          Songs
        </NavLink>
      </div>
    </nav>
  )
}
