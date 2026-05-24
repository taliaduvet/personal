import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Milestone } from '../types'

interface Props {
  milestones: Milestone[]
  productId: string
  onUpdate: (milestones: Milestone[]) => void
}

export function MilestonesSection({ milestones, productId, onUpdate }: Props) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const total   = milestones.reduce((acc, m) => acc + m.checks.length, 0)
  const done    = milestones.reduce((acc, m) => acc + m.checks.filter(c => c.done).length, 0)
  const current = milestones.find(m => m.status === 'current')
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0

  async function toggleCheck(ms: Milestone, i: number) {
    const newChecks = ms.checks.map((c, idx) => idx === i ? { ...c, done: !c.done } : c)
    await supabase.from('workspace_milestones').update({ checks: newChecks }).eq('id', ms.id)
    onUpdate(milestones.map(m => m.id === ms.id ? { ...m, checks: newChecks } : m))
  }

  async function cycleStatus(ms: Milestone) {
    const next = ms.status === 'upcoming' ? 'current' : ms.status === 'current' ? 'done' : 'upcoming'
    await supabase.from('workspace_milestones').update({ status: next }).eq('id', ms.id)
    onUpdate(milestones.map(m => m.id === ms.id ? { ...m, status: next } : m))
  }

  async function addMilestone() {
    if (!newTitle.trim()) return
    const nextNum = milestones.length > 0 ? Math.max(...milestones.map(m => m.number)) + 1 : 1
    const { data } = await supabase
      .from('workspace_milestones')
      .insert({ product_id: productId, number: nextNum, title: newTitle.trim(), status: 'upcoming', checks: [], position: milestones.length })
      .select().single()
    if (data) onUpdate([...milestones, data as Milestone])
    setNewTitle('')
    setAdding(false)
  }

  return (
    <section id="milestones">
      <div className="ws-sec-eyebrow">— § milestones</div>
      <h2 className="ws-sec-h2">milestones</h2>

      {milestones.length > 0 && (
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
      )}

      <div className="ws-ms-list">
        {milestones.map(ms => (
          <div key={ms.id} className={`ws-ms-card ws-ms-card--${ms.status}`}>
            <div className="ws-ms-head">
              <span className="ws-ms-num">M{ms.number}</span>
              <span className="ws-ms-title">{ms.title}</span>
              <button className="ws-ms-status-btn" onClick={() => cycleStatus(ms)}>
                {ms.status === 'done' ? '✓ done' : ms.status === 'current' ? '▸ in progress' : 'upcoming'}
              </button>
            </div>
            {ms.checks.length > 0 && (
              <div className="ws-ms-checks">
                {ms.checks.map((c, i) => (
                  <button key={i} className="ws-ms-check" onClick={() => toggleCheck(ms, i)}>
                    <span className="ws-ms-check-box">{c.done ? '✓' : ''}</span>
                    <span className={`ws-ms-check-label${c.done ? ' ws-ms-check-label--done' : ''}`}>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
            {ms.checks.length > 0 && (
              <div className="ws-ms-bar">
                <div className="ws-ms-bar-fill" style={{ width: `${Math.round((ms.checks.filter(c => c.done).length / ms.checks.length) * 100)}%` }} />
              </div>
            )}
          </div>
        ))}

        {adding ? (
          <div className="ws-ms-card">
            <input
              autoFocus
              className="input"
              placeholder="milestone title…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addMilestone(); if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
              style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-primary" onClick={addMilestone} style={{ fontSize: 10 }}>add</button>
              <button className="btn" onClick={() => { setAdding(false); setNewTitle('') }} style={{ fontSize: 10 }}>cancel</button>
            </div>
          </div>
        ) : (
          <button className="ws-dec-add" onClick={() => setAdding(true)}>+ add milestone</button>
        )}
      </div>
    </section>
  )
}
