import { useNavigate } from 'react-router-dom'
import { PRODUCTS } from './products'

interface Props {
  productId: string
  onToggleDesign: () => void
  onToggleLive: () => void
  drawerTab: string | null
  savedAt: Date | null
}

export function WorkspaceTopbar({ productId, onToggleDesign, onToggleLive, drawerTab, savedAt }: Props) {
  const navigate = useNavigate()

  return (
    <header className="ws-topbar">
      <div className="ws-crumbs">
        <a href="/" className="ws-crumb-link">← hub</a>
        <span className="ws-crumb-sep">/</span>
        <span>workspace</span>
      </div>

      <nav className="ws-product-switcher" role="tablist" aria-label="Product">
        {PRODUCTS.map(p => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === productId}
            className={`ws-product-tab ws-product-tab--${p.colorClass}${p.id === productId ? ' ws-product-tab--active' : ''}`}
            onClick={() => navigate(`/workspace/${p.id}`)}
          >
            <span className="ws-tab-dot" />
            {p.name}
            <span className={`pill pill-${p.status}`}>{p.status}</span>
          </button>
        ))}
        <button className="ws-product-tab ws-product-tab--new">+ new product</button>
      </nav>

      <div className="ws-topbar-right">
        {savedAt && (
          <span key={savedAt.getTime()} className="ws-save-ind ws-save-ind--flash">saved</span>
        )}
        <button
          className={`ws-kbd-btn${drawerTab === 'design' ? ' ws-kbd-btn--active' : ''}`}
          onClick={onToggleDesign}
          title="Design files (⌘D)"
        >
          <kbd>⌘D</kbd> design
        </button>
        <button
          className={`ws-kbd-btn${drawerTab === 'live' ? ' ws-kbd-btn--active' : ''}`}
          onClick={onToggleLive}
          title="Live preview (⌘P)"
        >
          <kbd>⌘P</kbd> live
        </button>
        <span className="ws-avatar">t</span>
      </div>
    </header>
  )
}
