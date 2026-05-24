import type { Milestone } from '../types'

interface Props {
  milestones: Milestone[]
}

export function MilestonesSection({ milestones }: Props) {
  const total   = milestones.reduce((acc, m) => acc + m.checks.length, 0)
  const done    = milestones.reduce((acc, m) => acc + m.checks.filter(c => c.done).length, 0)
  const current = milestones.find(m => m.status === 'current')
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <section id="milestones">
      <div className="ws-sec-eyebrow">— § milestones</div>
      <h2 className="ws-sec-h2">milestones</h2>

      {/* progress bar */}
      <div className="ws-ms-progress">
        <div>
          <div className="ws-ms-progress-big"><em>{done}</em> / {total}</div>
          <div className="ws-ms-progress-label">checklist items done</div>
        </div>
        <div className="ws-ms-progress-bar">
          <div className="ws-ms-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        {current && (
          <div className="ws-ms-progress-next">
            <div className="ws-ms-progress-label">now building</div>
            <div className="ws-ms-progress-v">{current.title}</div>
          </div>
        )}
      </div>

      <div className="ws-ms-list">
        {milestones.map(ms => (
          <div key={ms.id} className={`ws-ms-card ws-ms-card--${ms.status}`}>
            <div className="ws-ms-head">
              <span className="ws-ms-num">M{ms.number}</span>
              <span className="ws-ms-title">{ms.title}</span>
              <span className="ws-ms-status">
                {ms.status === 'done' ? '✓ done' : ms.status === 'current' ? '▸ in progress' : 'upcoming'}
              </span>
            </div>
            {ms.checks.length > 0 && (
              <div className="ws-ms-checks">
                {ms.checks.map((c, i) => (
                  <label key={i} className="ws-ms-check">
                    <span className="ws-ms-check-box">{c.done ? '✓' : ''}</span>
                    <span className={c.done ? 'ws-ms-check-label ws-ms-check-label--done' : 'ws-ms-check-label'}>{c.label}</span>
                  </label>
                ))}
              </div>
            )}
            {ms.checks.length > 0 && (
              <div className="ws-ms-bar">
                <div
                  className="ws-ms-bar-fill"
                  style={{ width: `${Math.round((ms.checks.filter(c => c.done).length / ms.checks.length) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
