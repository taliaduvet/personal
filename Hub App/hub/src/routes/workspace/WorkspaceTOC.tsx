import type { Section } from './types'

interface Props {
  productId: string
  productName: string
  productStatus: string
  productVersion: string
  activeSection: Section
  onNavigate: (s: Section) => void
  inboxCount: number
  taskCount: number
  decisionCount: number
  milestoneProgress: string
}

const WORKING: { id: Section; icon: string; label: string }[] = [
  { id: 'spec',       icon: '◐', label: 'Spec & understanding' },
  { id: 'milestones', icon: '▣', label: 'Milestones'           },
  { id: 'inbox',      icon: '✉', label: 'Inbox'                },
  { id: 'sprint',     icon: '▸', label: 'Sprint'               },
  { id: 'decisions',  icon: '◆', label: 'Decisions'            },
]
const REFERENCE: { id: Section; icon: string; label: string }[] = [
  { id: 'roadmap',   icon: '→', label: 'Roadmap'         },
  { id: 'notes',     icon: '~', label: 'Notes & scratch' },
  { id: 'changelog', icon: '⌃', label: 'Changelog'       },
]

export function WorkspaceTOC({
  productName, productStatus, productVersion,
  activeSection, onNavigate,
  inboxCount, taskCount, decisionCount, milestoneProgress,
}: Props) {
  const counts: Partial<Record<Section, string>> = {
    inbox:      inboxCount  > 0 ? `${inboxCount} new` : '',
    sprint:     taskCount   > 0 ? `${taskCount}`      : '',
    decisions:  decisionCount > 0 ? `${decisionCount}` : '',
    milestones: milestoneProgress,
  }
  const urgent: Partial<Record<Section, boolean>> = { inbox: inboxCount > 0 }

  function item(s: { id: Section; icon: string; label: string }) {
    return (
      <button
        key={s.id}
        className={`ws-toc-link${activeSection === s.id ? ' ws-toc-link--active' : ''}`}
        onClick={() => onNavigate(s.id)}
      >
        <span className="ws-toc-icon">{s.icon}</span>
        {s.label}
        {counts[s.id] && (
          <span className={`ws-toc-count${urgent[s.id] ? ' ws-toc-count--urgent' : ''}`}>
            {counts[s.id]}
          </span>
        )}
      </button>
    )
  }

  return (
    <nav className="ws-toc">
      <div className="ws-toc-head">
        <div className="ws-toc-product-name">
          {productName}
          <span className={`pill pill-${productStatus}`}>{productStatus}</span>
        </div>
        <div className="ws-toc-meta">{productVersion}</div>
      </div>

      <div className="ws-toc-section-label">— working surfaces</div>
      {WORKING.map(item)}

      <div className="ws-toc-section-label">— reference</div>
      {REFERENCE.map(item)}

      <div className="ws-toc-foot">
        <div className="ws-toc-section-label" style={{ margin: 0 }}>— elsewhere</div>
        <a href="#" className="ws-toc-link">
          <span className="ws-toc-icon">↗</span>Open app
        </a>
        <a href="/" className="ws-toc-link">
          <span className="ws-toc-icon">↗</span>Open hub
        </a>
      </div>
    </nav>
  )
}
